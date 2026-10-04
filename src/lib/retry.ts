import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Network drops and overloaded servers usually pass; validation errors,
// refusals and bad requests don't, so those aren't retried.
function isTransient(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.InternalServerError) return true;
  if (error instanceof Anthropic.APIError) return error.status === 529;
  // A stream cut off mid-response surfaces as a plain "terminated" error.
  return error instanceof Error && /terminated|ECONNRESET|ETIMEDOUT|socket hang up/i.test(
    `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`,
  );
}

/** Runs a background task, retrying transient failures after a short pause. */
export async function withRetry<T>(task: () => Promise<T>, attempts = 3, delayMs = 3000): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts || !isTransient(error)) throw error;
      console.warn(`retrying after a transient error (attempt ${attempt} of ${attempts}):`, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
