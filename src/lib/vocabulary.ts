import "server-only";
import { defineWord } from "@/lib/ai/vocabulary";
import type { Tables } from "@/lib/database.types";
import type { SaveWordInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export type VocabularyWord = Tables<"vocabulary_words">;

const UNIQUE_VIOLATION = "23505";

// Words practiced in one session; more can follow with "Keep going".
export const PRACTICE_SESSION_SIZE = 20;

export class WordError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// A case-insensitive exact match for PostgREST's ilike.
const exactly = (word: string) => word.replace(/[\\%_*]/g, (c) => `\\${c}`);

async function findWord(word: string) {
  const { data } = await db().from("vocabulary_words").select("id, word").ilike("word", exactly(word)).maybeSingle();
  return data;
}

/** Explains a word with Claude and saves it. Refuses words already in the list. */
export async function saveWord(input: SaveWordInput): Promise<VocabularyWord> {
  // Check before asking Claude, and again after, since Claude may change the form.
  const before = await findWord(input.word);
  if (before) throw new WordError(`"${before.word}" is already in your vocabulary.`, 409);

  const { result, usage } = await defineWord({ word: input.word, context: input.context });
  console.log(`define_word "${input.word}":`, usage);
  if (!result) {
    throw new WordError(`Couldn't find "${input.word}". Check the spelling, or try the whole phrase.`, 400);
  }

  const { data, error } = await db()
    .from("vocabulary_words")
    .insert({
      word: result.word,
      part_of_speech: result.part_of_speech,
      definition: result.definition,
      usage_note: result.usage_note,
      examples: result.examples,
      translation: result.translation,
      topic_id: input.topicId ?? null,
      context: input.context || null,
    })
    .select("*")
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    throw new WordError(`"${result.word}" is already in your vocabulary.`, 409);
  }
  if (error) throw new Error("Could not save the word. Try again.");
  return data;
}

/** Words due for practice, oldest first, one session's worth. */
export async function dueWords(now: Date = new Date()) {
  const { data } = await db()
    .from("vocabulary_words")
    .select("id, word")
    .lte("due_at", now.toISOString())
    .order("due_at")
    .limit(PRACTICE_SESSION_SIZE);
  return data ?? [];
}

/** How many words are due now, and when the next one falls due after that. */
export async function practiceOverview(now: Date = new Date()) {
  const supabase = db();
  const [{ count }, { data: next }] = await Promise.all([
    supabase.from("vocabulary_words").select("id", { count: "exact", head: true }).lte("due_at", now.toISOString()),
    supabase.from("vocabulary_words").select("due_at").gt("due_at", now.toISOString()).order("due_at").limit(1),
  ]);
  return { due: count ?? 0, nextDueAt: next?.[0]?.due_at ?? null };
}
