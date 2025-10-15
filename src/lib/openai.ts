import OpenAI from 'openai';

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

export default openai;
