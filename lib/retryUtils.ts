/**
 * Retry logic for transient API failures
 * Implements exponential backoff to handle temporary issues
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: Error) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors and timeouts
    const message = error.message.toLowerCase()
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    )
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute async function with automatic retry logic
 * @param fn - Function to execute
 * @param options - Retry configuration
 * @returns Result of function execution
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null
  let delayMs = config.initialDelayMs

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if it's not a retryable error
      if (!config.shouldRetry(lastError)) {
        throw lastError
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        throw lastError
      }

      // Wait before retrying
      await sleep(delayMs)
      delayMs = Math.min(delayMs * config.backoffMultiplier, config.maxDelayMs)
    }
  }

  // Should never reach here, but just in case
  if (lastError) {
    throw lastError
  }

  throw new Error('Retry logic failed unexpectedly')
}

/**
 * Retry a fetch request with exponential backoff
 * Useful for API calls that might temporarily fail
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    () =>
      fetch(url, options).then((response) => {
        // Only consider 5xx errors as retryable
        // 4xx errors (auth, validation) should fail immediately
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`)
        }
        return response
      }),
    retryOptions
  )
}
