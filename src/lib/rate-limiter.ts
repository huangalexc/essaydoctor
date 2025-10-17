/**
 * Custom Rate Limiter for batch processing
 *
 * Ensures controlled concurrent requests with minimum delays
 * to respect API rate limits (e.g., OpenAI 20 RPM on free tier)
 */

export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private lastExecution = 0;

  constructor(
    private maxConcurrent: number = 3,
    private minDelay: number = 200 // milliseconds between requests
  ) {
    if (maxConcurrent < 1) {
      throw new Error('maxConcurrent must be at least 1');
    }
    if (minDelay < 0) {
      throw new Error('minDelay cannot be negative');
    }
  }

  /**
   * Add a task to the rate-limited queue
   *
   * @param fn - Async function to execute with rate limiting
   * @returns Promise that resolves with the function's result
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Enforce minimum delay between executions
          const now = Date.now();
          const timeSinceLastExecution = now - this.lastExecution;

          if (timeSinceLastExecution < this.minDelay) {
            const delayNeeded = this.minDelay - timeSinceLastExecution;
            await new Promise(resolveDelay =>
              setTimeout(resolveDelay, delayNeeded)
            );
          }

          // Execute the function
          const result = await fn();
          this.lastExecution = Date.now();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Start processing the queue
      this.processQueue();
    });
  }

  /**
   * Process tasks from the queue while respecting concurrency limits
   */
  private async processQueue(): Promise<void> {
    // Don't start new task if at max concurrency or queue is empty
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Increment running count and get next task
    this.running++;
    const task = this.queue.shift();

    if (!task) {
      this.running--;
      return;
    }

    try {
      await task();
    } finally {
      // Decrement running count
      this.running--;

      // Process next task in queue
      this.processQueue();
    }
  }

  /**
   * Get current queue statistics
   */
  getStats(): {
    queueLength: number;
    running: number;
    maxConcurrent: number;
    minDelay: number;
  } {
    return {
      queueLength: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
      minDelay: this.minDelay,
    };
  }

  /**
   * Clear all pending tasks from the queue
   * Note: Does not cancel currently running tasks
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Create a rate limiter configured for OpenAI API
 *
 * @param tier - OpenAI tier: 'free' (20 RPM) or 'paid' (3500 RPM)
 * @returns Configured RateLimiter instance
 */
export function createOpenAIRateLimiter(
  tier: 'free' | 'paid' = 'free'
): RateLimiter {
  if (tier === 'free') {
    // Free tier: 20 requests per minute
    // 3 concurrent with 3 second delay = ~20 RPM
    return new RateLimiter(3, 3000);
  } else {
    // Paid tier: 3500 requests per minute
    // 10 concurrent with 200ms delay = ~3000 RPM (safe margin)
    return new RateLimiter(10, 200);
  }
}
