import { z } from "zod";

// Vocabulary: what the learner sends to save a word, and what define_word returns.

export const MAX_WORD_CHARS = 60;
export const MAX_WORD_WORDS = 6;
export const MAX_CONTEXT_CHARS = 1000;

// The language of each entry's translation.
export const TRANSLATION_LANGUAGE = "Ukrainian";

export const saveWordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "Type a word or phrase.")
    .max(MAX_WORD_CHARS, "That's too long for a word list. Pick a word or a short phrase.")
    .refine((w) => w.split(/\s+/).length <= MAX_WORD_WORDS, "Pick a word or a short phrase, up to 6 words."),
  // Set when saved from a lesson: the topic and the sentence it was in.
  topicId: z.uuid().optional(),
  context: z.string().trim().max(MAX_CONTEXT_CHARS).optional(),
});

// A word Claude recognized and explained. (When it doesn't recognize the
// input as a word, the other fields are left empty and not checked.)
export const defineWordSchema = z.object({
  word: z.string().min(1).max(100),
  part_of_speech: z.string().min(1).nullable(),
  definition: z.string().min(1),
  usage_note: z.string().min(1).nullable(),
  examples: z.array(z.string().min(1)).min(2).max(3),
  translation: z.string().min(1),
});

/** The practice question for a word. */
export const practicePrompt = (word: string) => `What does "${word}" mean? Use it in a sentence of your own.`;

export type SaveWordInput = z.infer<typeof saveWordSchema>;
export type DefineWordResult = z.infer<typeof defineWordSchema>;
