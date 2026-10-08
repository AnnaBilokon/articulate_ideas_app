import { z } from "zod";

// Outputs of the grade_dump, grade_chunk_recall, grade_answer, grade_explain and follow-up calls.

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

export const MAX_CHUNK_RECALL_CHARS = 3000;

// A recall after one lesson part: its main idea in a few sentences.
export const chunkRecallInputSchema = z
  .string()
  .trim()
  .min(MIN_DUMP_CHARS, "Write a sentence, even a rough one.")
  .max(MAX_CHUNK_RECALL_CHARS, "Keep it short: the main idea in a few sentences.");

export const chunkRecallVerdicts = ["got_it", "partly", "missed"] as const;

export const gradeChunkRecallSchema = z.object({
  verdict: z.enum(chunkRecallVerdicts),
  feedback: z.string().min(1),
  // At most two important ideas from the part they left out.
  missed: z.array(z.string().min(1)).max(2),
  // The part's main idea in one sentence, shown after the attempt.
  main_idea: z.string().min(1),
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

export const MIN_EXPLAIN_CHARS = 50;
export const MAX_EXPLAIN_CHARS = 15_000;

export const explainInputSchema = z
  .string()
  .trim()
  .min(MIN_EXPLAIN_CHARS, "Write at least a few sentences: say what it is, and why.")
  .max(MAX_EXPLAIN_CHARS, "That's longer than a teach-back needs. Keep it under about 2,500 words.");

// The five parts of a good explanation, in the order they're shown.
export const explainParts = ["claim", "why", "example", "limit", "so_what"] as const;

export const gradeExplainSchema = z.object({
  claim: explainPartSchema,
  why: explainPartSchema,
  example: explainPartSchema,
  limit: explainPartSchema,
  so_what: explainPartSchema,
  vague_parts: z.array(quotedIssueSchema),
  tighter_version: z.string().min(1),
  score: scoreSchema,
  // Questions a newcomer would ask about the explanation's biggest gaps.
  follow_ups: z.array(z.string().min(1)).min(1).max(2),
});

export const MAX_FOLLOW_UP_CHARS = 3000;

// A follow-up question, and once answered, the answer and the coach's reply.
export const followUpSchema = z.object({
  question: z.string().min(1),
  answer: z.string().nullable(),
  reply: z.string().nullable(),
  // Whether the answer filled the gap; null until answered.
  closed: z.boolean().nullable(),
});

// A saved explanation's feedback: Claude's grading, with the follow-ups
// kept alongside their answers.
export const explainRecordSchema = gradeExplainSchema.extend({
  follow_ups: z.array(followUpSchema).min(1).max(2),
});

export const followUpReplySchema = z.object({
  reply: z.string().min(1),
  closed: z.boolean(),
});

export type Score = z.infer<typeof scoreSchema>;
export type GradeDumpResult = z.infer<typeof gradeDumpSchema>;
export type DumpRecord = z.infer<typeof dumpRecordSchema>;
export type GradeAnswerResult = z.infer<typeof gradeAnswerSchema>;
export type ChunkRecallVerdict = (typeof chunkRecallVerdicts)[number];
export type GradeChunkRecallResult = z.infer<typeof gradeChunkRecallSchema>;
export type QuotedIssue = z.infer<typeof quotedIssueSchema>;
export type ExplainPart = z.infer<typeof explainPartSchema>;
export type GradeExplainResult = z.infer<typeof gradeExplainSchema>;
export type ExplainPartName = (typeof explainParts)[number];
export type FollowUp = z.infer<typeof followUpSchema>;
export type ExplainRecord = z.infer<typeof explainRecordSchema>;
export type FollowUpReply = z.infer<typeof followUpReplySchema>;
