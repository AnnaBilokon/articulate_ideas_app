import { z } from "zod";

// Output of the build_card call.

export const recallQuestionTypes = ["why", "how", "compare", "apply"] as const;

// Flat, lowercase tags like "decision-making".
export const tagSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Tag must be lowercase words joined by hyphens");

export const topicCardSchema = z.object({
  one_sentence: z.string().min(1),
  paragraph: z.string().min(1),
  analogy: z.string().min(1),
  // A common mistake or the strongest counterpoint.
  counterpoint: z.string().min(1),
  connects_to: z.array(z.string().min(1)),
});

export const recallQuestionSchema = z.object({
  text: z.string().min(1),
  // The answer key the grader compares against.
  key_points: z.array(z.string().min(1)).min(2).max(5),
  type: z.enum(recallQuestionTypes),
});

export const buildCardSchema = z.object({
  card: topicCardSchema,
  recall_questions: z.array(recallQuestionSchema).min(10).max(15),
  tags: z.array(tagSchema).min(3).max(5),
});

export type RecallQuestionType = (typeof recallQuestionTypes)[number];
export type TopicCard = z.infer<typeof topicCardSchema>;
export type RecallQuestion = z.infer<typeof recallQuestionSchema>;
export type BuildCardResult = z.infer<typeof buildCardSchema>;
