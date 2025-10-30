/**
 * Smart School Context Matching
 * Fetches relevant school information based on essay topics
 */

import prisma from './prisma';
import { generateCompletion } from './openai';
import type {
  EssayTopics,
  CustomizationContext,
  CampusLifeInfo,
  SchoolCulture,
} from '@/types/school-data';
import { categorizeActivities } from './topic-extraction';

/**
 * Build customization context based on essay topics
 * Intelligently selects school information relevant to the essay content
 */
export async function buildCustomizationContext(
  schoolName: string,
  majorName: string,
  topics: EssayTopics
): Promise<CustomizationContext> {
  // Fetch school data from database
  const schoolData = await prisma.schoolMajorData.findUnique({
    where: {
      schoolName_majorName: {
        schoolName,
        majorName,
      },
    },
  });

  // If no data found, try to auto-fetch
  if (!schoolData) {
    console.log(`[CONTEXT] No data found for ${schoolName} - ${majorName}, auto-fetching...`);
    const fetchedData = await autoFetchSchoolData(schoolName, majorName, topics);
    if (fetchedData) {
      return buildContextFromFetchedData(schoolName, majorName, fetchedData, topics);
    }
  }

  const context: CustomizationContext = {
    schoolName,
    majorName,
    cultureHighlights: [],
  };

  // Parse JSON fields
  const campusLife = schoolData?.campusLife as CampusLifeInfo | null;
  const culture = schoolData?.culture as SchoolCulture | null;

  // Determine essay type and build appropriate context
  const isAcademicFocused = topics.tone === 'academic' ||
    topics.interests.some(i =>
      ['research', 'science', 'engineering', 'mathematics', 'computer science'].includes(i.toLowerCase())
    );

  // Always include academic context for academic essays or when no activities mentioned
  if (isAcademicFocused || topics.activities.length === 0) {
    context.academicContext = {
      programDescription: schoolData?.programDescription || '',
      keyFeatures: schoolData?.keyFeatures || [],
      facultyHighlights: schoolData?.facultyHighlights || [],
      researchOpportunities: schoolData?.researchOpportunities || [],
    };
  }

  // Add activity-based context if essay mentions specific activities
  if (topics.activities.length > 0 && campusLife) {
    const categorized = categorizeActivities(topics.activities);
    const activityContext: Record<string, string[]> = {};

    // Match sports activities
    if (categorized.sports.length > 0 && campusLife.athletics) {
      categorized.sports.forEach((sport) => {
        const matches: string[] = [];

        // Check varsity sports
        if (campusLife.athletics.varsity) {
          const varsityMatches = campusLife.athletics.varsity.filter((v) =>
            v.toLowerCase().includes(sport.toLowerCase())
          );
          matches.push(...varsityMatches.map(v => `Varsity ${v}`));
        }

        // Check intramural sports
        if (campusLife.athletics.intramural) {
          const intramuralMatches = campusLife.athletics.intramural.filter((i) =>
            i.toLowerCase().includes(sport.toLowerCase())
          );
          matches.push(...intramuralMatches.map(i => `Intramural ${i}`));
        }

        // Check facilities
        if (campusLife.athletics.facilities) {
          const facilityMatches = campusLife.athletics.facilities.filter((f) =>
            f.toLowerCase().includes(sport.toLowerCase())
          );
          matches.push(...facilityMatches);
        }

        if (matches.length > 0) {
          activityContext[sport] = matches;
        }
      });
    }

    // Match arts activities
    if (categorized.arts.length > 0 && campusLife.arts) {
      categorized.arts.forEach((art) => {
        const matches: string[] = [];

        // Check music programs
        if (art.includes('music') || art.includes('piano') || art.includes('violin') || art.includes('guitar')) {
          if (campusLife.arts.music) {
            matches.push(...(campusLife.arts.music.ensembles || []));
            matches.push(...(campusLife.arts.music.venues || []));
            matches.push(...(campusLife.arts.music.opportunities || []));
          }
        }

        // Check theater programs
        if (art.includes('theater') || art.includes('drama') || art.includes('acting')) {
          if (campusLife.arts.theater) {
            matches.push(...(campusLife.arts.theater.programs || []));
            matches.push(...(campusLife.arts.theater.productions || []));
          }
        }

        // Check visual arts
        if (art.includes('art') || art.includes('painting') || art.includes('drawing') || art.includes('photography')) {
          if (campusLife.arts.visual) {
            matches.push(...(campusLife.arts.visual.programs || []));
            matches.push(...(campusLife.arts.visual.galleries || []));
          }
        }

        // Check dance
        if (art.includes('dance') || art.includes('ballet')) {
          if (campusLife.arts.dance) {
            matches.push(...(campusLife.arts.dance.programs || []));
            matches.push(...(campusLife.arts.dance.companies || []));
          }
        }

        if (matches.length > 0) {
          activityContext[art] = matches;
        }
      });
    }

    // Match club activities
    if (categorized.clubs.length > 0 && campusLife.clubs) {
      categorized.clubs.forEach((club) => {
        const matches: string[] = [];

        campusLife.clubs.forEach((category) => {
          const clubMatches = category.clubs.filter((c) =>
            c.toLowerCase().includes(club.toLowerCase()) ||
            club.toLowerCase().includes(c.toLowerCase())
          );
          matches.push(...clubMatches);
        });

        if (matches.length > 0) {
          activityContext[club] = matches;
        }
      });
    }

    if (Object.keys(activityContext).length > 0) {
      context.activityContext = activityContext;
    }
  }

  // Add values-based context for reflective/personal essays
  if (topics.tone === 'personal' || topics.tone === 'reflective') {
    if (campusLife || culture) {
      context.valuesContext = {
        traditions: campusLife?.traditions || [],
        communityAspects: culture?.distinctiveFeatures || [],
        leadershipOpportunities: campusLife?.leadershipOpportunities || [],
      };
    }
  }

  // Always add culture highlights
  if (culture) {
    context.cultureHighlights = [
      ...(culture.values || []),
      ...(culture.distinctiveFeatures || []),
    ].slice(0, 5); // Limit to top 5
  }

  return context;
}

/**
 * Auto-fetch school data when not found in database
 * Uses AI to gather comprehensive information about school programs and campus life
 */
async function autoFetchSchoolData(
  schoolName: string,
  majorName: string,
  topics: EssayTopics
): Promise<any> {
  console.log(`[AUTO-FETCH] Fetching data for ${schoolName} - ${majorName}`);

  const categorized = categorizeActivities(topics.activities);
  const relevantActivities = [
    ...categorized.sports,
    ...categorized.arts,
    ...categorized.clubs,
  ].slice(0, 5); // Focus on top 5 activities

  const prompt = `You are a college admissions expert with comprehensive knowledge of US universities. Provide detailed information about ${schoolName}'s ${majorName} program AND relevant campus life activities.

IMPORTANT: Include information about these specific student activities/interests: ${relevantActivities.join(', ')}

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "programDescription": "<2-3 detailed paragraphs about the ${majorName} program>",
  "keyFeatures": ["<unique feature 1>", "<unique feature 2>", "<unique feature 3>"],
  "facultyHighlights": ["<notable professor 1>", "<notable professor 2>"],
  "researchOpportunities": ["<opportunity 1>", "<opportunity 2>"],
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "campusLife": {
    "athletics": {
      "varsity": ["<sport1>", "<sport2>"],
      "intramural": ["<sport1>", "<sport2>"],
      "facilities": ["<facility1>", "<facility2>"]
    },
    "arts": {
      "music": {
        "ensembles": ["<ensemble1>", "<ensemble2>"],
        "venues": ["<venue1>"],
        "opportunities": ["<opportunity1>"]
      },
      "theater": {
        "programs": ["<program1>"],
        "productions": ["<production1>"]
      },
      "visual": {
        "programs": ["<program1>"],
        "galleries": ["<gallery1>"]
      },
      "dance": {
        "programs": ["<program1>"],
        "companies": ["<company1>"]
      }
    },
    "clubs": [
      {
        "name": "<category name>",
        "clubs": ["<club1>", "<club2>"],
        "highlights": ["<highlight1>"]
      }
    ],
    "traditions": ["<tradition1>", "<tradition2>"],
    "leadershipOpportunities": ["<opportunity1>", "<opportunity2>"]
  },
  "culture": {
    "values": ["<value1>", "<value2>", "<value3>"],
    "motto": "<school motto if famous>",
    "distinctiveFeatures": ["<feature1>", "<feature2>"],
    "studentBody": {
      "atmosphere": ["<atmosphere1>", "<atmosphere2>"]
    }
  }
}

Be specific and accurate. Focus on information relevant to the student's interests: ${relevantActivities.join(', ')}`;

  try {
    const response = await generateCompletion(prompt, {
      model: 'gpt-4-turbo-preview',
      maxTokens: 2000,
      temperature: 0.3,
    });

    const data = JSON.parse(response);

    // Save to database for future use
    await prisma.schoolMajorData.create({
      data: {
        schoolName,
        majorName,
        programDescription: data.programDescription,
        keyFeatures: data.keyFeatures,
        facultyHighlights: data.facultyHighlights || [],
        researchOpportunities: data.researchOpportunities || [],
        keywords: data.keywords,
        campusLife: data.campusLife,
        culture: data.culture,
        lastUpdated: new Date(),
        freshness: true,
      },
    });

    console.log(`[AUTO-FETCH] Successfully fetched and saved data for ${schoolName}`);
    return data;
  } catch (error) {
    console.error(`[AUTO-FETCH] Error fetching school data:`, error);
    return null;
  }
}

/**
 * Build context from freshly fetched data
 */
function buildContextFromFetchedData(
  schoolName: string,
  majorName: string,
  data: any,
  topics: EssayTopics
): CustomizationContext {
  const context: CustomizationContext = {
    schoolName,
    majorName,
    cultureHighlights: data.culture?.values || [],
  };

  // Add academic context if appropriate
  const isAcademicFocused = topics.tone === 'academic' || topics.activities.length === 0;
  if (isAcademicFocused) {
    context.academicContext = {
      programDescription: data.programDescription,
      keyFeatures: data.keyFeatures,
      facultyHighlights: data.facultyHighlights || [],
      researchOpportunities: data.researchOpportunities || [],
    };
  }

  // Add activity context
  if (topics.activities.length > 0 && data.campusLife) {
    const categorized = categorizeActivities(topics.activities);
    const activityContext: Record<string, string[]> = {};

    // Build activity matches from fetched data
    categorized.sports.forEach((sport) => {
      const matches: string[] = [];
      if (data.campusLife.athletics?.varsity) {
        matches.push(...data.campusLife.athletics.varsity.filter((v: string) =>
          v.toLowerCase().includes(sport.toLowerCase())
        ));
      }
      if (matches.length > 0) activityContext[sport] = matches;
    });

    if (Object.keys(activityContext).length > 0) {
      context.activityContext = activityContext;
    }
  }

  return context;
}
