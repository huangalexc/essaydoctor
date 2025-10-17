import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate text completion using GPT-4
 */
export async function generateCompletion(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }
): Promise<string> {
  const {
    model = 'gpt-4-turbo-preview',
    maxTokens = 2000,
    temperature = 0.7,
    systemMessage = 'You are a helpful assistant specialized in college essay editing and writing.',
  } = options || {};

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI completion error:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Generate text embeddings using text-embedding-3-large
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1536, // Match pgvector dimension
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: texts,
      dimensions: 1536,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('OpenAI embeddings error:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Stream a completion response (for real-time feedback)
 */
export async function* streamCompletion(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }
): AsyncGenerator<string> {
  const {
    model = 'gpt-4-turbo-preview',
    maxTokens = 2000,
    temperature = 0.7,
    systemMessage = 'You are a helpful assistant specialized in college essay editing and writing.',
  } = options || {};

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('OpenAI stream error:', error);
    throw new Error('Failed to stream AI response');
  }
}

/**
 * Count tokens in a text (approximate)
 * For accurate counting, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text into smaller pieces if it exceeds token limit
 */
export function chunkText(text: string, maxTokens: number = 3000): string[] {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate structured completion with guaranteed schema compliance using OpenAI Structured Outputs
 *
 * This function provides 100% schema compliance using OpenAI's beta.chat.completions.parse API.
 * The schema is passed separately (not in the prompt), reducing token costs by ~30%.
 *
 * @template T - Zod schema type
 * @param prompt - The user prompt
 * @param schema - Zod schema for response validation
 * @param schemaName - Unique name for schema caching
 * @param options - Optional configuration
 * @returns Fully typed and validated response matching the schema
 *
 * @example
 * ```typescript
 * const result = await generateStructuredCompletion(
 *   prompt,
 *   EssayCustomizationSchema,
 *   'essay_customization',
 *   {
 *     model: 'gpt-4o-2024-08-06',
 *     maxTokens: 4000,
 *     temperature: 0.7,
 *   }
 * );
 * // result is fully typed as EssayCustomization
 * ```
 *
 * @throws {Error} If model refuses (content policy violation)
 * @throws {Error} If API call fails
 *
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */
export async function generateStructuredCompletion<T extends z.ZodType>(
  prompt: string,
  schema: T,
  schemaName: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemMessage?: string;
  }
): Promise<z.infer<T>> {
  const {
    model = 'gpt-4o-2024-08-06', // Required for structured outputs
    maxTokens = 4000,
    temperature = 0.7,
    systemMessage = 'You are a helpful assistant specialized in college essay editing and writing.',
  } = options || {};

  try {
    const completion = await openai.beta.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: maxTokens,
      temperature,
    });

    // Check for refusal (content policy violation)
    if (completion.choices[0].message.refusal) {
      throw new Error(`Model refused: ${completion.choices[0].message.refusal}`);
    }

    // Warn on truncation
    if (completion.choices[0].finish_reason === 'length') {
      console.warn(
        `[OpenAI] Response truncated for schema: ${schemaName}. Consider increasing max_tokens (current: ${maxTokens}).`
      );
    }

    // Return fully typed and validated result
    return completion.choices[0].message.parsed as z.infer<T>;
  } catch (error) {
    console.error('OpenAI structured completion error:', error);

    if (error instanceof Error && error.message.includes('refused')) {
      throw new Error('Content policy violation');
    }

    throw new Error('Failed to generate structured AI response');
  }
}

export default openai;
