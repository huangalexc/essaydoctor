-- Create HNSW index for vector similarity search optimization
--
-- IMPORTANT: This migration should be run AFTER generating embeddings for existing data.
-- Building an index on an empty table is fast, but building on populated data takes time.
--
-- HNSW (Hierarchical Navigable Small World) Parameters:
-- - m: Maximum number of connections per layer (default: 16, range: 2-100)
--   Higher m = better recall, more memory, slower build
-- - ef_construction: Size of dynamic candidate list during construction (default: 64)
--   Higher ef_construction = better index quality, slower build
--
-- Performance expectations:
-- - Build time: ~1-5 minutes per 10k records (depends on hardware)
-- - Query time: <10ms for typical similarity searches
-- - Index size: ~20-50% of vector data size
--
-- To monitor build progress:
-- SELECT * FROM pg_stat_progress_create_index;

-- Create HNSW index for cosine distance searches
-- Using default parameters (m=16, ef_construction=64) which provide good balance
CREATE INDEX IF NOT EXISTS idx_school_major_data_embedding_hnsw
  ON "school_major_data"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Optional: Create statistics to help query planner
ANALYZE "school_major_data";

-- Note: After index creation, you can adjust search quality at query time:
-- SET hnsw.ef_search = 100;  -- Higher = better recall, slower search (default: 40)
