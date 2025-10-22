import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hybridSearch } from '@/lib/embeddings';

/**
 * Request validation schema for hybrid search
 */
const hybridSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  limit: z.number().int().positive().max(100).optional().default(10),
  schoolName: z.string().optional(),
  majorName: z.string().optional(),
  semanticWeight: z.number().min(0).max(1).optional().default(0.7),
  keywordWeight: z.number().min(0).max(1).optional().default(0.3),
  minSemanticScore: z.number().min(0).max(1).optional().default(0.6),
  minKeywordScore: z.number().min(0).max(1).optional().default(0.3),
});

/**
 * POST /api/search/hybrid
 *
 * Perform hybrid search combining semantic similarity and keyword matching
 *
 * Request Body:
 * {
 *   query: string;             // Natural language search query (required)
 *   limit?: number;            // Max results (1-100, default: 10)
 *   schoolName?: string;       // Optional school filter
 *   majorName?: string;        // Optional major filter
 *   semanticWeight?: number;   // Weight for semantic score (0-1, default: 0.7)
 *   keywordWeight?: number;    // Weight for keyword score (0-1, default: 0.3)
 *   minSemanticScore?: number; // Minimum semantic similarity (0-1, default: 0.6)
 *   minKeywordScore?: number;  // Minimum keyword score (0-1, default: 0.3)
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
 *     semanticScore: number;   // Semantic similarity score (0-1)
 *     keywordScore: number;    // Keyword match score (0-1)
 *     combinedScore: number;   // Weighted combined score (0-1)
 *     matchType: 'semantic' | 'keyword' | 'both';
 *   }>;
 *   metadata: {
 *     query: string;
 *     resultCount: number;
 *     processingTime: number;
 *     searchStrategy: {
 *       semanticWeight: number;
 *       keywordWeight: number;
 *     };
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = hybridSearchSchema.parse(body);

    // Validate that weights sum to 1.0
    const totalWeight = validatedData.semanticWeight + validatedData.keywordWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return NextResponse.json(
        {
          error: 'Invalid weights',
          message: 'semanticWeight and keywordWeight must sum to 1.0',
        },
        { status: 400 }
      );
    }

    // Perform hybrid search
    const results = await hybridSearch(validatedData);

    const processingTime = Date.now() - startTime;

    // Return results with metadata
    return NextResponse.json({
      results,
      metadata: {
        query: validatedData.query,
        resultCount: results.length,
        processingTime,
        searchStrategy: {
          semanticWeight: validatedData.semanticWeight,
          keywordWeight: validatedData.keywordWeight,
        },
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
    console.error('[Hybrid Search API] Error:', error);

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
 * GET /api/search/hybrid?q=query&limit=10
 *
 * Perform hybrid search via query parameters (alternative to POST)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || searchParams.get('query');
  const limit = searchParams.get('limit');
  const schoolName = searchParams.get('school') || searchParams.get('schoolName');
  const majorName = searchParams.get('major') || searchParams.get('majorName');
  const semanticWeight = searchParams.get('semanticWeight');
  const keywordWeight = searchParams.get('keywordWeight');

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
    ...(semanticWeight && { semanticWeight: parseFloat(semanticWeight) }),
    ...(keywordWeight && { keywordWeight: parseFloat(keywordWeight) }),
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
