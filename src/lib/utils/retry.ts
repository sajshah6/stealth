/**
 * Retry Utility with Rate Limiting and Exponential Backoff
 * 
 * Handles rate limits (429), temporary failures (500, 503), and network errors
 * with intelligent backoff and retry logic.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  
  /** Initial delay in ms (default: 1000) */
  initialDelayMs?: number;
  
  /** Maximum delay in ms (default: 60000 = 1 minute) */
  maxDelayMs?: number;
  
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  
  /** Add random jitter to prevent thundering herd (default: true) */
  useJitter?: boolean;
  
  /** Function to check if error is retryable (default: checks rate limits and server errors) */
  isRetryable?: (error: unknown) => boolean;
  
  /** Function to extract retry-after header (default: OpenAI/Google format) */
  getRetryAfter?: (error: unknown) => number | null;
  
  /** Log prefix for debugging (default: "[Retry]") */
  logPrefix?: string;
}

export interface RetryResult<T> {
  /** The successful result */
  result: T;
  
  /** Number of attempts made (1 = success on first try) */
  attempts: number;
  
  /** Total time spent including retries (ms) */
  totalTimeMs: number;
}

/**
 * Execute a function with automatic retry on rate limits and failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 5,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    backoffMultiplier = 2,
    useJitter = true,
    isRetryable = isDefaultRetryable,
    getRetryAfter = getDefaultRetryAfter,
    logPrefix = "[Retry]",
  } = options;

  const startTime = Date.now();
  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;

    try {
      const result = await fn();
      const totalTimeMs = Date.now() - startTime;

      if (attempt > 1) {
        console.log(
          `${logPrefix} ✅ Success on attempt ${attempt} (${totalTimeMs}ms total)`
        );
      }

      return {
        result,
        attempts: attempt,
        totalTimeMs,
      };
    } catch (error) {
      lastError = error;

      // If this is the last attempt, or error is not retryable, throw
      if (attempt > maxRetries || !isRetryable(error)) {
        if (attempt > maxRetries) {
          console.error(
            `${logPrefix} ❌ Failed after ${attempt} attempts (${Date.now() - startTime}ms total)`
          );
        }
        throw error;
      }

      // Calculate delay with exponential backoff
      let delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      // Check for rate limit retry-after header
      const retryAfter = getRetryAfter(error);
      if (retryAfter !== null) {
        delayMs = Math.min(retryAfter * 1000, maxDelayMs);
        console.log(
          `${logPrefix} ⏳ Rate limited. Retry-After: ${retryAfter}s. Waiting ${delayMs}ms...`
        );
      } else {
        // Add jitter to prevent thundering herd
        if (useJitter) {
          delayMs = delayMs * (0.5 + Math.random() * 0.5);
        }

        const errorMsg = getErrorMessage(error);
        console.log(
          `${logPrefix} 🔄 Attempt ${attempt}/${maxRetries + 1} failed: ${errorMsg}. Retrying in ${Math.round(delayMs)}ms...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Default check for retryable errors.
 * Retries on:
 * - Rate limits (429)
 * - Server errors (500, 502, 503, 504)
 * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 */
function isDefaultRetryable(error: unknown): boolean {
  // OpenAI API errors
  if (error && typeof error === "object") {
    // Check status code
    if ("status" in error) {
      const status = error.status as number;
      // Retry on rate limits and server errors
      if ([429, 500, 502, 503, 504].includes(status)) {
        return true;
      }
    }

    // Check error code
    if ("code" in error) {
      const code = error.code as string;
      // Network errors
      if (
        [
          "ECONNRESET",
          "ETIMEDOUT",
          "ENOTFOUND",
          "ECONNREFUSED",
          "EPIPE",
        ].includes(code)
      ) {
        return true;
      }
      // OpenAI specific codes
      if (["rate_limit_exceeded", "server_error"].includes(code)) {
        return true;
      }
    }

    // Check error message for rate limit indicators
    if ("message" in error) {
      const message = String(error.message).toLowerCase();
      if (
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("quota exceeded") ||
        message.includes("429")
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract retry-after delay from error.
 * Returns delay in seconds, or null if not available.
 */
function getDefaultRetryAfter(error: unknown): number | null {
  if (error && typeof error === "object") {
    // Check for retry-after header (OpenAI format)
    if ("headers" in error) {
      const headers = error.headers as Record<string, unknown>;
      if ("retry-after" in headers) {
        const retryAfter = Number(headers["retry-after"]);
        if (!isNaN(retryAfter)) {
          return retryAfter;
        }
      }
      // Also check lowercase
      if ("Retry-After" in headers) {
        const retryAfter = Number(headers["Retry-After"]);
        if (!isNaN(retryAfter)) {
          return retryAfter;
        }
      }
    }

    // Check for retry_after in response (Google format)
    if ("response" in error) {
      const response = error.response as Record<string, unknown>;
      if (response && typeof response === "object" && "retry_after" in response) {
        const retryAfter = Number(response.retry_after);
        if (!isNaN(retryAfter)) {
          return retryAfter;
        }
      }
    }
  }

  return null;
}

/**
 * Extract a readable error message from an error object.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    if ("message" in error) {
      return String(error.message);
    }
    if ("error" in error && typeof error.error === "object" && error.error && "message" in error.error) {
      return String((error.error as { message: unknown }).message);
    }
  }
  return String(error);
}

