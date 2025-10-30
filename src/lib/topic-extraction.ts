/**
 * Topic Extraction for Essay Customization
 * Analyzes essay content to identify activities, values, interests, and themes
 * Used to match essays with relevant school context (clubs, activities, culture)
 */

import { generateCompletion } from './openai';
import type { EssayTopics } from '@/types/school-data';

/**
 * Extract topics and themes from an essay using AI analysis
 */
export async function extractEssayTopics(essay: string): Promise<EssayTopics> {
  const prompt = `You are an expert at analyzing college application essays. Extract key topics, activities, values, interests, and themes from the following essay.

ESSAY:
${essay}

Analyze this essay and identify:
1. **Activities**: Specific activities mentioned (sports, hobbies, clubs, instruments, etc.)
   - Examples: "chess", "basketball", "violin", "debate", "robotics", "painting"
2. **Values**: Core values demonstrated by the student
   - Examples: "leadership", "community service", "perseverance", "creativity", "curiosity"
3. **Interests**: Academic or personal interests beyond activities
   - Examples: "computer science", "social justice", "environmental issues", "literature"
4. **Themes**: Broader narrative themes in the essay
   - Examples: "identity", "cultural heritage", "overcoming adversity", "personal growth", "family"
5. **Tone**: Overall tone of the essay

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "activities": ["<activity1>", "<activity2>", ...],
  "values": ["<value1>", "<value2>", ...],
  "interests": ["<interest1>", "<interest2>", ...],
  "themes": ["<theme1>", "<theme2>", ...],
  "tone": "<personal|academic|reflective|narrative>"
}

IMPORTANT:
- Be specific with activities (e.g., "chess" not "board games", "violin" not "music")
- Identify 3-7 items per category
- Only include topics that are clearly present in the essay
- Use lowercase for all terms
- Return ONLY the JSON object, no additional text`;

  try {
    const response = await generateCompletion(prompt, {
      model: 'gpt-4-turbo-preview',
      maxTokens: 500,
      temperature: 0.2,
    });

    const topics = JSON.parse(response);

    // Validate the response structure
    if (
      !topics.activities ||
      !topics.values ||
      !topics.interests ||
      !topics.themes ||
      !topics.tone
    ) {
      console.error('Invalid topic extraction response:', topics);
      return getDefaultTopics();
    }

    return topics;
  } catch (error) {
    console.error('Error extracting essay topics:', error);
    return getDefaultTopics();
  }
}

/**
 * Default topics structure for fallback
 */
function getDefaultTopics(): EssayTopics {
  return {
    activities: [],
    values: [],
    interests: [],
    themes: [],
    tone: 'personal',
  };
}

/**
 * Check if essay is primarily academic-focused
 */
export function isAcademicEssay(topics: EssayTopics): boolean {
  const academicKeywords = [
    'research',
    'laboratory',
    'experiment',
    'study',
    'academic',
    'science',
    'engineering',
    'mathematics',
    'computer science',
    'physics',
    'chemistry',
    'biology',
  ];

  const hasAcademicActivities = topics.activities.some((activity) =>
    academicKeywords.some((keyword) => activity.toLowerCase().includes(keyword))
  );

  const hasAcademicInterests = topics.interests.some((interest) =>
    academicKeywords.some((keyword) => interest.toLowerCase().includes(keyword))
  );

  return hasAcademicActivities || hasAcademicInterests || topics.tone === 'academic';
}

/**
 * Check if essay is primarily personal/extracurricular-focused
 */
export function isPersonalEssay(topics: EssayTopics): boolean {
  return !isAcademicEssay(topics) && topics.tone === 'personal';
}

/**
 * Get activity categories for database lookup
 */
export function categorizeActivities(activities: string[]): {
  sports: string[];
  arts: string[];
  clubs: string[];
  other: string[];
} {
  const sportsKeywords = [
    'basketball',
    'soccer',
    'football',
    'tennis',
    'swimming',
    'track',
    'volleyball',
    'baseball',
    'softball',
    'lacrosse',
    'hockey',
    'golf',
    'wrestling',
    'gymnastics',
    'running',
  ];

  const artsKeywords = [
    'music',
    'piano',
    'violin',
    'guitar',
    'drums',
    'singing',
    'choir',
    'orchestra',
    'band',
    'theater',
    'drama',
    'acting',
    'dance',
    'ballet',
    'painting',
    'drawing',
    'art',
    'photography',
  ];

  const clubKeywords = [
    'debate',
    'chess',
    'robotics',
    'coding',
    'math team',
    'science olympiad',
    'model un',
    'student government',
    'journalism',
    'yearbook',
    'volunteer',
    'community service',
  ];

  return {
    sports: activities.filter((a) =>
      sportsKeywords.some((keyword) => a.toLowerCase().includes(keyword))
    ),
    arts: activities.filter((a) =>
      artsKeywords.some((keyword) => a.toLowerCase().includes(keyword))
    ),
    clubs: activities.filter((a) =>
      clubKeywords.some((keyword) => a.toLowerCase().includes(keyword))
    ),
    other: activities.filter(
      (a) =>
        !sportsKeywords.some((keyword) => a.toLowerCase().includes(keyword)) &&
        !artsKeywords.some((keyword) => a.toLowerCase().includes(keyword)) &&
        !clubKeywords.some((keyword) => a.toLowerCase().includes(keyword))
    ),
  };
}
