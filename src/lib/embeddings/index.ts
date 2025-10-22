/**
 * Embeddings and Semantic Search Module
 *
 * This module provides comprehensive vector embedding and semantic search functionality
 * for the EssayDoctor college information lookup system using OpenAI embeddings and pgvector.
 *
 * @module embeddings
 */

// Core embedding generation
export {
  generateEmbedding,
  generateEmbeddings,
  prepareTextForEmbedding,
  embeddingToSQL,
  EMBEDDING_CONFIG,
} from './generator';

// Caching layer
export {
  getCachedEmbedding,
  setCachedEmbedding,
  getOrGenerateEmbedding,
  clearEmbeddingCache,
  getCacheStats,
} from './cache';

// Batch processing
export {
  generateSingleEmbedding,
  batchGenerateEmbeddings,
  getEmbeddingStats,
  regenerateOutdatedEmbeddings,
  type BatchResult,
} from './batch-processor';

// Semantic search
export {
  semanticSearch,
  batchSemanticSearch,
  findSimilarPrograms,
  type SemanticSearchOptions,
  type SemanticSearchResult,
} from './search';

// Hybrid search (semantic + keyword)
export {
  hybridSearch,
  smartSearch,
  type HybridSearchOptions,
  type HybridSearchResult,
  type KeywordSearchResult,
} from './hybrid-search';
