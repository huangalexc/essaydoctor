import { cache } from '../redis';
import { generateEmbedding } from './generator';
import { createHash } from 'crypto';

/**
 * Cache configuration for embeddings
 */
const EMBEDDING_CACHE_CONFIG = {
  ttl: 60 * 60 * 24 * 30, // 30 days in seconds
  prefix: 'embedding:v1:', // Version prefix for cache invalidation
  memoryMaxSize: 1000, // Max items in LRU memory cache
};

/**
 * Simple LRU (Least Recently Used) in-memory cache
 */
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Move to end (mark as recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // If at capacity, remove oldest item (first in map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global in-memory cache instance
const memoryCache = new LRUCache<number[]>(EMBEDDING_CACHE_CONFIG.memoryMaxSize);

/**
 * Generate a consistent hash for cache keys
 * @param text - Input text to hash
 * @returns MD5 hash of the normalized text
 */
function hashText(text: string): string {
  // Normalize: lowercase, trim, collapse whitespace
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return createHash('md5').update(normalized).digest('hex');
}

/**
 * Generate cache key for embedding
 * @param text - Input text
 * @returns Cache key string
 */
function getCacheKey(text: string): string {
  const hash = hashText(text);
  return `${EMBEDDING_CACHE_CONFIG.prefix}${hash}`;
}

/**
 * Get cached embedding from memory or Redis
 * Checks memory cache first (fast), then Redis (slower but persistent)
 * @param text - The text to get embedding for
 * @returns Cached embedding or null if not found
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const cacheKey = getCacheKey(text);

  // Layer 1: Check memory cache (fastest)
  const memCached = memoryCache.get(cacheKey);
  if (memCached) {
    console.log('[Embedding Cache] Memory cache hit');
    // Record metric (lazy import to avoid circular dependency)
    try {
      const { recordCacheAccess } = await import('./monitoring');
      recordCacheAccess(true, 'memory');
    } catch {
      // Monitoring optional
    }
    return memCached;
  }

  // Layer 2: Check Redis cache (fast, persistent)
  try {
    const redisCached = await cache.get<number[]>(cacheKey);
    if (redisCached && Array.isArray(redisCached)) {
      console.log('[Embedding Cache] Redis cache hit');
      // Populate memory cache for next time
      memoryCache.set(cacheKey, redisCached);
      // Record metric
      try {
        const { recordCacheAccess } = await import('./monitoring');
        recordCacheAccess(true, 'redis');
      } catch {
        // Monitoring optional
      }
      return redisCached;
    }
  } catch (error) {
    console.error('[Embedding Cache] Redis error:', error);
    // Continue without cache if Redis fails
  }

  console.log('[Embedding Cache] Cache miss');
  // Record miss
  try {
    const { recordCacheAccess } = await import('./monitoring');
    recordCacheAccess(false, 'memory');
  } catch {
    // Monitoring optional
  }
  return null;
}

/**
 * Store embedding in both memory and Redis caches
 * @param text - The original text
 * @param embedding - The embedding vector to cache
 */
export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  const cacheKey = getCacheKey(text);

  // Store in memory cache
  memoryCache.set(cacheKey, embedding);

  // Store in Redis cache (with TTL)
  try {
    await cache.set(cacheKey, embedding, EMBEDDING_CACHE_CONFIG.ttl);
    console.log('[Embedding Cache] Cached in memory + Redis');
  } catch (error) {
    console.error('[Embedding Cache] Failed to cache in Redis:', error);
    // Not critical - memory cache is still populated
  }
}

/**
 * Get or generate embedding with automatic caching
 * This is the main function to use for embedding generation with caching
 * @param text - The text to generate embedding for
 * @returns Promise resolving to the embedding vector
 */
export async function getOrGenerateEmbedding(text: string): Promise<number[]> {
  // Try to get from cache first
  const cached = await getCachedEmbedding(text);
  if (cached) {
    return cached;
  }

  // Cache miss - generate new embedding
  console.log('[Embedding Cache] Generating new embedding');
  const embedding = await generateEmbedding(text);

  // Cache for future use
  await setCachedEmbedding(text, embedding);

  return embedding;
}

/**
 * Clear all embedding caches (memory + Redis)
 * Useful for cache invalidation when model changes
 */
export async function clearEmbeddingCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  // Clear Redis cache (all keys matching pattern)
  try {
    await cache.delPattern(`${EMBEDDING_CACHE_CONFIG.prefix}*`);
    console.log('[Embedding Cache] Cleared all caches');
  } catch (error) {
    console.error('[Embedding Cache] Failed to clear Redis cache:', error);
  }
}

/**
 * Get cache statistics
 * @returns Object with cache stats
 */
export function getCacheStats() {
  return {
    memorySize: memoryCache.size(),
    memoryMaxSize: EMBEDDING_CACHE_CONFIG.memoryMaxSize,
    ttl: EMBEDDING_CACHE_CONFIG.ttl,
    prefix: EMBEDDING_CACHE_CONFIG.prefix,
  };
}
