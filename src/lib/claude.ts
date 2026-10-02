import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Server-only Claude client. Reads ANTHROPIC_API_KEY from the environment.

// "Strong" model for research and card building; see "Right model per job" in PLAN.md.
export const STRONG_MODEL = "claude-opus-5-5";

// Re-runs a request on a fallback model if a safety classifier declines it.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | undefined;

export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}
