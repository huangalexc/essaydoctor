import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/embeddings';

/**
 * GET /api/monitoring/health
 *
 * Get comprehensive system health metrics
 *
 * Response:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy';
 *   database: {
 *     connected: boolean;
 *     recordCount: number;
 *     embeddingsGenerated: number;
 *     embeddingsPending: number;
 *     completionPercent: number;
 *   };
 *   index: {
 *     exists: boolean;
 *     valid: boolean;
 *     sizeBytes: number;
 *     lastAnalyzed: Date | null;
 *   };
 *   cache: {
 *     hitRate: number;
 *     totalRequests: number;
 *   };
 *   performance: {
 *     avgSearchTime: number;
 *     p95SearchTime: number;
 *     p99SearchTime: number;
 *   };
 * }
 */
export async function GET() {
  try {
    const health = await getSystemHealth();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!health.database.connected) {
      status = 'unhealthy';
    } else if (health.index.exists && !health.index.valid) {
      status = 'degraded';
    } else if (health.performance.p99SearchTime > 1000) {
      // p99 > 1s
      status = 'degraded';
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      ...health,
    });
  } catch (error) {
    console.error('[Health API] Error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve system health',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
