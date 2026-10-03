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
  questions: z.array(criticalQuestionSchema).min(4).max(6),
});

export type CriticalKind = (typeof criticalKinds)[number];
export type CriticalQuestion = z.infer<typeof criticalQuestionSchema>;
