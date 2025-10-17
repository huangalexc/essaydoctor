# OpenAI Structured Outputs Best Practices (2025)

## Executive Summary

This document provides comprehensive guidance for implementing OpenAI's Structured Outputs with Zod validation in Next.js server actions, specifically for the batch customization feature. It covers JSON mode vs structured outputs, type-safe parsing patterns, error handling, and word limit enforcement.

---

## 1. OpenAI API JSON Mode vs Structured Outputs

### Key Differences

| Feature | JSON Mode | Structured Outputs |
|---------|-----------|-------------------|
| **Valid JSON** | ✅ Guaranteed | ✅ Guaranteed |
| **Schema Adherence** | ❌ Not guaranteed | ✅ 100% guaranteed |
| **Reliability** | ~35.9% without prompting | 100% with `strict: true` |
| **Parameter** | `response_format: { type: "json_object" }` | `response_format: zodResponseFormat(schema, name)` |
| **Use Case** | Simple JSON responses | Complex, schema-validated data |

**Official Recommendation (2025)**: Use Structured Outputs with `strict: true` for production applications requiring reliable schema compliance.

**Source**: [OpenAI Platform Docs - Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

---

## 2. Converting Markdown to JSON with Structured Outputs

### Problem Statement
Current implementation returns markdown text:
```typescript
// Current approach - returns string
const customizedEssay = await generateCompletion(prompt, {...});
// Returns: "Here's your customized essay:\n\nParagraph 1..."
```

### Solution: Structured Outputs with Zod

#### Installation
```bash
npm install openai@^6.3.0 zod@^4.1.12
```
✅ Already installed in your project

#### Implementation Pattern

**Step 1: Define Zod Schema**
```typescript
// src/lib/schemas/essay-customization.ts
import { z } from 'zod';

export const CustomizationResultSchema = z.object({
  customizedEssay: z
    .string()
    .describe('The fully customized essay text, maintaining authentic student voice'),

  wordCount: z
    .number()
    .describe('Exact number of words in the customized essay'),

  keyChanges: z
    .array(z.string())
    .describe('List of 3-5 major customizations made to align with the school/program')
    .max(5),

  alignmentScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence score (0-100) for how well the essay aligns with program'),

  suggestedNextSteps: z
    .array(z.string())
    .optional()
    .describe('Optional suggestions for further refinement'),
});

export type CustomizationResult = z.infer<typeof CustomizationResultSchema>;
```

**Step 2: Update OpenAI Helper**
```typescript
// src/lib/openai.ts
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate structured completion using Zod schema validation
 * Ensures 100% schema compliance with type safety
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
    maxTokens = 2500,
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

    // Handle refusals (safety-related rejections)
    const message = completion.choices[0].message;
    if (message.refusal) {
      throw new Error(`Model refused to complete: ${message.refusal}`);
    }

    // Automatically parsed and validated by SDK
    return message.parsed as z.infer<T>;

  } catch (error: any) {
    // Handle specific error types
    if (error.type === 'invalid_request_error') {
      throw new Error(`Invalid schema: ${error.message}`);
    }

    if (error.status === 429) {
      throw new Error('Rate limit exceeded');
    }

    console.error('OpenAI structured completion error:', error);
    throw new Error('Failed to generate structured AI response');
  }
}

// Keep existing generateCompletion for backward compatibility
export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }
): Promise<string> {
  // ... existing implementation
}
```

**Step 3: Update Batch Processor**
```typescript
// src/lib/batch-processor.ts
import { generateStructuredCompletion } from './openai';
import { CustomizationResultSchema, CustomizationResult } from './schemas/essay-customization';

export async function processBatchCustomizations(
  userId: string,
  essay: string,
  schools: Array<{ schoolName: string; majorName: string }>
): Promise<BatchProcessResult[]> {
  // ... existing code for fetching school data ...

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

        // NEW: Use structured outputs instead of plain text
        const result: CustomizationResult = await generateStructuredCompletion(
          prompt,
          CustomizationResultSchema,
          'essay_customization',
          {
            model: 'gpt-4o-2024-08-06', // Required for structured outputs
            maxTokens: 3000,
            temperature: 0.6,
            systemMessage: `You are an expert at tailoring college essays to specific programs.

CRITICAL REQUIREMENTS:
- Keep the essay under 650 words
- Maintain the student's authentic voice and writing style
- Make subtle, strategic changes that align with program values
- Count words accurately and report the exact count
- Never fabricate experiences or accomplishments`,
          }
        );

        const responseTime = Date.now() - startTime;

        return {
          schoolName: school.schoolName,
          majorName: school.majorName,
          customizedEssay: result.customizedEssay,
          responseTime,
          wordCount: result.wordCount,
          metadata: {
            keyChanges: result.keyChanges,
            alignmentScore: result.alignmentScore,
            suggestedNextSteps: result.suggestedNextSteps,
          },
        };
      })
    )
  );

  // ... rest of implementation
}
```

---

## 3. Error Handling for Structured Outputs

### Error Types and Handling Strategy

#### 3.1 Schema Validation Errors
```typescript
try {
  const result = await generateStructuredCompletion(...);
} catch (error: any) {
  if (error.type === 'invalid_request_error') {
    // Schema is malformed or incompatible
    console.error('Schema validation failed:', error.message);
    return {
      status: 'error',
      code: 'SCHEMA_ERROR',
      error: 'Invalid response format configuration',
      retryable: false,
    };
  }
}
```

#### 3.2 Model Refusals
```typescript
const message = completion.choices[0].message;

if (message.refusal) {
  // Model refused for safety reasons
  return {
    status: 'error',
    code: 'CONTENT_POLICY',
    error: 'Content violates safety policies',
    retryable: false,
    details: message.refusal,
  };
}
```

#### 3.3 Incomplete Responses
```typescript
if (completion.choices[0].finish_reason === 'length') {
  // Hit max_tokens limit - response was truncated
  return {
    status: 'error',
    code: 'TOKEN_LIMIT',
    error: 'Response exceeded token limit',
    retryable: true,
    suggestion: 'Reduce essay length or increase maxTokens',
  };
}
```

#### 3.4 Rate Limiting
```typescript
try {
  const result = await generateStructuredCompletion(...);
} catch (error: any) {
  if (error.status === 429) {
    const retryAfter = error.headers?.['retry-after'];
    return {
      status: 'error',
      code: 'RATE_LIMIT',
      error: 'API rate limit exceeded',
      retryable: true,
      retryAfter: retryAfter ? parseInt(retryAfter) : 60,
    };
  }
}
```

### Next.js Server Action Error Pattern

**Official Recommendation**: Return serializable error objects, not thrown errors.

```typescript
// src/app/actions/customize-essay.ts
'use server';

import { ActionResult } from '@/types';
import { CustomizationResult } from '@/lib/schemas/essay-customization';

export async function customizeEssayAction(
  essay: string,
  schoolName: string,
  majorName: string
): Promise<ActionResult<CustomizationResult>> {
  try {
    // Validation
    if (!essay || essay.length < 50) {
      return {
        status: 'error',
        error: 'Essay must be at least 50 characters',
      };
    }

    // Generate structured output
    const result = await generateStructuredCompletion(
      prompt,
      CustomizationResultSchema,
      'essay_customization',
      options
    );

    return {
      status: 'success',
      data: result,
    };

  } catch (error: any) {
    console.error('Essay customization error:', error);

    // Return serializable error object
    return {
      status: 'error',
      error: error.message || 'Failed to customize essay',
    };
  }
}
```

**Source**: [Next.js Docs - Server Actions](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations)

---

## 4. Word Limit Constraints

### The Challenge

OpenAI's Structured Outputs **does NOT support** `minLength` or `maxLength` JSON Schema keywords.

**Official Documentation**:
> "Some keywords from JSON Schema are not supported, such as... keywords like minLength and maxLength."

**Source**: [OpenAI Structured Outputs - Supported Schemas](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas)

### Solution: Multi-Layered Approach

#### 4.1 Prompt Engineering (Primary)
```typescript
const systemMessage = `You are an expert college essay customizer.

CRITICAL WORD LIMIT REQUIREMENT:
- The customized essay MUST be between 600-650 words
- Count each word carefully
- If the original essay is longer, condense thoughtfully
- If shorter, expand with relevant details
- Report the exact word count in your response

VOICE PRESERVATION:
- Maintain the student's authentic voice and style
- Keep their unique phrases and expressions
- Make strategic, subtle changes only
- Never fabricate experiences`;

const userPrompt = `Customize this ${originalWordCount}-word essay for ${schoolName}'s ${majorName} program.

WORD LIMIT: The customized essay must be 600-650 words. This is non-negotiable.

Original Essay:
${essay}

Program Details:
${programDescription}

Key Features: ${keyFeatures.join(', ')}
`;
```

#### 4.2 Schema-Based Word Count Tracking
```typescript
const CustomizationResultSchema = z.object({
  customizedEssay: z.string(),

  wordCount: z
    .number()
    .describe('Exact word count of the customized essay - must be 600-650 words'),

  meetsWordLimit: z
    .boolean()
    .describe('True if essay is between 600-650 words, false otherwise'),
});
```

#### 4.3 Post-Processing Validation
```typescript
export async function validateWordCount(
  result: CustomizationResult,
  minWords: number = 600,
  maxWords: number = 650
): Promise<{ valid: boolean; actualCount: number; reportedCount: number }> {
  // Verify model's word count claim
  const actualCount = result.customizedEssay
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const withinRange = actualCount >= minWords && actualCount <= maxWords;
  const accurateCount = Math.abs(actualCount - result.wordCount) <= 5; // Allow 5-word margin

  return {
    valid: withinRange && accurateCount,
    actualCount,
    reportedCount: result.wordCount,
  };
}
```

#### 4.4 Retry Logic for Word Limit Violations
```typescript
async function customizeWithWordLimitRetry(
  prompt: string,
  targetWords: number = 650,
  maxRetries: number = 2
): Promise<CustomizationResult> {

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await generateStructuredCompletion(
      prompt,
      CustomizationResultSchema,
      'essay_customization',
      options
    );

    const validation = await validateWordCount(result, 600, 650);

    if (validation.valid) {
      return result;
    }

    if (attempt < maxRetries) {
      // Add feedback for retry
      const adjustment = validation.actualCount > 650
        ? `The essay is ${validation.actualCount} words - TOO LONG. Cut it down to 650 words maximum.`
        : `The essay is ${validation.actualCount} words - TOO SHORT. Expand to at least 600 words.`;

      prompt = `${prompt}\n\nPREVIOUS ATTEMPT FAILED: ${adjustment}`;
    }
  }

  throw new Error(`Failed to generate essay within word limit after ${maxRetries + 1} attempts`);
}
```

---

## 5. Type-Safe JSON Parsing Patterns

### 5.1 Zod Schema to TypeScript Type
```typescript
// Schema definition
const EssaySchema = z.object({
  customizedEssay: z.string(),
  wordCount: z.number(),
  keyChanges: z.array(z.string()),
});

// Automatic type inference
type Essay = z.infer<typeof EssaySchema>;
// Equivalent to:
// type Essay = {
//   customizedEssay: string;
//   wordCount: number;
//   keyChanges: string[];
// }
```

### 5.2 Runtime Validation
```typescript
// Safe parsing (doesn't throw)
const parseResult = EssaySchema.safeParse(jsonData);

if (!parseResult.success) {
  console.error('Validation errors:', parseResult.error.errors);
  // Handle validation failure
} else {
  const validData: Essay = parseResult.data;
  // Use type-safe data
}

// Parse (throws on invalid data)
try {
  const validData: Essay = EssaySchema.parse(jsonData);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### 5.3 Nested Schema Composition
```typescript
const MetadataSchema = z.object({
  keyChanges: z.array(z.string()).max(5),
  alignmentScore: z.number().min(0).max(100),
  suggestedNextSteps: z.array(z.string()).optional(),
});

const CustomizationResultSchema = z.object({
  customizedEssay: z.string(),
  wordCount: z.number(),
  metadata: MetadataSchema,
  timestamp: z.string().datetime(),
});
```

### 5.4 Schema Validation Methods
```typescript
// String validations
z.string()
  .min(10, 'Too short')
  .max(1000, 'Too long')
  .email()
  .url()
  .uuid()
  .regex(/^[A-Z]/)
  .trim()
  .toLowerCase();

// Number validations
z.number()
  .min(0)
  .max(100)
  .int()
  .positive()
  .nonnegative()
  .multipleOf(5);

// Array validations
z.array(z.string())
  .min(1, 'At least one item required')
  .max(10, 'Maximum 10 items')
  .nonempty();

// Optional and nullable
z.string().optional(); // string | undefined
z.string().nullable(); // string | null
z.string().nullish(); // string | null | undefined

// Enums
z.enum(['PENDING', 'COMPLETE', 'FAILED']);

// Objects with additional properties
z.object({
  name: z.string(),
}).strict(); // Reject unknown keys
```

---

## 6. Production Implementation Checklist

### ✅ Required Changes

1. **Install/Update Dependencies**
   ```bash
   npm install openai@latest zod@latest
   ```
   - ✅ OpenAI SDK v6.3.0 (already installed)
   - ✅ Zod v4.1.12 (already installed)

2. **Create Schema File**
   - [ ] Create `/src/lib/schemas/essay-customization.ts`
   - [ ] Define `CustomizationResultSchema`
   - [ ] Export type inference

3. **Update OpenAI Helper**
   - [ ] Add `generateStructuredCompletion()` function
   - [ ] Import `zodResponseFormat` from `openai/helpers/zod`
   - [ ] Add error handling for refusals and schema errors

4. **Update Batch Processor**
   - [ ] Replace `generateCompletion` with `generateStructuredCompletion`
   - [ ] Update model to `gpt-4o-2024-08-06`
   - [ ] Add word limit validation logic
   - [ ] Update system message with word count requirements

5. **Update API Routes**
   - [ ] Update `/src/app/api/essays/customize/route.ts`
   - [ ] Return structured JSON instead of plain string
   - [ ] Add metadata fields to response

6. **Error Handling**
   - [ ] Add refusal detection
   - [ ] Add schema validation error handling
   - [ ] Add word count validation with retry logic
   - [ ] Return serializable error objects in server actions

### ⚠️ Breaking Changes

**API Response Format Change**:
```typescript
// OLD RESPONSE
{
  customizedEssay: "Essay text here...",
  school: "Stanford",
  major: "Computer Science",
  responseTime: 1234,
  wordCount: 645  // Calculated client-side
}

// NEW RESPONSE
{
  customizedEssay: "Essay text here...",
  school: "Stanford",
  major: "Computer Science",
  responseTime: 1234,
  wordCount: 645,  // From model
  metadata: {
    keyChanges: ["Added emphasis on AI research", ...],
    alignmentScore: 92,
    suggestedNextSteps: ["Mention specific faculty", ...]
  }
}
```

**Frontend Update Required**: Update components consuming this API to handle new structure.

---

## 7. Additional Resources

### Official Documentation
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat/create)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Zod Documentation](https://zod.dev/)

### Code Examples
- [OpenAI Cookbook - Structured Outputs](https://cookbook.openai.com/examples/structured_outputs_intro)
- [OpenAI Node SDK Helpers](https://github.com/openai/openai-node/blob/master/helpers.md)

### Libraries
- **zod-gpt** (GitHub: dzhng/zod-gpt): Higher-level wrapper for structured outputs
- **LangChain.js**: Output parsers with auto-fixing capabilities
- **json_repair**: Utility for fixing malformed JSON

### Community Resources
- [WorkOS Blog - Zod for TypeScript AI Development](https://workos.com/blog/zod-for-typescript)
- [Tim Santeford - OpenAI Structured Outputs with Zod](https://www.timsanteford.com/posts/openai-structured-outputs-and-zod-and-zod-to-json-schema/)

---

## 8. Key Takeaways

1. **Use Structured Outputs**: 100% reliability vs 35.9% with prompt engineering alone
2. **Zod Integration**: Native SDK support via `zodResponseFormat()` - no manual conversion needed
3. **Word Limits**: Use prompt engineering + post-validation, not JSON Schema (unsupported)
4. **Error Handling**: Return serializable objects in Next.js server actions
5. **Type Safety**: Zod provides compile-time types and runtime validation
6. **Model Requirement**: Use `gpt-4o-2024-08-06` or newer for structured outputs
7. **Validation**: Always validate word counts post-generation, implement retry logic

---

**Generated**: 2025-10-17
**For Project**: EssayDoctor - Batch Customization Feature
**Author**: Claude Code Research Agent
