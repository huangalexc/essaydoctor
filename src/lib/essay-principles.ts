/**
 * 10 Core Essay Editing Principles
 * These principles guide the AI feedback generation
 */

export interface EssayPrinciple {
  id: string;
  name: string;
  description: string;
  weight: number; // Importance weight (1-10)
  evaluationPrompt: string;
}

export const ESSAY_PRINCIPLES: EssayPrinciple[] = [
  {
    id: 'hook',
    name: 'Compelling Hook',
    description: 'The essay starts with an engaging opening that captures attention',
    weight: 9,
    evaluationPrompt: `Evaluate the essay's opening hook. Does it:
- Immediately capture the reader's attention?
- Set the tone for the rest of the essay?
- Avoid clichés and generic openings?
- Create curiosity or emotional engagement?
Provide specific suggestions for improvement.`,
  },
  {
    id: 'show-dont-tell',
    name: 'Show, Don\'t Tell',
    description: 'Uses specific examples and vivid details instead of abstract statements',
    weight: 10,
    evaluationPrompt: `Analyze how the essay uses "show, don't tell":
- Identify instances where the writer tells instead of shows
- Find opportunities to add specific examples, sensory details, or anecdotes
- Suggest concrete scenes or moments that could replace abstract statements
- Ensure the reader can visualize and feel the experiences described`,
  },
  {
    id: 'authenticity',
    name: 'Authentic Voice',
    description: 'Maintains a genuine, personal voice that reflects the student',
    weight: 10,
    evaluationPrompt: `Assess the authenticity of the voice:
- Does it sound like a real person, not a textbook or generic applicant?
- Are there unique phrases or perspectives that reveal personality?
- Identify any overly formal or pretentious language
- Suggest ways to make the voice more natural and genuine`,
  },
  {
    id: 'structure',
    name: 'Clear Structure',
    description: 'Has a logical flow with smooth transitions between ideas',
    weight: 8,
    evaluationPrompt: `Evaluate the essay's structure and flow:
- Does each paragraph connect logically to the next?
- Are transitions smooth and purposeful?
- Is there a clear progression of ideas or narrative arc?
- Suggest improvements to organization or paragraph order`,
  },
  {
    id: 'specificity',
    name: 'Specific Details',
    description: 'Uses concrete, specific details rather than vague generalizations',
    weight: 9,
    evaluationPrompt: `Check for specificity:
- Identify vague or generic statements
- Find opportunities to add specific numbers, names, places, or moments
- Replace general descriptions with precise details
- Ensure claims are supported with concrete examples`,
  },
  {
    id: 'reflection',
    name: 'Meaningful Reflection',
    description: 'Demonstrates insight and growth through thoughtful reflection',
    weight: 10,
    evaluationPrompt: `Analyze the depth of reflection:
- Does the essay go beyond describing what happened to exploring why it matters?
- Is there evidence of self-awareness and personal growth?
- Are the insights genuine and meaningful, not forced?
- Suggest ways to deepen the reflection or connect experiences to values`,
  },
  {
    id: 'focus',
    name: 'Focused Topic',
    description: 'Stays focused on a single theme without trying to cover too much',
    weight: 8,
    evaluationPrompt: `Assess the essay's focus:
- Is there one clear central theme or story?
- Does the essay try to cover too many different ideas?
- Are there tangents or unnecessary details that could be cut?
- Suggest ways to narrow or sharpen the focus`,
  },
  {
    id: 'word-choice',
    name: 'Precise Word Choice',
    description: 'Uses strong, active verbs and precise language',
    weight: 7,
    evaluationPrompt: `Evaluate word choice and language:
- Identify weak verbs (is, was, has) that could be stronger
- Find opportunities to use more precise, vivid vocabulary
- Look for redundant phrases or wordiness
- Ensure language matches the intended tone and voice`,
  },
  {
    id: 'conclusion',
    name: 'Strong Conclusion',
    description: 'Ends with impact, tying together themes without simply repeating',
    weight: 8,
    evaluationPrompt: `Analyze the conclusion:
- Does it bring the essay to a satisfying close?
- Does it avoid simply repeating what was already said?
- Does it leave the reader with a lasting impression or insight?
- Suggest ways to strengthen the ending`,
  },
  {
    id: 'grammar-mechanics',
    name: 'Grammar & Mechanics',
    description: 'Free from grammatical errors and typos',
    weight: 6,
    evaluationPrompt: `Check for grammar and mechanics:
- Identify any grammatical errors
- Look for typos or spelling mistakes
- Check punctuation and sentence structure
- Ensure consistency in tense and voice
- Flag any confusing or awkwardly constructed sentences`,
  },
];

/**
 * Generate a comprehensive evaluation prompt that covers all principles
 */
export function generateEssayEvaluationPrompt(essay: string, prompt: string): string {
  return `You are an expert college essay editor. Analyze the following essay against the college application prompt and provide detailed, actionable feedback.

PROMPT:
${prompt}

ESSAY:
${essay}

Please evaluate this essay across these key principles:

${ESSAY_PRINCIPLES.map(
  (p) => `
**${p.name}** (Importance: ${p.weight}/10)
${p.description}
${p.evaluationPrompt}
`
).join('\n')}

Provide your feedback in the following format:

## Overall Assessment
[Brief summary of the essay's strengths and areas for improvement]

## Principle-by-Principle Feedback

${ESSAY_PRINCIPLES.map((p) => `### ${p.name}\n**Score:** [X/10]\n**Feedback:**\n[Detailed analysis]\n**Suggestions:**\n[Specific, actionable improvements]`).join('\n\n')}

## Priority Improvements
[List 3-5 most important changes to make, in order of priority]

## Inline Comments
[Specific line-by-line suggestions formatted as: "Line X: [comment]"]

Keep all feedback constructive, specific, and actionable. Focus on helping the student's voice shine through while meeting college application standards.`;
}

/**
 * Generate a prompt for essay customization with school-specific context
 */
export function generateCustomizationPrompt(
  essay: string,
  schoolName: string,
  majorName: string,
  schoolContext: {
    programDescription: string;
    keyFeatures: string[];
    keywords: string[];
  }
): string {
  return `You are an expert college essay editor specializing in school-specific customization.

TASK: Customize this essay to be specifically tailored for ${schoolName}'s ${majorName} program while maintaining the student's authentic voice and the essay's core narrative.

ORIGINAL ESSAY:
${essay}

SCHOOL/PROGRAM CONTEXT:
Program: ${schoolName} - ${majorName}

Program Description:
${schoolContext.programDescription}

Key Features:
${schoolContext.keyFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Important Keywords: ${schoolContext.keywords.join(', ')}

REQUIREMENTS:
1. Maintain the original essay's voice, tone, and structure
2. Preserve the core narrative and personal story
3. Incorporate at least 2-3 specific details about ${schoolName}'s ${majorName} program
4. Connect the student's experiences/interests to program-specific features
5. Use program keywords naturally where they fit
6. DO NOT make the essay sound formulaic or forced
7. Ensure all additions feel authentic and well-integrated

CUSTOMIZATION APPROACH:
- Identify points in the essay where program-specific details naturally fit
- Add references to specific courses, research opportunities, or unique program features
- Connect the student's goals/interests to what makes this program distinctive
- Use program terminology where appropriate but not excessively

Please provide:

## Customized Essay
[The revised essay with school-specific customizations]

## Customization Summary
[Brief explanation of what was added and why, with specific line references]

## Integration Notes
[How the customizations connect to the original narrative]

Remember: The goal is thoughtful customization that enhances the essay, not rewriting it.`;
}

/**
 * Generate a prompt for complete essay rewrite
 */
export function generateRewritePrompt(essay: string, prompt: string, focusAreas: string[]): string {
  const focusSection =
    focusAreas.length > 0 ? `\n\nFocus especially on improving:\n${focusAreas.map((f) => `- ${f}`).join('\n')}` : '';

  return `You are an expert college essay editor. Rewrite the following essay to significantly improve its quality while maintaining the student's authentic voice and core story.

ORIGINAL PROMPT:
${prompt}

CURRENT ESSAY:
${essay}
${focusSection}

REWRITING GUIDELINES:
1. Keep the core narrative and personal story
2. Maintain the student's authentic voice
3. Apply the "show, don't tell" principle throughout
4. Add specific, vivid details
5. Strengthen the opening hook
6. Deepen reflection and insights
7. Improve flow and transitions
8. Use stronger, more precise language
9. Ensure a powerful conclusion
10. Maintain appropriate length (typically 500-650 words)

Please provide:

## Rewritten Essay
[The significantly improved version]

## Key Changes Made
[Bulleted list of major improvements with before/after examples]

## Rationale
[Brief explanation of the strategic choices in the rewrite]

Remember: This should feel like the student's best work, not like it was written by someone else.`;
}

/**
 * Get total weight of all principles
 */
export function getTotalWeight(): number {
  return ESSAY_PRINCIPLES.reduce((sum, p) => sum + p.weight, 0);
}

/**
 * Calculate overall essay score based on principle scores
 */
export function calculateOverallScore(principleScores: Record<string, number>): number {
  const totalWeight = getTotalWeight();
  const weightedSum = ESSAY_PRINCIPLES.reduce((sum, principle) => {
    const score = principleScores[principle.id] || 0;
    return sum + score * principle.weight;
  }, 0);

  return Math.round((weightedSum / (totalWeight * 10)) * 100);
}
