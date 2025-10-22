import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { semanticSearch } from '@/lib/embeddings';

/**
 * Request validation schema for semantic search
 */
const searchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  limit: z.number().int().positive().max(100).optional().default(10),
  schoolName: z.string().optional(),
  majorName: z.string().optional(),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7),
});

/**
 * POST /api/search/semantic
 *
 * Perform semantic search on school/major programs using natural language queries
 *
 * Request Body:
 * {
 *   query: string;           // Natural language search query (required)
 *   limit?: number;          // Max results (1-100, default: 10)
 *   schoolName?: string;     // Optional school filter
 *   majorName?: string;      // Optional major filter
 *   minSimilarity?: number;  // Minimum similarity (0-1, default: 0.7)
 * }
 *
 * Response:
 * {
 *   results: Array<{
 *     id: string;
 *     schoolName: string;
 *     majorName: string;
 *     programDescription: string;
 *     keyFeatures: string[];
 *     sourceUrl: string | null;
 *     lastUpdated: string;
 *     distance: number;     // Cosine distance (0-2, lower = more similar)
 *     similarity: number;   // Similarity score (0-1, higher = more similar)
 *   }>;
 *   metadata: {
 *     query: string;
 *     resultCount: number;
 *     processingTime: number; // milliseconds
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = searchSchema.parse(body);

    // Perform semantic search
    const results = await semanticSearch(validatedData);

    const processingTime = Date.now() - startTime;

    // Return results with metadata
    return NextResponse.json({
      results,
      metadata: {
        query: validatedData.query,
        resultCount: results.length,
        processingTime,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('[Semantic Search API] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/semantic?q=query&limit=10
 *
 * Perform semantic search via query parameters (alternative to POST)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || searchParams.get('query');
  const limit = searchParams.get('limit');
  const schoolName = searchParams.get('school') || searchParams.get('schoolName');
  const majorName = searchParams.get('major') || searchParams.get('majorName');
  const minSimilarity = searchParams.get('minSimilarity');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" or "query" is required' },
      { status: 400 }
    );
  }

  // Convert to POST-style request
  const body = {
    query,
    ...(limit && { limit: parseInt(limit, 10) }),
    ...(schoolName && { schoolName }),
    ...(majorName && { majorName }),
    ...(minSimilarity && { minSimilarity: parseFloat(minSimilarity) }),
  };

  // Reuse POST handler logic
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: request.headers,
    })
  );
}
