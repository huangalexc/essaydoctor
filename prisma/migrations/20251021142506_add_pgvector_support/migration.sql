-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding columns to school_major_data table
ALTER TABLE "school_major_data"
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536),
  ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT DEFAULT 'text-embedding-3-large',
  ADD COLUMN IF NOT EXISTS "embeddingVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastEmbeddingUpdate" TIMESTAMP(3);

-- Note: HNSW index will be created in a separate migration after embeddings are generated
-- This prevents performance issues when building the index on an empty table
