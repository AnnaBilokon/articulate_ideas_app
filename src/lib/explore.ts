import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { exploreIntro, exploreNote, exploreReply } from "@/lib/ai/explore";
import { favoriteAreas } from "@/lib/discover";
import { startOfDay } from "@/lib/schedule";
import {
  CHECK_EVERY,
  MAX_EXPLORE_TURNS,
  exploreNoteSchema,
  exploreReviewDraftSchema,
  parseExploreMessages,
  type ExploreMessage,
  type ExploreReviewDraft,
  type Exploration,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Explore chats: start one from a question, talk it through, save a note to
// the knowledge base, and add the review questions you pick.

export class ExploreError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const COLUMNS = "id, created_at, updated_at, question, title, area, messages, note, review_drafts, saved_at, recall_questions(text)";

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  question: string;
  title: string;
  area: string;
  messages: unknown;
  note: unknown;
  review_drafts: unknown;
  saved_at: string | null;
  recall_questions: { text: string }[];
};

const draftsOf = (raw: unknown): ExploreReviewDraft[] => {
  const parsed = z.array(exploreReviewDraftSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
};

function toExploration(r: Row): Exploration {
  const note = exploreNoteSchema.safeParse(r.note);
  const added = new Set(r.recall_questions.map((q) => q.text));
  return {
    id: r.id,
    createdAt: r.created_at,
    question: r.question,
    title: r.title,
    area: r.area,
    messages: parseExploreMessages(r.messages),
    note: note.success ? note.data : null,
    reviewDrafts: draftsOf(r.review_drafts).map((d) => ({ text: d.text, inReviews: added.has(d.text) })),
    savedAt: r.saved_at,
    // Messages added after saving change updated_at but not saved_at.
    noteBehind: r.saved_at !== null && new Date(r.updated_at).getTime() > new Date(r.saved_at).getTime(),
  };
}

export async function getExploration(id: string): Promise<Exploration | null> {
  const { data } = await db().from("explorations").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toExploration(data) : null;
}

/** Every chat, newest first. */
export async function listExplorations(limit?: number): Promise<Exploration[]> {
  let query = db().from("explorations").select(COLUMNS).order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []).map(toExploration);
}

/** Starts a chat with a short intro to what you're curious about. */
export async function startExploration(question: string): Promise<Exploration> {
  const { intro, usage } = await exploreIntro({ question, favorites: await favoriteAreas() });
  console.log("explore start:", usage);
  const messages: ExploreMessage[] = [{ role: "claude", text: intro.intro, suggestions: intro.suggestions, check: null }];
  const { data, error } = await db()
    .from("explorations")
    .insert({ question, title: intro.title, area: intro.area, messages })
    .select(COLUMNS)
    .single();
  if (error) throw new ExploreError("Could not save the chat. Try again.", 500);
  return toExploration(data);
}

/** Adds your message, gets Claude's reply, and saves both. */
export async function continueExploration(id: string, message: Extract<ExploreMessage, { role: "you" }>): Promise<Exploration> {
  const row = await getExploration(id);
  if (!row) throw new ExploreError("Chat not found.", 404);
  const yours = row.messages.filter((m) => m.role === "you");
  if (yours.length >= MAX_EXPLORE_TURNS) throw new ExploreError("This chat is long enough. Save it, then start a new one.");

  // A check question is offered after a few of your messages, never twice in a row.
  const lastCheck = row.messages.findLastIndex((m) => m.role === "claude" && m.check !== null);
  const sinceCheck = row.messages.slice(lastCheck + 1).filter((m) => m.role === "you").length + 1;
  const offerCheck = message.kind === "ask" && sinceCheck >= CHECK_EVERY;

  const messages = [...row.messages, message];
  const { reply, usage } = await exploreReply({ title: row.title, messages, offerCheck });
  console.log(`explore ${id}:`, usage);
  messages.push({ role: "claude", text: reply.reply, suggestions: reply.suggestions, check: reply.check });

  const { data, error } = await db()
    .from("explorations")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new ExploreError("Could not save the chat. Try again.", 500);
  return toExploration(data);
}

/** "Save to my knowledge": a note of the chat, with review questions to pick from. */
export async function saveExploration(id: string): Promise<Exploration> {
  const row = await getExploration(id);
  if (!row) throw new ExploreError("Chat not found.", 404);
  if (!row.messages.some((m) => m.role === "you")) throw new ExploreError("Ask something first, then save what you explored.");

  const { note, usage } = await exploreNote({ title: row.title, messages: row.messages });
  console.log(`explore note ${id}:`, usage);
  const { review_questions, ...rest } = note;
  // Questions already in the reviews stay offered, so saving again keeps them ticked.
  const kept = row.reviewDrafts.filter((d) => d.inReviews).map((d) => d.text);
  const { data: existing } = await db().from("recall_questions").select("text, key_points, type").eq("exploration_id", id);
  const drafts = [
    ...(existing ?? []).filter((q) => kept.includes(q.text)).flatMap((q) => draftsOf([q])),
    ...review_questions.filter((q) => !kept.includes(q.text)),
  ];

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("explorations")
    .update({ note: rest, review_drafts: drafts, saved_at: now, updated_at: now })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new ExploreError("Could not save the note. Try again.", 500);
  return toExploration(data);
}

/** Adds the picked review questions; they come back from tomorrow. */
export async function addExplorationReviews(id: string, picks: number[]): Promise<Exploration> {
  const supabase = db();
  const { data: row } = await supabase.from("explorations").select(COLUMNS).eq("id", id).maybeSingle();
  if (!row) throw new ExploreError("Chat not found.", 404);
  const drafts = draftsOf(row.review_drafts);
  const added = new Set(row.recall_questions.map((q) => q.text));
  const fresh = [...new Set(picks)].flatMap((i) => (drafts[i] && !added.has(drafts[i].text) ? [drafts[i]] : []));
  if (fresh.length === 0) return toExploration(row);

  const { data: questions, error } = await supabase
    .from("recall_questions")
    .insert(fresh.map((d, i) => ({ exploration_id: id, position: added.size + i, ...d })))
    .select("id, text");
  if (error || !questions) {
    console.error(`explore ${id} to review failed:`, error);
    throw new ExploreError("Could not add them to your reviews. Try again.", 500);
  }
  const due_at = startOfDay(new Date(), 1).toISOString();
  const { error: scheduleError } = await supabase
    .from("review_state")
    .insert(questions.map((q) => ({ question_id: q.id, due_at, step: 0, interval_days: 1 })));
  if (scheduleError) console.error(`explore ${id} schedule failed:`, scheduleError);

  return toExploration({ ...row, recall_questions: [...row.recall_questions, ...questions] });
}

export function exploreErrorResponse(error: unknown, label: string): Response {
  if (error instanceof ExploreError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${label} failed:`, error);
  const message =
    error instanceof Anthropic.RateLimitError
      ? "Claude is busy right now. Wait a minute and try again."
      : error instanceof Anthropic.APIError
        ? "Claude couldn't reply. Try again."
        : error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status: 500 });
}
