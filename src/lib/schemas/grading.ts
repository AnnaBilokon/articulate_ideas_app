import { z } from "zod";

// Outputs of the grade_dump, grade_answer and grade_explain calls.

// 0-5 rubric score; see "Grading rubric for answers" in PLAN.md.
export const scoreSchema = z.int().min(0).max(5);

export const gradeDumpSchema = z.object({
  right: z.array(z.string().min(1)),
  missed: z.array(z.string().min(1)),
  wrong: z.array(z.string().min(1)),
  summary: z.string().min(1),
});

export const gradeAnswerSchema = z.object({
  score: scoreSchema,
  points_hit: z.array(z.string().min(1)),
  points_missed: z.array(z.string().min(1)),
  feedback: z.string().min(1),
  // Why the answer went wrong; null when nothing did.
  mistake_cause: z.string().min(1).nullable(),
});

// A quoted part of the user's text and what is wrong or vague about it.
export const quotedIssueSchema = z.object({
  quote: z.string().min(1),
  issue: z.string().min(1),
});

export const explainPartSchema = z.object({
  present: z.boolean(),
  note: z.string().min(1),
});

export const gradeExplainSchema = z.object({
  claim: explainPartSchema,
  why: explainPartSchema,
  example: explainPartSchema,
  limit: explainPartSchema,
  so_what: explainPartSchema,
  vague_parts: z.array(quotedIssueSchema),
  tighter_version: z.string().min(1),
  score: scoreSchema,
});

export type Score = z.infer<typeof scoreSchema>;
export type GradeDumpResult = z.infer<typeof gradeDumpSchema>;
export type GradeAnswerResult = z.infer<typeof gradeAnswerSchema>;
export type QuotedIssue = z.infer<typeof quotedIssueSchema>;
export type ExplainPart = z.infer<typeof explainPartSchema>;
export type GradeExplainResult = z.infer<typeof gradeExplainSchema>;
