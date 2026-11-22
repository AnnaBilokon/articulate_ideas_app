import { z } from "zod";
import { recallQuestionSchema } from "./card";
import { MAX_AREA_CHARS } from "./discover";

// Explore: a chat that starts from your own question. A short intro, then you
// ask, ask for examples, go deeper; Claude explains. Saving writes a note of
// what you covered, and you pick which of its review questions to keep.

export const MAX_EXPLORE_CHARS = 500;
// Your messages in one chat; the note gets hard to keep short past this.
export const MAX_EXPLORE_TURNS = 30;
// Now and then Claude offers a "check yourself" question, after this many of your messages.
export const CHECK_EVERY = 4;

export const exploreStartSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Write what you're curious about.")
    .max(MAX_EXPLORE_CHARS, `Keep it under ${MAX_EXPLORE_CHARS} characters.`),
});

// "ask": your own question or a suggested one; "check": your answer to a check-yourself question.
export const exploreMessageKinds = ["ask", "check"] as const;

export const exploreTurnInputSchema = z.object({
  kind: z.enum(exploreMessageKinds),
  text: z
    .string()
    .trim()
    .min(1, "Write your message first.")
    .max(MAX_EXPLORE_CHARS, `Keep it under ${MAX_EXPLORE_CHARS} characters.`),
});

export const exploreMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("claude"),
    text: z.string(),
    // Follow-ups to tap, so there's always something to ask next.
    suggestions: z.array(z.string()),
    // A light question to check yourself, offered now and then; null most turns.
    check: z.string().nullable(),
  }),
  z.object({ role: z.literal("you"), kind: z.enum(exploreMessageKinds), text: z.string() }),
]);
export type ExploreMessage = z.infer<typeof exploreMessageSchema>;

export function parseExploreMessages(raw: unknown): ExploreMessage[] {
  const parsed = z.array(exploreMessageSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** The first reply: a title and area for the chat, and a short intro. */
export const exploreIntroSchema = z.object({
  title: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(MAX_AREA_CHARS),
  intro: z.string().trim().min(1).max(2000),
  suggestions: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
});

export const exploreReplySchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  suggestions: z.array(z.string().trim().min(1).max(120)).max(4),
  check: z.string().trim().min(1).max(300).nullable(),
});

export const exploreNoteSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  key_ideas: z.array(z.string().trim().min(1).max(400)).min(1).max(7),
  examples: z.array(z.string().trim().min(1).max(400)).max(4),
});
export type ExploreNote = z.infer<typeof exploreNoteSchema>;

export const exploreReviewDraftSchema = recallQuestionSchema.extend({
  key_points: z.array(z.string().trim().min(1)).min(2).max(4),
});
export type ExploreReviewDraft = z.infer<typeof exploreReviewDraftSchema>;

export const exploreSavedSchema = exploreNoteSchema.extend({
  review_questions: z.array(exploreReviewDraftSchema).max(4),
});

export const exploreReviewsInputSchema = z.object({
  // Which drafted questions to add, by their place in the list.
  picks: z.array(z.int().min(0).max(10)).min(1, "Pick at least one question.").max(4),
});

/** A chat as the pages show it. */
export type Exploration = {
  id: string;
  createdAt: string;
  question: string;
  title: string;
  area: string;
  messages: ExploreMessage[];
  note: ExploreNote | null;
  // The drafted review questions, each marked when it's already in the reviews.
  reviewDrafts: { text: string; inReviews: boolean }[];
  savedAt: string | null;
  // The note is older than the chat: saving again brings it up to date.
  noteBehind: boolean;
};
