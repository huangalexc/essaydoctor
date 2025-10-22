import { NextResponse } from 'next/server';
import { exportMetricsForMonitoring } from '@/lib/embeddings';

/**
 * GET /api/monitoring/metrics
 *
 * Export metrics in a format suitable for monitoring systems (Prometheus, DataDog, etc.)
 *
 * Response:
 * {
 *   metrics: {
 *     'search.total_count': number;
 *     'search.avg_time_ms': number;
 *     'search.p50_time_ms': number;
 *     'search.p95_time_ms': number;
 *     'search.p99_time_ms': number;
 *     'cache.hit_rate': number;
 *     'cache.memory_hit_rate': number;
 *     'cache.redis_hit_rate': number;
 *     'cache.total_requests': number;
 *     'cache.memory_hits': number;
 *     'cache.redis_hits': number;
 *     'cache.misses': number;
 *   };
 *   timestamp: string;
 * }
 */
export async function GET() {
  try {
    const metrics = exportMetricsForMonitoring();

    return NextResponse.json({
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Metrics API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to export metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
