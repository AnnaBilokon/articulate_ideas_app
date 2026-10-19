import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { TopicLevel } from "@/lib/schemas";

// Server-only Claude client. Reads ANTHROPIC_API_KEY from the environment.

// Models per job; see "Right model per job" in PLAN.md.

// Research, lessons, cards, glossaries, think deeper, and grading the brain
// dump and teach-back.
export const CONTENT_MODEL = "claude-sonnet-5-5";

// The same jobs for topics the learner knows well, where trade-offs and edge
// cases need more careful reasoning.
export const ADVANCED_MODEL = "claude-opus-5-5";

// Grades every quiz and review answer. Stays on Sonnet until Haiku passes the
// grader test on 20 sample answers.
export const GRADING_MODEL = "claude-sonnet-5-5";

// Short, low-stakes jobs: feedback on a part's recall, replies to follow-up
// answers, explaining a saved word.
export const LIGHT_MODEL = "claude-haiku-5-5";

export type Model = typeof CONTENT_MODEL | typeof ADVANCED_MODEL | typeof LIGHT_MODEL;

export function contentModel(level: TopicLevel | null): Model {
  return level === "advanced" ? ADVANCED_MODEL : CONTENT_MODEL;
}

// Per million tokens: input, output. Cached tokens are counted at the full
// input price, so costs are slight overestimates.
const PRICES: Record<Model, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function costUsd(model: Model, inputTokens: number, outputTokens: number): number {
  const [input, output] = PRICES[model];
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

// Re-runs a request on a fallback model if a safety classifier declines it.
// Haiku has no server-side fallback, so LIGHT_MODEL requests go without.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | undefined;

export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}
