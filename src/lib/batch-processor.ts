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
import { generateStructuredCompletion } from './openai';
import { generateCustomizationPrompt } from './essay-principles';
import { EssayCustomizationSchema, type EssayCustomization } from './schemas/essay-customization';
import { validateWordCount, generateRetryFeedback } from './essay-validation';
import prisma from './prisma';
import { cache } from './redis';
import { CacheKeys } from './cache-keys';

export type BatchProcessResult = {
  schoolName: string;
  majorName: string;
} & (
  | {
      status: 'success';
      customization: EssayCustomization;
      responseTime: number;
      retryCount: number;
    }
  | {
      status: 'error';
      error: string;
      code: 'RATE_LIMIT' | 'VALIDATION' | 'API_ERROR' | 'NOT_FOUND' | 'WORD_LIMIT' | 'UNKNOWN';
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
 * Customize essay for a single school with retry logic for word limit enforcement
 *
 * @param essay - Original essay content
 * @param schoolName - Target school name
 * @param majorName - Target major
 * @param schoolInfo - School program information
 * @param wordLimit - Optional word limit to enforce
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @returns Customization result with metadata
 */
async function customizeWithRetry(
  essay: string,
  schoolName: string,
  majorName: string,
  schoolInfo: { programDescription: string; keyFeatures: string[]; keywords: string[] },
  wordLimit?: number,
  maxRetries: number = 2
): Promise<{ customization: EssayCustomization; retryCount: number }> {
  let prompt = generateCustomizationPrompt(essay, schoolName, majorName, schoolInfo);

  // Add word limit enforcement to prompt
  if (wordLimit) {
    const currentWordCount = essay.trim().split(/\s+/).filter(Boolean).length;
    prompt += `\n\n**CRITICAL WORD LIMIT**: The customized essay MUST NOT exceed ${wordLimit} words.

Current essay: ${currentWordCount} words
Target: ${wordLimit} words maximum

Count each word carefully. If approaching the limit, prioritize the most important customizations and remove less critical details.

Report the exact word count and whether you met the limit in your response.`;
  }

  // Add voice preservation guidelines
  prompt += `\n\n**CRITICAL: Maintain Human Voice**

Avoid these AI writing clichés:
❌ Excessive em dashes (—)
❌ "It's Not About X, It's About Y" formula
❌ Excessive tricolon (groups of three)
❌ Wikipedia voice (encyclopedic tone)
❌ "tapestry", "landscape", "In today's world" metaphors
❌ Enthusiasm overload
❌ Setup-payoff rhetorical questions

✅ DO:
- Natural, conversational rhythm
- Varied sentence structures
- Authentic student voice
- Specific and concrete details
- Simple, direct language

Rate your voice preservation (1-10) and AI cliché avoidance (1-10).
List any AI patterns you detected in your own writing.`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await generateStructuredCompletion(
      prompt,
      EssayCustomizationSchema,
      'essay_customization',
      {
        model: 'gpt-4o-2024-08-06',
        maxTokens: 4000,
        temperature: 0.7,
        systemMessage: "You are an expert at tailoring college essays to specific programs while maintaining the student's authentic voice.",
      }
    );

    // If no word limit or model reports meeting it, validate and return
    if (!wordLimit || result.meetsWordLimit) {
      const validation = validateWordCount(result.customizedEssay, wordLimit || Infinity);
      if (validation.valid) {
        return { customization: result, retryCount: attempt };
      }
    }

    // If we have retries left, add feedback
    if (attempt < maxRetries && wordLimit) {
      const validation = validateWordCount(result.customizedEssay, wordLimit);
      if (!validation.valid) {
        prompt += '\n\n' + generateRetryFeedback(validation);
      }
    }
  }

  // Final attempt failed, throw error
  throw new Error(`Failed to meet word limit after ${maxRetries} retries`);
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
  // 1. Fetch all school data in parallel with caching
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

        if (data) {
          // Cache for 1 hour
          await cache.set(cacheKey, data, 3600);
        }
      }

      return { ...school, data };
    })
  );

  // 2. Separate schools with data from those without
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

  // 3. Process customizations with rate limiting
  const limiter = new RateLimiter(3, 200); // 3 concurrent, 200ms delay

  const customizationResults = await Promise.allSettled(
    schoolsWithData.map((school) =>
      limiter.add(async () => {
        const startTime = Date.now();

        const result = await customizeWithRetry(
          essay,
          school.schoolName,
          school.majorName,
          {
            programDescription: school.data.programDescription,
            keyFeatures: school.data.keyFeatures,
            keywords: school.data.keywords,
          },
          undefined, // wordLimit - can be passed from API
          2 // maxRetries
        );

        const responseTime = Date.now() - startTime;

        return {
          schoolName: school.schoolName,
          majorName: school.majorName,
          customization: result.customization,
          responseTime,
          retryCount: result.retryCount,
        };
      })
    )
  );

  // 4. Map results to typed responses
  const successfulResults: BatchProcessResult[] = [];
  const failedResults: BatchProcessResult[] = [];

  customizationResults.forEach((result, index) => {
    const school = schoolsWithData[index];

    if (result.status === 'fulfilled') {
      successfulResults.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'success',
        customization: result.value.customization,
        responseTime: result.value.responseTime,
        retryCount: result.value.retryCount,
      });
    } else {
      const error = result.reason;
      const isRateLimit = error?.status === 429 || error?.code === 'rate_limit_exceeded';
      const isApiError = error?.status >= 500;
      const isWordLimit = error?.message?.includes('word limit');

      failedResults.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'error',
        error: error?.message || 'Unknown error occurred',
        code: isRateLimit ? 'RATE_LIMIT' : isApiError ? 'API_ERROR' : isWordLimit ? 'WORD_LIMIT' : 'UNKNOWN',
        retryable: isRateLimit || isApiError,
      });
    }
  });

  // 5. Save successful customizations to database
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

        // Save customizations with metadata
        await tx.customization.createMany({
          data: successfulResults.map((result) => ({
            userId,
            draftId: '', // Will be set by the API route
            schoolName: result.schoolName,
            majorName: result.majorName,
            originalEssay: essay,
            customizedEssay: result.customization.customizedEssay,
            metadata: result.customization as any, // Full structured response
            wordCount: result.customization.wordCount,
            meetsWordLimit: result.customization.meetsWordLimit,
            voicePreservationScore: result.customization.voicePreservationScore,
            aiClicheAvoidanceScore: result.customization.aiClicheAvoidanceScore,
            alignmentScore: result.customization.alignmentScore,
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

  // 6. Combine all results in original order
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
