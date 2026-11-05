import { z } from "zod";
import { recallQuestionSchema } from "./card";

// Questions asked while learning (topic_asks): your own question, or "explain
// it differently" on a lesson part, with follow-ups.

export const askKinds = ["question", "simpler", "example", "analogy"] as const;
export type AskKind = (typeof askKinds)[number];

/** What "explain it differently" asks for, shown as the question in the thread. */
export const askKindQuestions: Record<Exclude<AskKind, "question">, string> = {
  simpler: "Explain this part more simply.",
  example: "Show me this part with an example.",
  analogy: "Explain this part with an analogy.",
};

// The first question and up to 3 follow-ups.
export const MAX_ASK_TURNS = 4;
export const MAX_ASK_CHARS = 500;

export const askRequestSchema = z
  .object({
    kind: z.enum(askKinds),
    question: z.string().trim().max(MAX_ASK_CHARS, `Keep the question under ${MAX_ASK_CHARS} characters.`).optional(),
    chunkId: z.uuid().nullable(),
    // A follow-up continues this thread.
    askId: z.uuid().nullable(),
  })
  .refine((r) => r.kind !== "question" || Boolean(r.question), { message: "Write your question first.", path: ["question"] })
  .refine((r) => r.kind === "question" || r.chunkId, { message: "Pick a lesson part first.", path: ["chunkId"] });
export type AskRequest = z.infer<typeof askRequestSchema>;

export const askTurnSchema = z.object({
  kind: z.enum(askKinds),
  question: z.string(),
  answer: z.string(),
  beyond_lesson: z.boolean(),
});
export type AskTurn = z.infer<typeof askTurnSchema>;

/** Claude's reply to one question: the answer, plus what the thread could become. */
export const askReplySchema = z.object({
  answer: z.string().trim().min(1).max(2000),
  beyond_lesson: z.boolean(),
  new_topic: z.string().trim().min(1).max(120).nullable(),
  review_question: recallQuestionSchema.extend({ key_points: z.array(z.string().trim().min(1)).min(2).max(4) }).nullable(),
});
export type AskReply = z.infer<typeof askReplySchema>;

/** A thread as the pages show it. */
export type AskThread = {
  id: string;
  chunkId: string | null;
  turns: AskTurn[];
  canReview: boolean;
  inReviews: boolean;
  newTopic: string | null;
  savedAsIdea: boolean;
};
