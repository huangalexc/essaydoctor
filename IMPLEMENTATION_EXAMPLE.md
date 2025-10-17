# Implementation Example: Structured Outputs Migration

This document provides complete, copy-paste-ready code for migrating the batch customization feature to use OpenAI's Structured Outputs with Zod validation.

---

## File 1: Schema Definition

**Create:** `/src/lib/schemas/essay-customization.ts`

```typescript
import { z } from 'zod';

/**
 * Schema for AI-generated essay customization results
 * Ensures 100% schema compliance with OpenAI Structured Outputs
 */
export const CustomizationResultSchema = z.object({
  customizedEssay: z
    .string()
    .describe(
      'The fully customized essay text, maintaining the student\'s authentic voice while aligning with the program'
    ),

  wordCount: z
    .number()
    .int()
    .positive()
    .describe('Exact number of words in the customized essay'),

  meetsWordLimit: z
    .boolean()
    .describe('True if the essay is between 600-650 words, false otherwise'),

  keyChanges: z
    .array(
      z.object({
        category: z.enum([
          'program_alignment',
          'voice_enhancement',
          'structural_improvement',
          'detail_addition',
          'conciseness',
        ]),
        description: z.string(),
      })
    )
    .min(3)
    .max(5)
    .describe('List of 3-5 major customizations made to align with the program'),

  alignmentScore: z
    .number()
    .min(0)
    .max(100)
    .int()
    .describe(
      'Confidence score (0-100) indicating how well the essay aligns with the program requirements'
    ),

  voicePreservationScore: z
    .number()
    .min(0)
    .max(100)
    .int()
    .describe(
      'Score (0-100) indicating how well the original student voice was preserved'
    ),

  suggestedNextSteps: z
    .array(z.string())
    .max(3)
    .optional()
    .describe('Optional suggestions for further refinement (max 3)'),
});

/**
 * TypeScript type automatically inferred from schema
 * Use this type throughout your application
 */
export type CustomizationResult = z.infer<typeof CustomizationResultSchema>;

/**
 * Simplified schema for basic customization (backward compatibility)
 */
export const SimpleCustomizationSchema = z.object({
  customizedEssay: z.string(),
  wordCount: z.number(),
  meetsWordLimit: z.boolean(),
});

export type SimpleCustomization = z.infer<typeof SimpleCustomizationSchema>;
```

---

## File 2: Updated OpenAI Helper

**Update:** `/src/lib/openai.ts`

Add this new function while keeping your existing ones:

```typescript
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// ... existing imports and code ...

/**
 * Generate structured completion using Zod schema validation
 * Ensures 100% schema compliance with OpenAI's Structured Outputs
 *
 * @template T - Zod schema type
 * @param prompt - User prompt for the completion
 * @param schema - Zod schema defining the response structure
 * @param schemaName - Unique name for the schema (used by OpenAI)
 * @param options - Optional configuration (model, tokens, temperature, etc.)
 * @returns Parsed and validated response conforming to schema
 *
 * @example
 * const result = await generateStructuredCompletion(
 *   prompt,
 *   CustomizationResultSchema,
 *   'essay_customization',
 *   { temperature: 0.6 }
 * );
 */
export async function generateStructuredCompletion<T extends z.ZodType>(
  prompt: string,
  schema: T,
  schemaName: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }
): Promise<z.infer<T>> {
  const {
    model = 'gpt-4o-2024-08-06', // Required for structured outputs
    maxTokens = 3000,
    temperature = 0.6,
    systemMessage = 'You are a helpful assistant specialized in college essay editing.',
  } = options || {};

  try {
    const completion = await openai.beta.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
      response_format: zodResponseFormat(schema, schemaName),
    });

    // Check for model refusal (safety/policy violations)
    const message = completion.choices[0].message;
    if (message.refusal) {
      console.error('Model refusal:', message.refusal);
      throw new Error(`Content policy violation: ${message.refusal}`);
    }

    // Check if response was truncated
    if (completion.choices[0].finish_reason === 'length') {
      console.warn('Response truncated due to token limit');
      throw new Error('Response exceeded maximum token limit - try reducing essay length');
    }

    // The SDK automatically parses and validates against the schema
    if (!message.parsed) {
      throw new Error('Failed to parse structured response');
    }

    return message.parsed as z.infer<T>;

  } catch (error: any) {
    // Detailed error handling for different failure modes
    if (error.type === 'invalid_request_error') {
      console.error('Invalid schema error:', error.message);
      throw new Error(`Schema validation failed: ${error.message}`);
    }

    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] || '60';
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }

    if (error.status === 503) {
      throw new Error('OpenAI service temporarily unavailable');
    }

    // Re-throw if already our custom error
    if (error.message.includes('Content policy') || error.message.includes('token limit')) {
      throw error;
    }

    console.error('OpenAI structured completion error:', error);
    throw new Error('Failed to generate structured AI response');
  }
}

// ... keep all existing functions (generateCompletion, etc.) ...
```

---

## File 3: Word Count Validation Utility

**Create:** `/src/lib/essay-validation.ts`

```typescript
import { CustomizationResult } from './schemas/essay-customization';

export interface WordCountValidation {
  valid: boolean;
  actualCount: number;
  reportedCount: number;
  withinRange: boolean;
  accurateCount: boolean;
  message?: string;
}

/**
 * Validates word count from AI-generated essay
 * Checks both range compliance and accuracy of model's count
 *
 * @param result - Customization result from AI
 * @param minWords - Minimum word count (default: 600)
 * @param maxWords - Maximum word count (default: 650)
 * @param tolerance - Allowed difference between actual and reported count (default: 5)
 */
export function validateWordCount(
  result: CustomizationResult,
  minWords: number = 600,
  maxWords: number = 650,
  tolerance: number = 5
): WordCountValidation {
  // Calculate actual word count
  const actualCount = result.customizedEssay
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const reportedCount = result.wordCount;

  // Check if within acceptable range
  const withinRange = actualCount >= minWords && actualCount <= maxWords;

  // Check if model's count is accurate
  const countDifference = Math.abs(actualCount - reportedCount);
  const accurateCount = countDifference <= tolerance;

  // Overall validation
  const valid = withinRange && accurateCount;

  // Generate helpful message
  let message: string | undefined;
  if (!withinRange) {
    if (actualCount < minWords) {
      message = `Essay is too short (${actualCount} words, minimum ${minWords})`;
    } else {
      message = `Essay is too long (${actualCount} words, maximum ${maxWords})`;
    }
  } else if (!accurateCount) {
    message = `Word count mismatch: model reported ${reportedCount}, actual is ${actualCount}`;
  }

  return {
    valid,
    actualCount,
    reportedCount,
    withinRange,
    accurateCount,
    message,
  };
}

/**
 * Enhanced customization with word limit retry logic
 */
export async function customizeWithWordLimitRetry(
  prompt: string,
  schema: any,
  schemaName: string,
  options: any,
  generateFn: Function,
  targetMin: number = 600,
  targetMax: number = 650,
  maxRetries: number = 2
): Promise<CustomizationResult> {
  let lastError: Error | null = null;
  let lastValidation: WordCountValidation | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateFn(prompt, schema, schemaName, options);

      const validation = validateWordCount(result, targetMin, targetMax);

      if (validation.valid) {
        return result; // Success!
      }

      // Store for potential error reporting
      lastValidation = validation;

      // Prepare feedback for retry
      if (attempt < maxRetries) {
        const adjustment =
          validation.actualCount > targetMax
            ? `The essay is ${validation.actualCount} words - TOO LONG. You must reduce it to ${targetMax} words maximum while keeping all key points.`
            : `The essay is ${validation.actualCount} words - TOO SHORT. You must expand it to at least ${targetMin} words by adding relevant details.`;

        // Enhance prompt with specific feedback
        options.systemMessage = `${options.systemMessage}

CRITICAL FEEDBACK FROM PREVIOUS ATTEMPT:
${adjustment}

Count words VERY CAREFULLY this time. The word count MUST be between ${targetMin}-${targetMax}.`;

        console.warn(
          `Word count validation failed on attempt ${attempt + 1}, retrying...`,
          validation
        );
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors
      if (
        error.message.includes('Content policy') ||
        error.message.includes('Rate limit')
      ) {
        throw error;
      }
    }
  }

  // All retries exhausted
  const errorMessage = lastValidation
    ? `Failed to generate essay within word limit after ${maxRetries + 1} attempts. ${lastValidation.message}`
    : lastError?.message || 'Unknown error during essay generation';

  throw new Error(errorMessage);
}
```

---

## File 4: Updated Batch Processor

**Update:** `/src/lib/batch-processor.ts`

Replace the customization processing section:

```typescript
import { RateLimiter } from './rate-limiter';
import { generateStructuredCompletion } from './openai';
import { generateCustomizationPrompt } from './essay-principles';
import {
  CustomizationResultSchema,
  CustomizationResult,
} from './schemas/essay-customization';
import { customizeWithWordLimitRetry, validateWordCount } from './essay-validation';
import prisma from './prisma';
import { cache } from './redis';
import { CacheKeys } from './cache-keys';

// Update the result type to include metadata
export type BatchProcessResult = {
  schoolName: string;
  majorName: string;
} & (
  | {
      status: 'success';
      customizedEssay: string;
      responseTime: number;
      wordCount: number;
      metadata: {
        keyChanges: Array<{ category: string; description: string }>;
        alignmentScore: number;
        voicePreservationScore: number;
        suggestedNextSteps?: string[];
      };
    }
  | {
      status: 'error';
      error: string;
      code: 'RATE_LIMIT' | 'VALIDATION' | 'API_ERROR' | 'NOT_FOUND' | 'WORD_LIMIT' | 'UNKNOWN';
      retryable: boolean;
    }
);

// ... keep existing SchoolWithData interface and data fetching code ...

export async function processBatchCustomizations(
  userId: string,
  essay: string,
  schools: Array<{ schoolName: string; majorName: string }>
): Promise<BatchProcessResult[]> {
  // 1-2. Fetch school data (unchanged)
  // ... existing code for fetching and separating school data ...

  // 3. Process customizations with rate limiting
  const limiter = new RateLimiter(3, 200);

  const customizationResults = await Promise.allSettled(
    schoolsWithData.map((school) =>
      limiter.add(async () => {
        const prompt = generateCustomizationPrompt(
          essay,
          school.schoolName,
          school.majorName,
          {
            programDescription: school.data.programDescription,
            keyFeatures: school.data.keyFeatures,
            keywords: school.data.keywords,
          }
        );

        const startTime = Date.now();

        // Enhanced system message with word limit requirements
        const systemMessage = `You are an expert at tailoring college essays to specific programs while maintaining the student's authentic voice.

CRITICAL REQUIREMENTS:
1. WORD LIMIT: The essay MUST be between 600-650 words. Count carefully.
2. VOICE PRESERVATION: Maintain the student's unique writing style, phrases, and tone
3. STRATEGIC ALIGNMENT: Make subtle changes that align with program values
4. ACCURACY: Never fabricate experiences or accomplishments
5. HONESTY: Set meetsWordLimit to true ONLY if word count is 600-650

CUSTOMIZATION APPROACH:
- Identify 3-5 specific opportunities for program alignment
- Make strategic word choices that reflect program values
- Preserve the student's personality and authentic voice
- Be honest about alignment and voice preservation scores`;

        try {
          // NEW: Use structured outputs with word limit retry
          const result = await customizeWithWordLimitRetry(
            prompt,
            CustomizationResultSchema,
            'essay_customization',
            {
              model: 'gpt-4o-2024-08-06',
              maxTokens: 3500,
              temperature: 0.6,
              systemMessage,
            },
            generateStructuredCompletion,
            600, // minWords
            650, // maxWords
            2 // maxRetries
          );

          const responseTime = Date.now() - startTime;

          // Final validation check
          const validation = validateWordCount(result, 600, 650);
          if (!validation.valid) {
            console.warn(
              `Word count validation failed for ${school.schoolName}:`,
              validation
            );
          }

          return {
            schoolName: school.schoolName,
            majorName: school.majorName,
            customizedEssay: result.customizedEssay,
            responseTime,
            wordCount: validation.actualCount, // Use actual count, not reported
            metadata: {
              keyChanges: result.keyChanges,
              alignmentScore: result.alignmentScore,
              voicePreservationScore: result.voicePreservationScore,
              suggestedNextSteps: result.suggestedNextSteps,
            },
          };
        } catch (error: any) {
          // Throw with context for error handling below
          throw new Error(`Customization failed: ${error.message}`);
        }
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
        ...result.value,
      });
    } else {
      const error = result.reason;
      const errorMessage = error?.message || 'Unknown error occurred';

      // Classify error type
      let code: BatchProcessResult['code'] = 'UNKNOWN';
      let retryable = false;

      if (errorMessage.includes('Rate limit')) {
        code = 'RATE_LIMIT';
        retryable = true;
      } else if (errorMessage.includes('word limit')) {
        code = 'WORD_LIMIT';
        retryable = true;
      } else if (errorMessage.includes('Schema validation')) {
        code = 'VALIDATION';
        retryable = false;
      } else if (error?.status >= 500) {
        code = 'API_ERROR';
        retryable = true;
      }

      failedResults.push({
        schoolName: school.schoolName,
        majorName: school.majorName,
        status: 'error',
        error: errorMessage,
        code,
        retryable,
      });
    }
  });

  // 5. Save successful customizations (updated to include metadata)
  if (successfulResults.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.usageTracking.updateMany({
          where: {
            userId,
            periodEnd: { gte: new Date() },
          },
          data: {
            customizationsCount: { increment: successfulResults.length },
          },
        });

        // Note: You may need to update Prisma schema to include metadata fields
        await tx.customization.createMany({
          data: successfulResults.map((result) => ({
            userId,
            draftId: '',
            schoolName: result.schoolName,
            majorName: result.majorName,
            originalEssay: essay,
            customizedEssay: result.customizedEssay,
            responseTime: result.responseTime,
            wordCount: result.wordCount,
            // Store metadata as JSON if your schema supports it
            metadata: result.metadata as any,
          })),
          skipDuplicates: true,
        });
      });
    } catch (error) {
      console.error('Failed to save customizations to database:', error);
    }
  }

  // 6. Combine all results
  return [...schoolsWithoutData, ...successfulResults, ...failedResults];
}

// ... keep existing checkBatchCustomizationQuota function ...
```

---

## File 5: Updated API Route

**Update:** `/src/app/api/essays/customize/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateStructuredCompletion } from '@/lib/openai';
import { generateCustomizationPrompt } from '@/lib/essay-principles';
import { CustomizationResultSchema } from '@/lib/schemas/essay-customization';
import { customizeWithWordLimitRetry, validateWordCount } from '@/lib/essay-validation';
import { rateLimit, cache } from '@/lib/redis';
import { CacheKeys } from '@/lib/cache-keys';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const customizeSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters'),
  schoolName: z.string().min(2, 'School name is required'),
  majorName: z.string().min(2, 'Major name is required'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication (unchanged)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validation (unchanged)
    const body = await request.json();
    const validation = customizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { essay, schoolName, majorName } = validation.data;
    const userId = session.user.id;

    // 3-4. Rate limiting and usage checks (unchanged)
    // ... existing rate limit and tier check code ...

    // 5. Get school data (unchanged)
    const cacheKey = CacheKeys.school.data(schoolName, majorName);
    let schoolData = await cache.get<any>(cacheKey);

    if (!schoolData) {
      schoolData = await prisma.schoolMajorData.findUnique({
        where: {
          schoolName_majorName: { schoolName, majorName },
        },
      });

      if (!schoolData) {
        return NextResponse.json(
          {
            error: `No data found for ${schoolName} - ${majorName}. Please fetch school data first.`,
            action: 'fetch',
          },
          { status: 404 }
        );
      }

      await cache.set(cacheKey, schoolData, 3600);
    }

    // 6. Generate customized essay with structured outputs
    const customizationPrompt = generateCustomizationPrompt(
      essay,
      schoolName,
      majorName,
      {
        programDescription: schoolData.programDescription,
        keyFeatures: schoolData.keyFeatures,
        keywords: schoolData.keywords,
      }
    );

    const systemMessage = `You are an expert at tailoring college essays to specific programs while maintaining the student's authentic voice.

CRITICAL REQUIREMENTS:
1. WORD LIMIT: The essay MUST be between 600-650 words. Count carefully.
2. VOICE PRESERVATION: Maintain the student's unique writing style
3. STRATEGIC ALIGNMENT: Make subtle changes that align with program values
4. ACCURACY: Never fabricate experiences
5. HONESTY: Set meetsWordLimit to true ONLY if word count is 600-650`;

    const startTime = Date.now();

    // NEW: Use structured completion with retry logic
    const result = await customizeWithWordLimitRetry(
      customizationPrompt,
      CustomizationResultSchema,
      'essay_customization',
      {
        model: 'gpt-4o-2024-08-06',
        maxTokens: 3500,
        temperature: 0.6,
        systemMessage,
      },
      generateStructuredCompletion,
      600,
      650,
      2
    );

    const responseTime = Date.now() - startTime;

    // Validate word count
    const validation = validateWordCount(result, 600, 650);

    // 7. Update usage tracking
    if (usage) {
      await prisma.usageTracking.update({
        where: { id: usage.id },
        data: { customizationsCount: usage.customizationsCount + 1 },
      });
    }

    // 8. Return enhanced response
    return NextResponse.json({
      customizedEssay: result.customizedEssay,
      school: schoolName,
      major: majorName,
      responseTime,
      wordCount: validation.actualCount,
      meetsWordLimit: validation.valid,
      metadata: {
        keyChanges: result.keyChanges,
        alignmentScore: result.alignmentScore,
        voicePreservationScore: result.voicePreservationScore,
        suggestedNextSteps: result.suggestedNextSteps,
      },
      remainingCustomizations:
        tier === 'FREE' || tier === 'PLUS'
          ? tierLimits[tier] - (usage?.customizationsCount || 0) - 1
          : 'unlimited',
    });
  } catch (error: any) {
    console.error('Essay customization error:', error);

    // Enhanced error response
    if (error.message.includes('Rate limit')) {
      return NextResponse.json(
        {
          error: 'API rate limit exceeded. Please try again in a moment.',
          code: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    if (error.message.includes('word limit')) {
      return NextResponse.json(
        {
          error: 'Failed to generate essay within word limit. Please try shortening your original essay.',
          code: 'WORD_LIMIT',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to customize essay',
        code: 'UNKNOWN',
      },
      { status: 500 }
    );
  }
}
```

---

## Migration Checklist

### Phase 1: Setup (15 min)
- [ ] Create `/src/lib/schemas/essay-customization.ts`
- [ ] Create `/src/lib/essay-validation.ts`
- [ ] Verify OpenAI SDK version (`npm list openai` should show 6.3.0+)
- [ ] Verify Zod version (`npm list zod` should show 4.1.12+)

### Phase 2: Core Updates (30 min)
- [ ] Update `/src/lib/openai.ts` with `generateStructuredCompletion()`
- [ ] Update `/src/lib/batch-processor.ts` customization logic
- [ ] Update `/src/app/api/essays/customize/route.ts`

### Phase 3: Testing (30 min)
- [ ] Test single customization API endpoint
- [ ] Test batch customization with 2-3 schools
- [ ] Test word limit validation (try with short and long essays)
- [ ] Test error handling (invalid school, rate limits)
- [ ] Verify JSON response structure matches new format

### Phase 4: Frontend Updates (variable)
- [ ] Update components consuming the API to use new `metadata` field
- [ ] Display alignment scores, key changes, etc. in UI
- [ ] Handle new error codes (`WORD_LIMIT`, etc.)

### Phase 5: Database (if needed)
- [ ] Update Prisma schema to include `metadata` JSON field in `Customization` model
- [ ] Run migration: `npx prisma migrate dev`

---

## Testing Examples

### Test 1: Single Customization
```bash
curl -X POST http://localhost:3000/api/essays/customize \
  -H "Content-Type: application/json" \
  -d '{
    "essay": "Your essay text here (at least 50 chars)...",
    "schoolName": "Stanford University",
    "majorName": "Computer Science"
  }'
```

Expected response:
```json
{
  "customizedEssay": "...",
  "school": "Stanford University",
  "major": "Computer Science",
  "responseTime": 2345,
  "wordCount": 647,
  "meetsWordLimit": true,
  "metadata": {
    "keyChanges": [
      {
        "category": "program_alignment",
        "description": "Added emphasis on CS research"
      }
    ],
    "alignmentScore": 92,
    "voicePreservationScore": 88,
    "suggestedNextSteps": ["Mention specific faculty"]
  },
  "remainingCustomizations": 9
}
```

### Test 2: Word Limit Validation
```typescript
import { validateWordCount } from '@/lib/essay-validation';
import { CustomizationResult } from '@/lib/schemas/essay-customization';

const mockResult: CustomizationResult = {
  customizedEssay: "word ".repeat(645), // 645 words
  wordCount: 645,
  meetsWordLimit: true,
  // ... other fields
};

const validation = validateWordCount(mockResult, 600, 650);
console.log(validation);
// { valid: true, actualCount: 645, reportedCount: 645, ... }
```

---

## Rollback Plan

If you need to revert to the old implementation:

1. **Keep Both Functions**: The new code keeps `generateCompletion()` unchanged
2. **Change One Line**: In `batch-processor.ts`, swap:
   ```typescript
   // OLD
   const customizedEssay = await generateCompletion(prompt, options);

   // NEW
   const result = await generateStructuredCompletion(prompt, schema, name, options);
   ```
3. **No Breaking Changes**: API response is extended, not replaced
4. **Frontend Compatible**: Old code still works, just ignores new `metadata` field

---

**Last Updated**: 2025-10-17
**Tested With**: OpenAI SDK v6.3.0, Zod v4.1.12, Next.js 15.5.5
