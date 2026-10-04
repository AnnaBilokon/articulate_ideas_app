import { z } from "zod";

// Outputs of the grade_dump, grade_answer and grade_explain calls.

// 0-5 rubric score; see "Grading rubric for answers" in PLAN.md.
export const scoreSchema = z.int().min(0).max(5);

// A quoted part of the user's text and what is wrong or vague about it.
export const quotedIssueSchema = z.object({
  quote: z.string().min(1),
  issue: z.string().min(1),
});

export const MIN_DUMP_CHARS = 10;
export const MAX_DUMP_CHARS = 20_000;

export const dumpInputSchema = z
  .string()
  .trim()
  .min(MIN_DUMP_CHARS, "Write at least a sentence, even if it's only what you're unsure about.")
  .max(MAX_DUMP_CHARS, "That's longer than a brain dump needs. Keep it under about 3,000 words.");

export const gradeDumpSchema = z.object({
  // Ideas from the lesson the learner got right, in their own terms.
  right: z.array(z.string().min(1)),
  // Important ideas from the lesson they didn't mention, most important first.
  missed: z.array(z.string().min(1)),
  // Things they wrote that are wrong, quoted, with the correction.
  wrong: z.array(quotedIssueSchema),
  summary: z.string().min(1),
});

export const MAX_DUMP_NUDGES = 20;

// A saved dump's feedback: Claude's grading plus how many nudges were used.
export const dumpRecordSchema = gradeDumpSchema.extend({
  nudges: z.int().min(0).max(MAX_DUMP_NUDGES).default(0),
});

export const gradeAnswerSchema = z.object({
  score: scoreSchema,
  points_hit: z.array(z.string().min(1)),
  points_missed: z.array(z.string().min(1)),
  feedback: z.string().min(1),
  // Why the answer went wrong; null when nothing did.
  mistake_cause: z.string().min(1).nullable(),
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
export type DumpRecord = z.infer<typeof dumpRecordSchema>;
export type GradeAnswerResult = z.infer<typeof gradeAnswerSchema>;
export type QuotedIssue = z.infer<typeof quotedIssueSchema>;
export type ExplainPart = z.infer<typeof explainPartSchema>;
export type GradeExplainResult = z.infer<typeof gradeExplainSchema>;
