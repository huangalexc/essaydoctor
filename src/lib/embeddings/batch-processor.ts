import prisma from '../prisma';
import { generateEmbeddings, prepareTextForEmbedding, embeddingToSQL } from './generator';

/**
 * Batch processing configuration
 */
const BATCH_CONFIG = {
  dbBatchSize: 1000, // Records per database transaction
  openAIBatchSize: 100, // Texts per OpenAI API call (max 100)
  maxRetries: 3,
  retryDelay: 1000, // Initial retry delay in ms
  rateLimit: 4900, // OpenAI rate limit (requests/min) - slightly under 5000 for safety
};

/**
 * Result of batch embedding generation
 */
export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Sleep utility for rate limiting and retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = BATCH_CONFIG.maxRetries,
  initialDelay: number = BATCH_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Batch Processor] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Generate and store embedding for a single school/major record
 * @param majorId - ID of the SchoolMajorData record
 * @returns Promise resolving when embedding is stored
 */
export async function generateSingleEmbedding(majorId: string): Promise<void> {
  const major = await prisma.schoolMajorData.findUnique({
    where: { id: majorId },
    select: {
      id: true,
      schoolName: true,
      majorName: true,
      programDescription: true,
      keyFeatures: true,
    },
  });

  if (!major) {
    throw new Error(`SchoolMajorData with ID ${majorId} not found`);
  }

  // Prepare text and generate embedding
  const text = prepareTextForEmbedding(major);
  const embedding = await retryWithBackoff(() =>
    import('./generator').then((m) => m.generateEmbedding(text))
  );

  // Store in database
  await prisma.$executeRaw`
    UPDATE "school_major_data"
    SET
      embedding = ${embeddingToSQL(embedding)}::vector,
      "lastEmbeddingUpdate" = NOW()
    WHERE id = ${major.id}
  `;
}

/**
 * Generate embeddings for all school/major records without embeddings
 * Processes in batches with rate limiting and retry logic
 * @param options - Optional configuration
 * @returns Promise resolving to batch result statistics
 */
export async function batchGenerateEmbeddings(options: {
  limit?: number; // Max records to process
  majorIds?: string[]; // Specific IDs to process
} = {}): Promise<BatchResult> {
  const result: BatchResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Fetch majors without embeddings (or specific IDs)
  let majors;

  if (options.majorIds) {
    // Fetch specific IDs
    majors = await prisma.schoolMajorData.findMany({
      where: { id: { in: options.majorIds } },
      select: {
        id: true,
        schoolName: true,
        majorName: true,
        programDescription: true,
        keyFeatures: true,
      },
      take: options.limit,
    });
  } else {
    // Fetch records without embeddings using raw SQL (embedding field is Unsupported type)
    const idsResult = options.limit
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "school_major_data"
          WHERE embedding IS NULL
          LIMIT ${options.limit}
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "school_major_data"
          WHERE embedding IS NULL
        `;

    const ids = idsResult.map((r) => r.id);

    majors = await prisma.schoolMajorData.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        schoolName: true,
        majorName: true,
        programDescription: true,
        keyFeatures: true,
      },
    });
  }

  if (majors.length === 0) {
    console.log('[Batch Processor] No records to process');
    return result;
  }

  console.log(`[Batch Processor] Processing ${majors.length} records...`);

  // Process in database batches
  for (let i = 0; i < majors.length; i += BATCH_CONFIG.dbBatchSize) {
    const dbBatch = majors.slice(i, i + BATCH_CONFIG.dbBatchSize);

    // Further split into OpenAI API batches (max 100 per call)
    for (let j = 0; j < dbBatch.length; j += BATCH_CONFIG.openAIBatchSize) {
      const openAIBatch = dbBatch.slice(j, j + BATCH_CONFIG.openAIBatchSize);

      try {
        // Prepare texts for all records in this batch
        const texts = openAIBatch.map(prepareTextForEmbedding);

        // Generate embeddings with retry logic
        const embeddings = await retryWithBackoff(() => generateEmbeddings(texts));

        // Store embeddings in database transaction
        await prisma.$transaction(
          openAIBatch.map((major, idx) =>
            prisma.$executeRaw`
              UPDATE "school_major_data"
              SET
                embedding = ${embeddingToSQL(embeddings[idx])}::vector,
                "lastEmbeddingUpdate" = NOW()
              WHERE id = ${major.id}
            `
          )
        );

        result.success += openAIBatch.length;
        console.log(
          `[Batch Processor] Progress: ${result.success}/${majors.length} (${Math.round(
            (result.success / majors.length) * 100
          )}%)`
        );

        // Rate limiting: pause between batches
        // Calculate delay to stay under rate limit
        const delayMs = (60 * 1000) / BATCH_CONFIG.rateLimit;
        await sleep(delayMs);
      } catch (error) {
        // Log error and continue with next batch
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Batch Processor] Batch failed:`, errorMessage);

        openAIBatch.forEach((major) => {
          result.failed++;
          result.errors.push({
            id: major.id,
            error: errorMessage,
          });
        });
      }
    }
  }

  console.log(
    `[Batch Processor] Completed: ${result.success} success, ${result.failed} failed`
  );
  return result;
}

/**
 * Get embedding generation statistics
 * @returns Promise resolving to statistics object
 */
export async function getEmbeddingStats() {
  // Use raw SQL because embedding field is Unsupported type in Prisma
  const result = await prisma.$queryRaw<Array<{ total: bigint; with_embeddings: bigint }>>`
    SELECT
      COUNT(*) as total,
      COUNT(embedding) as with_embeddings
    FROM "school_major_data"
  `;

  const total = Number(result[0].total);
  const withEmbeddings = Number(result[0].with_embeddings);
  const pending = total - withEmbeddings;
  const completionPercent = total > 0 ? Math.round((withEmbeddings / total) * 100) : 0;

  return {
    total,
    withEmbeddings,
    pending,
    completionPercent,
  };
}

/**
 * Regenerate embeddings for records with outdated embeddings
 * Useful when changing embedding model or dimensions
 * @param olderThan - Regenerate if lastEmbeddingUpdate is older than this many days
 * @returns Promise resolving to batch result statistics
 */
export async function regenerateOutdatedEmbeddings(olderThan: number = 90): Promise<BatchResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThan);

  // Use raw SQL because embedding field is Unsupported type in Prisma
  const majors = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "school_major_data"
    WHERE embedding IS NOT NULL
      AND (
        "lastEmbeddingUpdate" IS NULL
        OR "lastEmbeddingUpdate" < ${cutoffDate}
      )
  `;

  console.log(`[Batch Processor] Regenerating ${majors.length} outdated embeddings...`);

  return batchGenerateEmbeddings({
    majorIds: majors.map((m) => m.id),
  });
}
