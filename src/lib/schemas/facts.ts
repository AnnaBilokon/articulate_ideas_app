import { z } from "zod";
import { MAX_AREA_CHARS } from "./discover";
import { recallQuestionSchema } from "./card";

// Quick facts: pick a topic, then a question, and read a short answer.

export const QUICK_FACT_QUESTIONS = 6;
// "Surprise me": questions from all sorts of topics.
export const SURPRISE_AREA = "Surprise me";

export const factQuestionSchema = z.object({
  area: z.string().trim().min(1).max(MAX_AREA_CHARS),
  question: z.string().trim().min(1).max(200),
});
export type FactQuestion = z.infer<typeof factQuestionSchema>;

export const factQuestionsSchema = z.object({
  questions: z.array(factQuestionSchema).min(3).max(QUICK_FACT_QUESTIONS + 2),
});

/** A fact as Claude writes it, with a review question drafted alongside. */
export const quickFactReplySchema = z.object({
  fact: z.string().trim().min(1).max(1500),
  why_interesting: z.string().trim().max(400).nullable(),
  review_question: recallQuestionSchema.extend({ key_points: z.array(z.string().trim().min(1)).min(2).max(4) }).nullable(),
});
export type QuickFactReply = z.infer<typeof quickFactReplySchema>;

/** A fact as the pages show it. */
export type QuickFact = {
  id: string;
  createdAt: string;
  area: string;
  question: string;
  fact: string;
  whyInteresting: string | null;
  canReview: boolean;
  inReviews: boolean;
};

export const areaInputSchema = z.string().trim().min(1, "Pick or write a topic.").max(MAX_AREA_CHARS, "Keep the topic short.");
