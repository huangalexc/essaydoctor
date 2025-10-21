import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Configuration for embedding generation
 */
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 1536, // Optimal balance of performance and storage
  encodingFormat: 'float' as const,
};

/**
 * Generate an embedding vector for the given text using OpenAI's text-embedding-3-large model
 * @param text - The text to generate an embedding for
 * @returns Promise resolving to an array of 1536 floating point numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: text,
      dimensions: EMBEDDING_CONFIG.dimensions,
      encoding_format: EMBEDDING_CONFIG.encodingFormat,
    });

    const embedding = response.data[0].embedding;

    // Validate embedding dimensions
    if (embedding.length !== EMBEDDING_CONFIG.dimensions) {
      throw new Error(
        `Invalid embedding dimension: expected ${EMBEDDING_CONFIG.dimensions}, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in a single API call (batch processing)
 * @param texts - Array of texts to generate embeddings for
 * @returns Promise resolving to an array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  if (texts.length > 100) {
    throw new Error('Maximum 100 texts per batch (OpenAI API limit)');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: texts,
      dimensions: EMBEDDING_CONFIG.dimensions,
      encoding_format: EMBEDDING_CONFIG.encodingFormat,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.status} - ${error.message}`);
    }
    throw error;
  }
}

/**
 * Convert a number array embedding to PostgreSQL vector format string
 * @param embedding - The embedding vector
 * @returns String in PostgreSQL vector format: '[0.1,0.2,0.3,...]'
 */
export function embeddingToSQL(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Prepare text from a SchoolMajorData record for embedding generation
 * Combines relevant fields to create a comprehensive semantic representation
 * @param major - Object containing school/major information
 * @returns Formatted text string for embedding
 */
export function prepareTextForEmbedding(major: {
  schoolName: string;
  majorName: string;
  programDescription: string;
  keyFeatures?: string[];
}): string {
  const parts: string[] = [
    `School: ${major.schoolName}`,
    `Major: ${major.majorName}`,
    `Description: ${major.programDescription}`,
  ];

  if (major.keyFeatures && major.keyFeatures.length > 0) {
    parts.push(`Key Features: ${major.keyFeatures.join(', ')}`);
  }

  return parts.join('\n\n');
}
