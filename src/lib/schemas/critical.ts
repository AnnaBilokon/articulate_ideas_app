import { z } from "zod";

// Output of the build_critical call: open "Think deeper" questions.

export const criticalKinds = [
  "assumptions",
  "evidence",
  "counterargument",
  "implications",
  "perspectives",
  "transfer",
] as const;

export const criticalQuestionSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(criticalKinds),
  // Angles a strong answer weighs; not an answer key.
  considerations: z.array(z.string().min(1)).min(2).max(4),
});

export const buildCriticalSchema = z.object({
  questions: z.array(criticalQuestionSchema).min(3).max(6),
});

export type CriticalKind = (typeof criticalKinds)[number];
export type CriticalQuestion = z.infer<typeof criticalQuestionSchema>;

// A written answer to a Think deeper question, and the feedback on it
// (critique_critical): what's strong, what's missing, a fuller answer and the
// strongest counterargument.

export const MIN_CRITICAL_ANSWER_CHARS = 20;
export const MAX_CRITICAL_ANSWER_CHARS = 5000;

export const criticalAnswerInputSchema = z
  .string()
  .trim()
  .min(MIN_CRITICAL_ANSWER_CHARS, "Write a sentence or two first: what do you think, and why?")
  .max(MAX_CRITICAL_ANSWER_CHARS, "That's long for one answer. Keep it under about 800 words.");

export const critiqueSchema = z.object({
  strengths: z.array(z.string().min(1)).min(1).max(3),
  gaps: z.array(z.string().min(1)).max(3),
  fuller_answer: z.string().min(1),
  counterargument: z.string().min(1),
});

export type Critique = z.infer<typeof critiqueSchema>;

// Questions saved to learn later.

export const MAX_SAVED_QUESTION_CHARS = 500;

export const savedQuestionInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write the question first.")
    .max(MAX_SAVED_QUESTION_CHARS, `Keep it under ${MAX_SAVED_QUESTION_CHARS} characters.`),
  // Set when saved from a Think deeper question.
  criticalQuestionId: z.uuid().optional(),
});
