/**
 * Batch Processing for School Customizations
 *
 * Handles parallel processing of multiple school customizations with:
 * - Rate limiting for API compliance
 * - Graceful error handling with partial failures
 * - Usage tracking and quota enforcement
 * - Caching for school data
 */

import { RateLimiter } from './rate-limiter';
import { generateCompletion } from './openai';
import { generateTopicAwareCustomizationPrompt } from './essay-principles';
import { extractEssayTopics } from './topic-extraction';
import { buildCustomizationContext } from './school-context-matcher';
import prisma from './prisma';
import { cache } from './redis';
import { CacheKeys } from './cache-keys';
import { guardAgainstInjection } from './security/prompt-injection-guard';

export type BatchProcessResult = {
  schoolName: string;
  majorName: string;
} & (
  | {
      status: 'success';
      customizedEssay: string;
      responseTime: number;
      wordCount: number;
      metadata?: {
        changesSummary: Array<{
          location: string;
          change: string;
          reason: string;
        }>;
        integrationNotes: string;
        changeCount: number;
        preservationPercentage: number;
      };
    }
  | {
      status: 'error';
      error: string;
      code: 'RATE_LIMIT' | 'VALIDATION' | 'API_ERROR' | 'NOT_FOUND' | 'UNKNOWN';
      retryable: boolean;
    }
);

interface SchoolWithData {
  schoolName: string;
  majorName: string;
  data: {
    programDescription: string;
    keyFeatures: string[];
    keywords: string[];
  };
}

/**
 * Process batch customizations for multiple schools
 *
 * @param userId - User ID for tracking and permissions
 * @param essay - Original essay content
 * @param schools - Array of school/major combinations
 * @returns Array of results (success or error for each school)
 */
export async function processBatchCustomizations(
  userId: string,
  essay: string,
  schools: Array<{ schoolName: string; majorName: string }>
): Promise<BatchProcessResult[]> {
  // 1. Check essay for prompt injection
  console.log('[BATCH] Checking essay for prompt injection...');
  const essayGuard = guardAgainstInjection(essay, {
    userId,
    endpoint: '/batch/customize',
    maxLength: 15000,
    autoSanitize: true,
    blockOnSeverity: 'critical',
  });

  if (!essayGuard.allowed) {
    // Return error for all schools
    return schools.map(school => ({
      schoolName: school.schoolName,
      majorName: school.majorName,
      status: 'error',
      error: `Content security check failed: ${essayGuard.reason}`,
      code: 'VALIDATION',
      retryable: false,
    }));
  }

  const safeEssay = essayGuard.sanitizedContent || essay;

  // 2. Extract essay topics first (used for smart context matching)
  console.log('[BATCH] Extracting essay topics...');
  const essayTopics = await extractEssayTopics(safeEssay);
  console.log('[BATCH] Essay topics:', essayTopics);

  // 3. Fetch all school data in parallel with caching and auto-fetch
  const schoolDataResults = await Promise.allSettled(
    schools.map(async (school) => {
      const cacheKey = CacheKeys.school.data(school.schoolName, school.majorName);
      let data = await cache.get<any>(cacheKey);

      if (!data) {
        data = await prisma.schoolMajorData.findUnique({
          where: {
            schoolName_majorName: {
              schoolName: school.schoolName,
              majorName: school.majorName,
            },
          },
        });

        // If not found in database, attempt to fetch it
        if (!data) {
          console.log(`[BATCH] School data not found for ${school.schoolName} - ${school.majorName}, attempting to fetch...`);

          try {
            // Use AI to generate school/major data
            const fetchPrompt = `You are a college admissions expert. Provide detailed information about ${school.schoolName}'s ${school.majorName} program.

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "programDescription": "<2-3 paragraph description of the program>",
  "keyFeatures": ["<feature 1>", "<feature 2>", "<feature 3>", "<feature 4>", "<feature 5>"],
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"]
}

Include specific details about:
- What makes this program unique or distinctive
- Notable faculty, research opportunities, or facilities
- Core curriculum or specialized tracks
- Career outcomes and opportunities
- Program philosophy and values`;

            const response = await generateCompletion(fetchPrompt, {
              model: 'gpt-4-turbo-preview',
              maxTokens: 1500,
              temperature: 0.3,
              systemMessage: 'You are a college admissions research expert. Provide accurate, specific information about university programs.',
            });

            // Parse the JSON response
            const schoolInfo = JSON.parse(response);

            // Save to database
            data = await prisma.schoolMajorData.create({
              data: {
                schoolName: school.schoolName,
                majorName: school.majorName,
                programDescription: schoolInfo.programDescription,
                keyFeatures: schoolInfo.keyFeatures,
                keywords: schoolInfo.keywords,
                sourceUrl: null, // Auto-generated, no source URL
                freshness: true,
              },
            });

            console.log(`[BATCH] Successfully fetched and saved data for ${school.schoolName} - ${school.majorName}`);
          } catch (error) {
            console.error(`[BATCH] Failed to auto-fetch school data for ${school.schoolName} - ${school.majorName}:`, error);
            // Data will remain null, will be handled below
          }
        }

        if (data) {
          // Cache for 1 hour
          await cache.set(cacheKey, data, 3600);
        }
      }

      return { ...school, data };
    })
  );

  // 4. Separate schools with data from those without
  const schoolsWithData: SchoolWithData[] = [];
  const schoolsWithoutData: BatchProcessResult[] = [];

  schoolDataResults.forEach((result, index) => {
    const school = schools[index];

    if (result.status === 'fulfilled' && result.value.data) {
      schoolsWithData.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        data: result.value.data,
      });
    } else {
      schoolsWithoutData.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'error',
        error: 'School data not found in database',
        code: 'NOT_FOUND',
        retryable: false,
      });
    }
  });

  // 5. Process customizations with rate limiting and topic-aware context
  const limiter = new RateLimiter(3, 200); // 3 concurrent, 200ms delay

  const customizationResults = await Promise.allSettled(
    schoolsWithData.map((school) =>
      limiter.add(async () => {
        // Build topic-aware customization context
        console.log(`[BATCH] Building context for ${school.schoolName} - ${school.majorName}`);
        const context = await buildCustomizationContext(
          school.schoolName,
          school.majorName,
          essayTopics
        );

        console.log(`[BATCH] Context built:`, {
          hasAcademic: !!context.academicContext,
          hasActivity: !!context.activityContext,
          hasValues: !!context.valuesContext,
          cultureHighlightsCount: context.cultureHighlights.length,
        });

        // Generate topic-aware customization prompt
        const prompt = generateTopicAwareCustomizationPrompt(
          essay,
          school.schoolName,
          school.majorName,
          context
        );

        const startTime = Date.now();

        const response = await generateCompletion(prompt, {
          model: 'gpt-4-turbo-preview',
          maxTokens: 2500,
          temperature: 0.6,
          systemMessage:
            "You are an expert at tailoring college essays to specific programs while maintaining the student's authentic voice. Match essay topics to relevant school context.",
        });

        const responseTime = Date.now() - startTime;

        // Parse JSON response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(response);
        } catch (error) {
          console.error('[BATCH] Failed to parse JSON response, using fallback:', error);
          // Fallback to treating entire response as customized essay
          parsedResponse = {
            customizedEssay: response,
            changesSummary: [],
            integrationNotes: 'AI response was not in expected JSON format.',
            changeCount: 0,
            preservationPercentage: 100,
          };
        }

        const customizedEssay = parsedResponse.customizedEssay;
        const wordCount = customizedEssay.trim().split(/\s+/).filter(Boolean).length;

        return {
          schoolName: school.schoolName,
          majorName: school.majorName,
          customizedEssay,
          responseTime,
          wordCount,
          metadata: {
            changesSummary: parsedResponse.changesSummary || [],
            integrationNotes: parsedResponse.integrationNotes || '',
            changeCount: parsedResponse.changeCount || 0,
            preservationPercentage: parsedResponse.preservationPercentage || 100,
          },
        };
      })
    )
  );

  // 6. Map results to typed responses
  const successfulResults: BatchProcessResult[] = [];
  const failedResults: BatchProcessResult[] = [];

  customizationResults.forEach((result, index) => {
    const school = schoolsWithData[index];

    if (result.status === 'fulfilled') {
      successfulResults.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'success',
        customizedEssay: result.value.customizedEssay,
        responseTime: result.value.responseTime,
        wordCount: result.value.wordCount,
        metadata: result.value.metadata,
      });
    } else {
      const error = result.reason;
      const isRateLimit = error?.status === 429 || error?.code === 'rate_limit_exceeded';
      const isApiError = error?.status >= 500;

      failedResults.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'error',
        error: error?.message || 'Unknown error occurred',
        code: isRateLimit ? 'RATE_LIMIT' : isApiError ? 'API_ERROR' : 'UNKNOWN',
        retryable: isRateLimit || isApiError,
      });
    }
  });

  // 7. Save successful customizations to database
  if (successfulResults.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update usage tracking
        await tx.usageTracking.updateMany({
          where: {
            userId,
            periodEnd: { gte: new Date() },
          },
          data: {
            customizationsCount: { increment: successfulResults.length },
          },
        });

        // Save customizations
        await tx.customization.createMany({
          data: successfulResults.map((result) => ({
            userId,
            draftId: '', // Will be set by the API route
            schoolName: result.schoolName,
            majorName: result.majorName,
            originalEssay: safeEssay,
            customizedEssay: result.customizedEssay,
            responseTime: result.responseTime,
          })),
          skipDuplicates: true,
        });
      });
    } catch (error) {
      console.error('Failed to save customizations to database:', error);
      // Don't fail the entire batch, just log the error
    }
  }

  // 8. Combine all results in original order
  return [...schoolsWithoutData, ...successfulResults, ...failedResults];
}

/**
 * Check if user can perform batch customization based on tier limits
 *
 * @param userId - User ID to check
 * @param schoolCount - Number of schools to customize for
 * @returns Object with allowed status and details
 */
export async function checkBatchCustomizationQuota(
  userId: string,
  schoolCount: number
): Promise<{
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  tier?: string;
}> {
  // Get subscription info
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const tier = subscription?.tier || 'FREE';

  // Get current usage
  const usage = await prisma.usageTracking.findFirst({
    where: {
      userId,
      periodEnd: { gte: new Date() },
    },
  });

  // Define tier limits
  const tierLimits = {
    FREE: {
      customizationsPerMonth: 1,
      maxSchoolsPerBatch: 2,
    },
    PLUS: {
      customizationsPerMonth: 10,
      maxSchoolsPerBatch: 5,
    },
    PRO: {
      customizationsPerMonth: Infinity,
      maxSchoolsPerBatch: 10,
    },
  };

  const limits = tierLimits[tier];
  const currentUsage = usage?.customizationsCount || 0;

  // Check monthly limit
  if (currentUsage + schoolCount > limits.customizationsPerMonth) {
    return {
      allowed: false,
      reason: `Would exceed ${tier} tier monthly limit of ${limits.customizationsPerMonth} customizations`,
      currentUsage,
      limit: limits.customizationsPerMonth,
      tier,
    };
  }

  // Check batch size limit
  if (schoolCount > limits.maxSchoolsPerBatch) {
    return {
      allowed: false,
      reason: `${tier} tier allows maximum ${limits.maxSchoolsPerBatch} schools per batch`,
      currentUsage,
      limit: limits.maxSchoolsPerBatch,
      tier,
    };
  }

  return {
    allowed: true,
    currentUsage,
    limit: limits.customizationsPerMonth,
    tier,
  };
}
