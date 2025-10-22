import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { smartSearch } from '@/lib/embeddings';

/**
 * Request validation schema for smart search
 */
const smartSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  limit: z.number().int().positive().max(100).optional().default(10),
  schoolName: z.string().optional(),
  majorName: z.string().optional(),
  semanticWeight: z.number().min(0).max(1).optional(),
  keywordWeight: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/search
 *
 * Smart search endpoint that automatically uses the best search strategy (hybrid)
 * This is the recommended endpoint for most use cases.
 *
 * Request Body:
 * {
 *   query: string;            // Natural language search query (required)
 *   limit?: number;           // Max results (1-100, default: 10)
 *   schoolName?: string;      // Optional school filter
 *   majorName?: string;       // Optional major filter
 *   semanticWeight?: number;  // Optional: Override semantic weight
 *   keywordWeight?: number;   // Optional: Override keyword weight
 * }
 *
 * Response: Same as hybrid search endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = smartSearchSchema.parse(body);

    // Perform smart search (uses hybrid search internally)
    const results = await smartSearch(validatedData.query, {
      limit: validatedData.limit,
      schoolName: validatedData.schoolName,
      majorName: validatedData.majorName,
      semanticWeight: validatedData.semanticWeight,
      keywordWeight: validatedData.keywordWeight,
    });

    const processingTime = Date.now() - startTime;

    // Return results with metadata
    return NextResponse.json({
      results,
      metadata: {
        query: validatedData.query,
        resultCount: results.length,
        processingTime,
        searchType: 'smart' as const,
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
    console.error('[Smart Search API] Error:', error);

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
 * GET /api/search?q=query&limit=10
 *
 * Smart search via query parameters
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('q') || searchParams.get('query');
  const limit = searchParams.get('limit');
  const schoolName = searchParams.get('school') || searchParams.get('schoolName');
  const majorName = searchParams.get('major') || searchParams.get('majorName');

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
