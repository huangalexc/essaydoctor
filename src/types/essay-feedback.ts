/**
 * Structured AI Essay Feedback Types
 */

export interface PrincipleFeedback {
  principleId: string;
  principleName: string;
  score: number; // 1-10
  feedback: string;
  suggestions: string[];
}

export interface InlineComment {
  lineNumber?: number;
  section: string;
  comment: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PriorityImprovement {
  rank: number;
  title: string;
  description: string;
  principleIds: string[]; // Which principles this addresses
}

export interface StructuredEssayFeedback {
  overallScore: number; // 0-100 calculated from principle scores
  overallAssessment: string;

  principlesFeedback: PrincipleFeedback[];

  priorityImprovements: PriorityImprovement[];

  inlineComments: InlineComment[];

  strengths: string[]; // Key strengths to highlight
  weaknesses: string[]; // Key areas needing improvement

  wordCount: number;
  readabilityScore?: number; // Optional Flesch-Kincaid or similar
}

export interface FeedbackAPIResponse {
  feedback: StructuredEssayFeedback;
  responseTime: number;
  remainingEdits: number | 'unlimited';
}

export interface RewriteAPIResponse {
  rewrittenEssay: string;
  keyChanges: string[];
  rationale: string;
  responseTime: number;
  remainingEdits: number | 'unlimited';
}
