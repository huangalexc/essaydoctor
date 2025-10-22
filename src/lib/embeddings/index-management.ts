import prisma from '../prisma';

/**
 * Index statistics and health information
 */
export interface IndexStats {
  indexName: string;
  indexSize: string; // Human-readable size (e.g., "42 MB")
  indexSizeBytes: number;
  tableName: string;
  indexType: string;
  isValid: boolean;
  lastAnalyzed: Date | null;
}

/**
 * HNSW index build progress
 */
export interface IndexBuildProgress {
  phase: string;
  blocksTotal: number;
  blocksDone: number;
  percentComplete: number;
  tuplesTotal: number;
  tuplesDone: number;
}

/**
 * Get statistics for the HNSW index
 * @returns Promise resolving to index statistics
 */
export async function getIndexStats(): Promise<IndexStats | null> {
  const result = await prisma.$queryRaw<Array<{
    indexname: string;
    tablename: string;
    indexdef: string;
  }>>`
    SELECT
      indexname,
      tablename,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'school_major_data'
      AND indexname LIKE '%embedding%hnsw%'
  `;

  if (result.length === 0) {
    return null;
  }

  const index = result[0];

  // Get index size
  const sizeResult = await prisma.$queryRaw<Array<{
    size: string;
    size_bytes: bigint;
  }>>`
    SELECT
      pg_size_pretty(pg_relation_size(quote_ident($1)::regclass)) as size,
      pg_relation_size(quote_ident($1)::regclass) as size_bytes
    FROM pg_class
    WHERE relname = ${index.indexname}
  `;

  // Get last analyze time
  const analyzeResult = await prisma.$queryRaw<Array<{
    last_analyze: Date | null;
  }>>`
    SELECT last_analyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND relname = 'school_major_data'
  `;

  // Check if index is valid
  const validResult = await prisma.$queryRaw<Array<{ indisvalid: boolean }>>`
    SELECT indisvalid
    FROM pg_index
    WHERE indexrelid = quote_ident($1)::regclass
  `;

  return {
    indexName: index.indexname,
    indexSize: sizeResult[0]?.size || '0 bytes',
    indexSizeBytes: Number(sizeResult[0]?.size_bytes || 0),
    tableName: index.tablename,
    indexType: 'hnsw',
    isValid: validResult[0]?.indisvalid ?? false,
    lastAnalyzed: analyzeResult[0]?.last_analyze || null,
  };
}

/**
 * Check if HNSW index exists
 * @returns Promise resolving to boolean
 */
export async function hasHNSWIndex(): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE tablename = 'school_major_data'
      AND indexname LIKE '%embedding%hnsw%'
  `;

  return Number(result[0].count) > 0;
}

/**
 * Get current HNSW index build progress (if index is being built)
 * @returns Promise resolving to build progress or null if not building
 */
export async function getIndexBuildProgress(): Promise<IndexBuildProgress | null> {
  const result = await prisma.$queryRaw<Array<{
    phase: string;
    blocks_total: bigint;
    blocks_done: bigint;
    tuples_total: bigint;
    tuples_done: bigint;
  }>>`
    SELECT
      phase,
      blocks_total,
      blocks_done,
      tuples_total,
      tuples_done
    FROM pg_stat_progress_create_index
    WHERE relid = 'school_major_data'::regclass
  `;

  if (result.length === 0) {
    return null;
  }

  const progress = result[0];
  const blocksTotal = Number(progress.blocks_total);
  const blocksDone = Number(progress.blocks_done);
  const percentComplete =
    blocksTotal > 0 ? Math.round((blocksDone / blocksTotal) * 100) : 0;

  return {
    phase: progress.phase,
    blocksTotal,
    blocksDone,
    percentComplete,
    tuplesTotal: Number(progress.tuples_total),
    tuplesDone: Number(progress.tuples_done),
  };
}

/**
 * Create HNSW index manually (alternative to running migration)
 * WARNING: This can take several minutes for large datasets
 * @param m - Maximum connections per layer (default: 16)
 * @param efConstruction - Dynamic candidate list size (default: 64)
 * @returns Promise resolving when index is created
 */
export async function createHNSWIndex(
  m: number = 16,
  efConstruction: number = 64
): Promise<void> {
  console.log(`[Index Management] Creating HNSW index (m=${m}, ef_construction=${efConstruction})`);
  console.log('[Index Management] This may take several minutes for large datasets...');

  await prisma.$executeRaw`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_school_major_data_embedding_hnsw
      ON "school_major_data"
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = ${m}, ef_construction = ${efConstruction})
  `;

  console.log('[Index Management] HNSW index created successfully');

  // Update table statistics
  await analyzeTable();
}

/**
 * Drop HNSW index (useful for rebuilding or testing)
 * @returns Promise resolving when index is dropped
 */
export async function dropHNSWIndex(): Promise<void> {
  await prisma.$executeRaw`
    DROP INDEX CONCURRENTLY IF EXISTS idx_school_major_data_embedding_hnsw
  `;

  console.log('[Index Management] HNSW index dropped');
}

/**
 * Rebuild HNSW index (drop and recreate)
 * @param m - Maximum connections per layer (default: 16)
 * @param efConstruction - Dynamic candidate list size (default: 64)
 * @returns Promise resolving when index is rebuilt
 */
export async function rebuildHNSWIndex(
  m: number = 16,
  efConstruction: number = 64
): Promise<void> {
  console.log('[Index Management] Rebuilding HNSW index...');

  await dropHNSWIndex();
  await createHNSWIndex(m, efConstruction);

  console.log('[Index Management] HNSW index rebuilt successfully');
}

/**
 * Update table statistics (ANALYZE command)
 * Should be run after bulk data changes
 * @returns Promise resolving when analysis is complete
 */
export async function analyzeTable(): Promise<void> {
  await prisma.$executeRaw`ANALYZE "school_major_data"`;
  console.log('[Index Management] Table statistics updated');
}

/**
 * Vacuum table to reclaim storage and update statistics
 * Should be run periodically for maintenance
 * @param full - Whether to perform VACUUM FULL (more thorough but locks table)
 * @returns Promise resolving when vacuum is complete
 */
export async function vacuumTable(full: boolean = false): Promise<void> {
  if (full) {
    await prisma.$executeRaw`VACUUM FULL ANALYZE "school_major_data"`;
    console.log('[Index Management] Full vacuum completed');
  } else {
    await prisma.$executeRaw`VACUUM ANALYZE "school_major_data"`;
    console.log('[Index Management] Vacuum completed');
  }
}

/**
 * Set HNSW search quality parameter for current session
 * Higher ef_search = better recall but slower queries
 * @param efSearch - Search quality (default: 40, recommended: 40-200)
 */
export async function setHNSWSearchQuality(efSearch: number): Promise<void> {
  await prisma.$executeRaw`SET hnsw.ef_search = ${efSearch}`;
  console.log(`[Index Management] HNSW search quality set to ${efSearch}`);
}

/**
 * Get comprehensive index health report
 * @returns Promise resolving to health report
 */
export async function getIndexHealthReport() {
  const hasIndex = await hasHNSWIndex();
  const stats = hasIndex ? await getIndexStats() : null;
  const buildProgress = await getIndexBuildProgress();

  return {
    hasIndex,
    stats,
    buildProgress,
    isBuilding: buildProgress !== null,
    recommendations: generateRecommendations(stats, hasIndex),
  };
}

/**
 * Generate recommendations based on index state
 */
function generateRecommendations(
  stats: IndexStats | null,
  hasIndex: boolean
): string[] {
  const recommendations: string[] = [];

  if (!hasIndex) {
    recommendations.push(
      'No HNSW index found. Run the index migration or use createHNSWIndex() to create one.'
    );
    recommendations.push('Queries are using sequential scan which is slow for large datasets.');
  } else if (stats) {
    if (!stats.isValid) {
      recommendations.push('Index is invalid. Consider rebuilding with rebuildHNSWIndex().');
    }

    if (!stats.lastAnalyzed) {
      recommendations.push(
        'Table statistics are outdated. Run analyzeTable() to update query planner statistics.'
      );
    } else {
      const daysSinceAnalyze =
        (Date.now() - stats.lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAnalyze > 7) {
        recommendations.push(
          `Table was last analyzed ${Math.round(daysSinceAnalyze)} days ago. Consider running analyzeTable().`
        );
      }
    }

    if (stats.indexSizeBytes > 1000000000) {
      // 1GB
      recommendations.push(
        'Large index detected. Consider periodic vacuumTable() for maintenance.'
      );
    }
  }

  return recommendations;
}
