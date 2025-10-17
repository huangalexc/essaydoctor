/**
 * Essay validation utilities for word count enforcement and quality checks
 *
 * Provides multi-layer validation for:
 * - Word count limits with tolerance
 * - Retry feedback generation
 * - Quality score validation
 */

export interface WordCountValidationResult {
  valid: boolean;
  actual: number;
  target: number;
  difference: number;
  exceedsBy: number;
  withinTolerance: boolean;
}

/**
 * Validate word count against target limit with optional tolerance
 *
 * @param essay - The essay text to validate
 * @param targetLimit - Maximum allowed word count
 * @param tolerance - Additional words allowed beyond limit (default: 0)
 * @returns Detailed validation result with actual count and difference
 *
 * @example
 * ```typescript
 * const result = validateWordCount(essay, 650, 5);
 * if (!result.valid) {
 *   console.log(`Essay exceeds limit by ${result.exceedsBy} words`);
 * }
 * ```
 */
export function validateWordCount(
  essay: string,
  targetLimit: number,
  tolerance: number = 0
): WordCountValidationResult {
  const actualCount = essay.trim().split(/\s+/).filter(Boolean).length;
  const allowedMax = targetLimit + tolerance;
  const isValid = actualCount <= allowedMax;
  const difference = actualCount - targetLimit;

  return {
    valid: isValid,
    actual: actualCount,
    target: targetLimit,
    difference,
    exceedsBy: isValid ? 0 : actualCount - allowedMax,
    withinTolerance: actualCount > targetLimit && actualCount <= allowedMax,
  };
}

/**
 * Generate feedback for retry prompt when word limit is exceeded
 *
 * @param validation - Previous validation result
 * @returns Specific instructions for reducing word count
 *
 * @example
 * ```typescript
 * const feedback = generateRetryFeedback(validation);
 * const retryPrompt = basePrompt + '\n\n' + feedback;
 * ```
 */
export function generateRetryFeedback(validation: WordCountValidationResult): string {
  const { actual, target, difference, exceedsBy } = validation;

  if (exceedsBy === 0) {
    return ''; // No feedback needed
  }

  const severity = exceedsBy > 50 ? 'SIGNIFICANTLY' : exceedsBy > 20 ? 'moderately' : 'slightly';
  const wordsToRemove = Math.ceil(exceedsBy / 10) * 10; // Round up to nearest 10

  let suggestions = '';
  if (exceedsBy > 50) {
    suggestions = `
**CRITICAL REDUCTION NEEDED**:
- Remove entire sentences or paragraphs that are less essential
- Combine multiple examples into one stronger example
- Eliminate redundant descriptions
- Focus only on the most impactful customizations`;
  } else if (exceedsBy > 20) {
    suggestions = `
**MODERATE REDUCTION NEEDED**:
- Tighten language by removing filler words ("very", "really", "quite")
- Condense wordy phrases into concise alternatives
- Remove one less-critical example or detail
- Use stronger verbs to replace weak verb + adverb combinations`;
  } else {
    suggestions = `
**MINOR REDUCTION NEEDED**:
- Remove unnecessary adjectives and adverbs
- Use contractions where appropriate
- Replace phrases with single words (e.g., "in order to" → "to")
- Tighten transitions between ideas`;
  }

  return `**PREVIOUS ATTEMPT FEEDBACK**:
Your previous attempt was ${actual} words, which is ${difference} words over the ${target} word limit.
This ${severity} exceeds the requirement. You need to remove approximately ${wordsToRemove} words.
${suggestions}

**STRICT REQUIREMENT**: The revised essay MUST NOT exceed ${target} words. Every word counts.`;
}

/**
 * Suggest specific areas to cut based on word count difference
 *
 * @param difference - Number of words over limit
 * @returns Array of specific cutting suggestions
 */
export function getSuggestionForCuts(difference: number): string[] {
  const suggestions: string[] = [];

  if (difference > 100) {
    suggestions.push('Remove one entire paragraph or major example');
    suggestions.push('Eliminate background context that is not essential');
  }

  if (difference > 50) {
    suggestions.push('Condense multiple examples into one stronger example');
    suggestions.push('Remove descriptive details that do not directly support the thesis');
  }

  if (difference > 20) {
    suggestions.push('Tighten transitions and connecting phrases');
    suggestions.push('Replace wordy constructions with concise alternatives');
  }

  if (difference > 10) {
    suggestions.push('Remove filler words and unnecessary modifiers');
    suggestions.push('Use active voice instead of passive voice');
  }

  if (difference > 0) {
    suggestions.push('Eliminate redundant words and phrases');
    suggestions.push('Use contractions where natural (e.g., "it is" → "it\'s")');
  }

  return suggestions;
}

/**
 * Validate quality scores are within expected ranges
 *
 * @param scores - Object containing quality scores
 * @returns True if all scores are valid (1-10)
 */
export function validateQualityScores(scores: {
  voicePreservationScore?: number;
  aiClicheAvoidanceScore?: number;
  alignmentScore?: number;
}): boolean {
  const { voicePreservationScore, aiClicheAvoidanceScore, alignmentScore } = scores;

  const isValidScore = (score: number | undefined): boolean => {
    if (score === undefined) return true; // Optional scores
    return Number.isInteger(score) && score >= 1 && score <= 10;
  };

  return (
    isValidScore(voicePreservationScore) &&
    isValidScore(aiClicheAvoidanceScore) &&
    isValidScore(alignmentScore)
  );
}

/**
 * Check for inconsistent quality scores that may indicate model confusion
 *
 * @param scores - Quality scores from AI response
 * @param aiPatternsDetected - Array of AI writing patterns found
 * @returns Warning message if scores are inconsistent, null otherwise
 */
export function checkScoreConsistency(
  scores: {
    voicePreservationScore: number;
    aiClicheAvoidanceScore: number;
  },
  aiPatternsDetected: string[]
): string | null {
  const { voicePreservationScore, aiClicheAvoidanceScore } = scores;

  // Suspiciously low voice score but high AI avoidance score
  if (voicePreservationScore < 4 && aiClicheAvoidanceScore > 8 && aiPatternsDetected.length === 0) {
    return 'Inconsistent scores: Low voice preservation but no AI patterns detected. Review may be needed.';
  }

  // High AI patterns detected but claims high avoidance score
  if (aiPatternsDetected.length >= 3 && aiClicheAvoidanceScore > 7) {
    return `Inconsistent scores: ${aiPatternsDetected.length} AI patterns detected but avoidance score is ${aiClicheAvoidanceScore}/10. Score may be inflated.`;
  }

  // Both scores suspiciously low
  if (voicePreservationScore < 4 && aiClicheAvoidanceScore < 4) {
    return 'Both quality scores are below 4. This customization may need significant revision.';
  }

  return null; // Scores appear consistent
}

/**
 * Calculate overall quality grade from individual scores
 *
 * @param scores - Individual quality scores
 * @returns Letter grade (A-F) and percentage
 */
export function calculateOverallQuality(scores: {
  voicePreservationScore: number;
  aiClicheAvoidanceScore: number;
  alignmentScore: number;
}): { grade: string; percentage: number } {
  const { voicePreservationScore, aiClicheAvoidanceScore, alignmentScore } = scores;

  // Weighted average (voice and AI avoidance more important than alignment)
  const percentage = Math.round(
    (voicePreservationScore * 0.4 + aiClicheAvoidanceScore * 0.4 + alignmentScore * 0.2) * 10
  );

  let grade: string;
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  else grade = 'F';

  return { grade, percentage };
}
