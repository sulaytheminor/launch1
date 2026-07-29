// src/lib/retry.js
//
// Small, generic retry wrapper. Only retries errors explicitly marked
// `err.retryable` — a rate limit, a 502/503/504 from the RPC proxy, or a
// network blip — so a "mint not found" or "not a token" error fails
// immediately instead of retrying something that will never succeed.
// Reports each retry attempt through onRetry so the UI can show real
// progress instead of silently stalling.

export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 500, onRetry } = {}) {
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = Boolean(err.retryable ?? err.rateLimited);

      if (!retryable || attempt === maxAttempts) {
        throw err;
      }

      if (onRetry) {
        await onRetry(attempt, err);
      }

      // Small linear backoff between attempts.
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastErr;
}
