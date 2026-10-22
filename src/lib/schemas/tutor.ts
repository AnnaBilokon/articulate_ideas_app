import { z } from "zod";

// Socratic tutor conversations, turn by turn.

/** The tutor wraps up by about 8 answers; after this many it always does. */
export const MAX_TUTOR_ANSWERS = 12;
export const MAX_TUTOR_MESSAGE_CHARS = 2000;

export const tutorMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("tutor"), reply: z.string(), question: z.string().nullable() }),
  z.object({ role: z.literal("learner"), kind: z.enum(["answer", "hint", "finish"]), text: z.string() }),
]);

export type TutorMessage = z.infer<typeof tutorMessageSchema>;

export const tutorTurnInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("answer"),
    text: z
      .string()
      .trim()
      .min(1, "Write an answer, or ask for a hint.")
      .max(MAX_TUTOR_MESSAGE_CHARS, "Keep it shorter: a few sentences is plenty."),
  }),
  z.object({ kind: z.literal("hint") }),
  z.object({ kind: z.literal("finish") }),
]);

export type TutorSession = {
  id: string;
  messages: TutorMessage[];
  done: boolean;
  summary: string[] | null;
};

export const parseTutorMessages = (raw: unknown): TutorMessage[] => {
  const parsed = z.array(tutorMessageSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
};
