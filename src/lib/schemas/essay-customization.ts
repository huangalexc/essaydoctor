import { z } from 'zod';

/**
 * Schema for AI-generated essay customization with comprehensive metadata
 *
 * This schema enforces structured responses from OpenAI to ensure:
 * - Word count tracking and limit compliance
 * - Human voice preservation scoring
 * - AI cliché detection and avoidance
 * - Detailed change tracking for transparency
 * - Quality metrics for user decision-making
 */
export const EssayCustomizationSchema = z.object({
  // Core customized content
  customizedEssay: z.string().min(100, 'Customized essay must be at least 100 characters'),

  // Word count tracking
  wordCount: z.number().int().min(0, 'Word count cannot be negative'),
  meetsWordLimit: z.boolean(),

  // Customization metadata
  customizationSummary: z.string().min(50, 'Summary must be at least 50 characters'),
  integrationNotes: z.string().min(50, 'Integration notes must be at least 50 characters'),

  // Specific changes made
  specificChanges: z.array(
    z.object({
      location: z.string().min(5, 'Location must be at least 5 characters'),
      change: z.string().min(10, 'Change description must be at least 10 characters'),
      reason: z.string().min(15, 'Reason must be at least 15 characters'),
    })
  ).min(2, 'Must have at least 2 specific changes').max(10, 'Maximum 10 specific changes'),

  // Program-specific references added
  programReferencesAdded: z.array(z.string()).min(2, 'Must add at least 2 program references').max(8, 'Maximum 8 program references'),

  // Quality scores (1-10 scale)
  voicePreservationScore: z.number().int().min(1).max(10),
  aiClicheAvoidanceScore: z.number().int().min(1).max(10),
  alignmentScore: z.number().int().min(1).max(10),

  // Self-reporting on quality
  aiWritingPatternsDetected: z.array(z.string()),
  voiceAnalysis: z.string().min(50, 'Voice analysis must be at least 50 characters'),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type EssayCustomization = z.infer<typeof EssayCustomizationSchema>;

/**
 * Schema for batch customization result (includes error handling)
 */
export const BatchCustomizationResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    schoolName: z.string(),
    majorName: z.string(),
    customization: EssayCustomizationSchema,
    responseTime: z.number(),
    retryCount: z.number().int().min(0).max(3),
  }),
  z.object({
    status: z.literal('error'),
    schoolName: z.string(),
    majorName: z.string(),
    error: z.string(),
    code: z.enum(['RATE_LIMIT', 'VALIDATION', 'API_ERROR', 'NOT_FOUND', 'WORD_LIMIT', 'UNKNOWN']),
    retryable: z.boolean(),
  }),
]);

export type BatchCustomizationResult = z.infer<typeof BatchCustomizationResultSchema>;
