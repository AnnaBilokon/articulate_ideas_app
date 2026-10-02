import { z } from "zod";

// Output of the research_and_lesson call.

export const MAX_CHUNK_WORDS = 400;

const wordCount = (text: string) => text.trim().split(/\s+/).length;

export const answeredQuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const lessonChunkSchema = z.object({
  title: z.string().min(1),
  content: z
    .string()
    .min(1)
    .refine((text) => wordCount(text) <= MAX_CHUNK_WORDS, {
      message: `Chunk must be at most ${MAX_CHUNK_WORDS} words`,
    }),
});

export const sourceSchema = z.object({
  url: z.url(),
  title: z.string().min(1),
});

export const lessonSchema = z.object({
  // Answers to the questions the user asked, in the same order.
  answers: z.array(answeredQuestionSchema),
  // Questions Claude thinks the user should also ask, with answers.
  suggested_questions: z.array(answeredQuestionSchema).max(3),
  chunks: z.array(lessonChunkSchema).min(1),
  sources: z.array(sourceSchema).min(1),
});

export type AnsweredQuestion = z.infer<typeof answeredQuestionSchema>;
export type LessonChunk = z.infer<typeof lessonChunkSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
