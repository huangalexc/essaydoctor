/**
 * Search performance metrics
 */
export interface SearchMetrics {
  timestamp: Date;
  searchType: 'semantic' | 'hybrid' | 'keyword';
  query: string;
  resultCount: number;
  processingTime: number; // milliseconds
  cacheHit: boolean;
  embeddingGenerationTime?: number; // milliseconds
  databaseQueryTime?: number; // milliseconds
}

/**
 * Cache performance statistics
 */
export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  totalRequests: number;
  hitRate: number; // 0-1
  memoryHitRate: number; // 0-1
  redisHitRate: number; // 0-1
}

/**
 * System health metrics
 */
export interface SystemHealth {
  database: {
    connected: boolean;
    recordCount: number;
    embeddingsGenerated: number;
    embeddingsPending: number;
    completionPercent: number;
  };
  index: {
    exists: boolean;
    valid: boolean;
    sizeBytes: number;
    lastAnalyzed: Date | null;
  };
  cache: CacheStats;
  performance: {
    avgSearchTime: number; // milliseconds
    p50SearchTime: number; // milliseconds
    p95SearchTime: number; // milliseconds
    p99SearchTime: number; // milliseconds
    slowestQueries: Array<{
      query: string;
      time: number;
      timestamp: Date;
    }>;
  };
}

// In-memory metrics storage (would use Redis/TimescaleDB in production)
const metricsStore: SearchMetrics[] = [];
const MAX_METRICS = 10000; // Keep last 10k metrics

let cacheHits = 0;
let cacheMisses = 0;
let memoryHits = 0;
let redisHits = 0;

/**
 * Record a search operation metric
 * @param metrics - Search metrics to record
 */
export function recordSearchMetric(metrics: SearchMetrics): void {
  metricsStore.push(metrics);

  // Keep only recent metrics
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // Update cache stats
  if (metrics.cacheHit) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
}

/**
 * Record cache hit/miss
 * @param hit - Whether cache was hit
 * @param layer - Which cache layer ('memory' or 'redis')
 */
export function recordCacheAccess(hit: boolean, layer: 'memory' | 'redis'): void {
  if (hit) {
    cacheHits++;
    if (layer === 'memory') {
      memoryHits++;
    } else {
      redisHits++;
    }
  } else {
    cacheMisses++;
  }
}

/**
 * Get cache performance statistics
 * @returns Cache statistics
 */
export function getCacheStatistics(): CacheStats {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

  const memoryTotal = memoryHits + cacheMisses;
  const memoryHitRate = memoryTotal > 0 ? memoryHits / memoryTotal : 0;

  const redisTotal = redisHits + cacheMisses;
  const redisHitRate = redisTotal > 0 ? redisHits / redisTotal : 0;

  return {
    memoryHits,
    memoryMisses: cacheMisses,
    redisHits,
    redisMisses: cacheMisses,
    totalRequests,
    hitRate,
    memoryHitRate,
    redisHitRate,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
  memoryHits = 0;
  redisHits = 0;
}

/**
 * Get search performance statistics
 * @param timeWindow - Time window in minutes (default: 60)
 * @returns Performance statistics
 */
export function getSearchPerformanceStats(timeWindow: number = 60): {
  totalSearches: number;
  avgTime: number;
  p50Time: number;
  p95Time: number;
  p99Time: number;
  cacheHitRate: number;
} {
  const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
  const recentMetrics = metricsStore.filter((m) => m.timestamp >= cutoff);

  if (recentMetrics.length === 0) {
    return {
      totalSearches: 0,
      avgTime: 0,
      p50Time: 0,
      p95Time: 0,
      p99Time: 0,
      cacheHitRate: 0,
    };
  }

  // Calculate average
  const totalTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0);
  const avgTime = totalTime / recentMetrics.length;

  // Calculate percentiles
  const sortedTimes = recentMetrics.map((m) => m.processingTime).sort((a, b) => a - b);
  const p50Index = Math.floor(sortedTimes.length * 0.5);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p99Index = Math.floor(sortedTimes.length * 0.99);

  const p50Time = sortedTimes[p50Index] || 0;
  const p95Time = sortedTimes[p95Index] || 0;
  const p99Time = sortedTimes[p99Index] || 0;

  // Calculate cache hit rate
  const cacheHitCount = recentMetrics.filter((m) => m.cacheHit).length;
  const cacheHitRate = cacheHitCount / recentMetrics.length;

  return {
    totalSearches: recentMetrics.length,
    avgTime: Math.round(avgTime),
    p50Time: Math.round(p50Time),
    p95Time: Math.round(p95Time),
    p99Time: Math.round(p99Time),
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
  };
}

/**
 * Get slowest queries in time window
 * @param limit - Number of queries to return
 * @param timeWindow - Time window in minutes (default: 60)
 * @returns Slowest queries
 */
export function getSlowestQueries(
  limit: number = 10,
  timeWindow: number = 60
): Array<{ query: string; time: number; timestamp: Date }> {
  const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
  const recentMetrics = metricsStore.filter((m) => m.timestamp >= cutoff);

  return recentMetrics
    .sort((a, b) => b.processingTime - a.processingTime)
    .slice(0, limit)
    .map((m) => ({
      query: m.query.substring(0, 100), // Truncate long queries
      time: m.processingTime,
      timestamp: m.timestamp,
    }));
}

/**
 * Get comprehensive system health report
 * @returns Promise resolving to system health metrics
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  // Import here to avoid circular dependencies
  const { getEmbeddingStats } = await import('./batch-processor');
  const { getIndexStats, hasHNSWIndex } = await import('./index-management');

  // Database health
  let databaseHealth;
  try {
    const stats = await getEmbeddingStats();
    databaseHealth = {
      connected: true,
      recordCount: stats.total,
      embeddingsGenerated: stats.withEmbeddings,
      embeddingsPending: stats.pending,
      completionPercent: stats.completionPercent,
    };
  } catch {
    databaseHealth = {
      connected: false,
      recordCount: 0,
      embeddingsGenerated: 0,
      embeddingsPending: 0,
      completionPercent: 0,
    };
  }

  // Index health
  let indexHealth;
  try {
    const hasIndex = await hasHNSWIndex();
    const indexStats = hasIndex ? await getIndexStats() : null;
    indexHealth = {
      exists: hasIndex,
      valid: indexStats?.isValid ?? false,
      sizeBytes: indexStats?.indexSizeBytes ?? 0,
      lastAnalyzed: indexStats?.lastAnalyzed ?? null,
    };
  } catch {
    indexHealth = {
      exists: false,
      valid: false,
      sizeBytes: 0,
      lastAnalyzed: null,
    };
  }

  // Performance metrics
  const perfStats = getSearchPerformanceStats(60);
  const slowestQueries = getSlowestQueries(5, 60);

  return {
    database: databaseHealth,
    index: indexHealth,
    cache: getCacheStatistics(),
    performance: {
      avgSearchTime: perfStats.avgTime,
      p50SearchTime: perfStats.p50Time,
      p95SearchTime: perfStats.p95Time,
      p99SearchTime: perfStats.p99Time,
      slowestQueries,
    },
  };
}

/**
 * Clear all stored metrics (useful for testing)
 */
export function clearMetrics(): void {
  metricsStore.length = 0;
  resetCacheStats();
}

/**
 * Export metrics for external monitoring (Prometheus, DataDog, etc.)
 * @returns Metrics in a format suitable for monitoring systems
 */
export function exportMetricsForMonitoring() {
  const perfStats = getSearchPerformanceStats(60);
  const cacheStats = getCacheStatistics();

  return {
    // Search metrics
    'search.total_count': perfStats.totalSearches,
    'search.avg_time_ms': perfStats.avgTime,
    'search.p50_time_ms': perfStats.p50Time,
    'search.p95_time_ms': perfStats.p95Time,
    'search.p99_time_ms': perfStats.p99Time,

    // Cache metrics
    'cache.hit_rate': cacheStats.hitRate,
    'cache.memory_hit_rate': cacheStats.memoryHitRate,
    'cache.redis_hit_rate': cacheStats.redisHitRate,
    'cache.total_requests': cacheStats.totalRequests,
    'cache.memory_hits': cacheStats.memoryHits,
    'cache.redis_hits': cacheStats.redisHits,
    'cache.misses': cacheStats.memoryMisses,
  };
}
