import prisma from '../prisma';
import { semanticSearch, SemanticSearchResult } from './search';

/**
 * Keyword search result from traditional text matching
 */
export interface KeywordSearchResult {
  id: string;
  schoolName: string;
  majorName: string;
  programDescription: string;
  keyFeatures: string[];
  sourceUrl: string | null;
  lastUpdated: Date;
  matchScore: number; // 0-1, based on keyword matches
}

/**
 * Hybrid search result combining semantic and keyword matching
 */
export interface HybridSearchResult {
  id: string;
  schoolName: string;
  majorName: string;
  programDescription: string;
  keyFeatures: string[];
  sourceUrl: string | null;
  lastUpdated: Date;
  semanticScore: number; // 0-1, from vector similarity
  keywordScore: number; // 0-1, from keyword matches
  combinedScore: number; // Weighted combination of both scores
  matchType: 'semantic' | 'keyword' | 'both'; // How the result was matched
}

/**
 * Hybrid search configuration
 */
export interface HybridSearchOptions {
  query: string; // Natural language query
  limit?: number; // Max results (default: 10)
  schoolName?: string; // Optional school filter
  majorName?: string; // Optional major filter
  semanticWeight?: number; // Weight for semantic score (0-1, default: 0.7)
  keywordWeight?: number; // Weight for keyword score (0-1, default: 0.3)
  minSemanticScore?: number; // Minimum semantic similarity (default: 0.6)
  minKeywordScore?: number; // Minimum keyword score (default: 0.3)
}

/**
 * Perform keyword-based search on school/major data
 * Uses the existing keywords array for matching
 * @param query - Search query string
 * @param options - Search filters
 * @returns Promise resolving to keyword search results
 */
async function keywordSearch(
  query: string,
  options: {
    limit?: number;
    schoolName?: string;
    majorName?: string;
  } = {}
): Promise<KeywordSearchResult[]> {
  const { limit = 20, schoolName, majorName } = options;

  // Extract keywords from query (simple tokenization)
  const queryKeywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (queryKeywords.length === 0) {
    return [];
  }

  // Build WHERE conditions
  let results;

  if (schoolName && majorName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      keywords: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        keywords,
        "sourceUrl",
        "lastUpdated"
      FROM "school_major_data"
      WHERE "schoolName" ILIKE ${`%${schoolName}%`}
        AND "majorName" ILIKE ${`%${majorName}%`}
    `;
  } else if (schoolName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      keywords: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        keywords,
        "sourceUrl",
        "lastUpdated"
      FROM "school_major_data"
      WHERE "schoolName" ILIKE ${`%${schoolName}%`}
    `;
  } else if (majorName) {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      keywords: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        keywords,
        "sourceUrl",
        "lastUpdated"
      FROM "school_major_data"
      WHERE "majorName" ILIKE ${`%${majorName}%`}
    `;
  } else {
    results = await prisma.$queryRaw<Array<{
      id: string;
      schoolName: string;
      majorName: string;
      programDescription: string;
      keyFeatures: string[];
      keywords: string[];
      sourceUrl: string | null;
      lastUpdated: Date;
    }>>`
      SELECT
        id,
        "schoolName",
        "majorName",
        "programDescription",
        "keyFeatures",
        keywords,
        "sourceUrl",
        "lastUpdated"
      FROM "school_major_data"
    `;
  }

  // Calculate keyword match scores
  const scoredResults = results
    .map((result) => {
      // Count how many query keywords appear in the program's keywords
      const matches = queryKeywords.filter((qk) =>
        result.keywords.some((pk) => pk.toLowerCase().includes(qk))
      );

      const matchScore = matches.length / queryKeywords.length;

      return {
        id: result.id,
        schoolName: result.schoolName,
        majorName: result.majorName,
        programDescription: result.programDescription,
        keyFeatures: result.keyFeatures,
        sourceUrl: result.sourceUrl,
        lastUpdated: result.lastUpdated,
        matchScore,
      };
    })
    .filter((result) => result.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scoredResults;
}

/**
 * Perform hybrid search combining semantic and keyword approaches
 * @param options - Hybrid search configuration
 * @returns Promise resolving to ranked hybrid results
 */
export async function hybridSearch(
  options: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const {
    query,
    limit = 10,
    schoolName,
    majorName,
    semanticWeight = 0.7,
    keywordWeight = 0.3,
    minSemanticScore = 0.6,
    minKeywordScore = 0.3,
  } = options;

  // Validate weights
  const totalWeight = semanticWeight + keywordWeight;
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new Error('Semantic and keyword weights must sum to 1.0');
  }

  // Run both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch({
      query,
      limit: limit * 2, // Fetch more for merging
      schoolName,
      majorName,
      minSimilarity: minSemanticScore,
    }),
    keywordSearch(query, {
      limit: limit * 2,
      schoolName,
      majorName,
    }),
  ]);

  // Build lookup maps
  const semanticMap = new Map<string, SemanticSearchResult>();
  semanticResults.forEach((result) => {
    semanticMap.set(result.id, result);
  });

  const keywordMap = new Map<string, KeywordSearchResult>();
  keywordResults.forEach((result) => {
    keywordMap.set(result.id, result);
  });

  // Combine results with hybrid scoring
  const allIds = new Set([...semanticMap.keys(), ...keywordMap.keys()]);
  const hybridResults: HybridSearchResult[] = [];

  for (const id of allIds) {
    const semanticResult = semanticMap.get(id);
    const keywordResult = keywordMap.get(id);

    // Get scores (0 if not found)
    const semanticScore = semanticResult?.similarity || 0;
    const keywordScore = keywordResult?.matchScore || 0;

    // Skip if neither meets minimum threshold
    if (semanticScore < minSemanticScore && keywordScore < minKeywordScore) {
      continue;
    }

    // Calculate combined score
    const combinedScore = semanticScore * semanticWeight + keywordScore * keywordWeight;

    // Determine match type
    let matchType: 'semantic' | 'keyword' | 'both';
    if (semanticScore >= minSemanticScore && keywordScore >= minKeywordScore) {
      matchType = 'both';
    } else if (semanticScore >= minSemanticScore) {
      matchType = 'semantic';
    } else {
      matchType = 'keyword';
    }

    // Use data from whichever source is available (prefer semantic)
    const sourceData = semanticResult || keywordResult!;

    hybridResults.push({
      id: sourceData.id,
      schoolName: sourceData.schoolName,
      majorName: sourceData.majorName,
      programDescription: sourceData.programDescription,
      keyFeatures: sourceData.keyFeatures,
      sourceUrl: sourceData.sourceUrl,
      lastUpdated: sourceData.lastUpdated,
      semanticScore,
      keywordScore,
      combinedScore,
      matchType,
    });
  }

  // Sort by combined score and return top results
  return hybridResults
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}

/**
 * Smart search that automatically chooses the best strategy
 * - Uses semantic search for natural language queries
 * - Falls back to keyword search if semantic fails
 * - Uses hybrid search if both methods are viable
 * @param query - Search query
 * @param options - Search options
 * @returns Promise resolving to best search results
 */
export async function smartSearch(
  query: string,
  options: Omit<HybridSearchOptions, 'query'> = {}
): Promise<HybridSearchResult[]> {
  // Always use hybrid search for best results
  return hybridSearch({
    query,
    ...options,
  });
}
