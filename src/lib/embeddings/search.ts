import prisma from '../prisma';
import { getOrGenerateEmbedding } from './cache';
import { embeddingToSQL } from './generator';

/**
 * Semantic search result from vector similarity
 */
export interface SemanticSearchResult {
  id: string;
  schoolName: string;
  majorName: string;
  programDescription: string;
  keyFeatures: string[];
  sourceUrl: string | null;
  lastUpdated: Date;
  distance: number; // Cosine distance (0-2, lower is more similar)
  similarity: number; // Similarity score (0-1, higher is more similar)
}

/**
 * Search options for semantic search
 */
export interface SemanticSearchOptions {
  query: string; // Natural language query
  limit?: number; // Max results (default: 10)
  schoolName?: string; // Optional school filter (case-insensitive)
  majorName?: string; // Optional major filter (case-insensitive)
  minSimilarity?: number; // Minimum similarity threshold (0-1, default: 0.7)
}

/**
 * Perform semantic search on school/major data using vector embeddings
 * @param options - Search configuration
 * @returns Promise resolving to ranked search results
 */
export async function semanticSearch(
  options: SemanticSearchOptions
): Promise<SemanticSearchResult[]> {
  const {
    query,
    limit = 10,
    schoolName,
    majorName,
    minSimilarity = 0.7,
  } = options;

  // Generate or retrieve cached embedding for query
  const queryEmbedding = await getOrGenerateEmbedding(query);
  const embeddingSQL = embeddingToSQL(queryEmbedding);

  // Execute semantic search with cosine distance (with optional filters)
  let results;

  if (schoolName && majorName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
      distance: number;
      similarity: number;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        "sourceUrl",
        "lastUpdated",
        embedding <=> ${embeddingSQL}::vector AS distance,
        (1 - (embedding <=> ${embeddingSQL}::vector) / 2) AS similarity
      FROM "school_major_data"
      WHERE embedding IS NOT NULL
        AND "schoolName" ILIKE ${`%${schoolName}%`}
        AND "majorName" ILIKE ${`%${majorName}%`}
      ORDER BY embedding <=> ${embeddingSQL}::vector
      LIMIT ${limit}
    `;
  } else if (schoolName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
      distance: number;
      similarity: number;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        "sourceUrl",
        "lastUpdated",
        embedding <=> ${embeddingSQL}::vector AS distance,
        (1 - (embedding <=> ${embeddingSQL}::vector) / 2) AS similarity
      FROM "school_major_data"
      WHERE embedding IS NOT NULL
        AND "schoolName" ILIKE ${`%${schoolName}%`}
      ORDER BY embedding <=> ${embeddingSQL}::vector
      LIMIT ${limit}
    `;
  } else if (majorName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
      distance: number;
      similarity: number;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        "sourceUrl",
        "lastUpdated",
        embedding <=> ${embeddingSQL}::vector AS distance,
        (1 - (embedding <=> ${embeddingSQL}::vector) / 2) AS similarity
      FROM "school_major_data"
      WHERE embedding IS NOT NULL
        AND "majorName" ILIKE ${`%${majorName}%`}
      ORDER BY embedding <=> ${embeddingSQL}::vector
      LIMIT ${limit}
    `;
  } else {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
      distance: number;
      similarity: number;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        "sourceUrl",
        "lastUpdated",
        embedding <=> ${embeddingSQL}::vector AS distance,
        (1 - (embedding <=> ${embeddingSQL}::vector) / 2) AS similarity
      FROM "school_major_data"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingSQL}::vector
      LIMIT ${limit}
    `;
  }

  // Filter by minimum similarity threshold
  return results.filter((result) => result.similarity >= minSimilarity);
}

/**
 * Batch semantic search for multiple queries
 * @param queries - Array of search queries
 * @param commonOptions - Options to apply to all searches
 * @returns Promise resolving to array of search result arrays
 */
export async function batchSemanticSearch(
  queries: string[],
  commonOptions: Omit<SemanticSearchOptions, 'query'> = {}
): Promise<SemanticSearchResult[][]> {
  return Promise.all(
    queries.map((query) =>
      semanticSearch({
        ...commonOptions,
        query,
      })
    )
  );
}

/**
 * Find similar programs to a given program
 * @param programId - ID of the SchoolMajorData record
 * @param limit - Maximum number of similar programs to return
 * @returns Promise resolving to similar programs (excluding the input program)
 */
export async function findSimilarPrograms(
  programId: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  // Get the program's embedding
  const program = await prisma.$queryRaw<Array<{ embedding: string }>>`
    SELECT embedding::text as embedding
    FROM "school_major_data"
    WHERE id = ${programId}
      AND embedding IS NOT NULL
    LIMIT 1
  `;

  if (!program || program.length === 0) {
    throw new Error(`Program with ID ${programId} not found or has no embedding`);
  }

  // Search for similar programs using the embedding
  const results = await prisma.$queryRaw<Array<{
    id: string;
    schoolName: string;
    majorName: string;
    programDescription: string;
    keyFeatures: string[];
    sourceUrl: string | null;
    lastUpdated: Date;
    distance: number;
    similarity: number;
  }>>`
    SELECT
      id,
      "schoolName",
      "majorName",
      "programDescription",
      "keyFeatures",
      "sourceUrl",
      "lastUpdated",
      embedding <=> ${program[0].embedding}::vector AS distance,
      (1 - (embedding <=> ${program[0].embedding}::vector) / 2) AS similarity
    FROM "school_major_data"
    WHERE embedding IS NOT NULL
      AND id != ${programId}
    ORDER BY embedding <=> ${program[0].embedding}::vector
    LIMIT ${limit}
  `;

  return results;
}
