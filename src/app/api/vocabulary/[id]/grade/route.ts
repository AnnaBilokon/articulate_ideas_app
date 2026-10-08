import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { GradeResponse } from "@/app/api/questions/[id]/grade/route";
import { gradeAnswer } from "@/lib/ai/grade-answer";
import { requireSession } from "@/lib/auth";
import { practicePrompt, type GradeAnswerResult } from "@/lib/schemas";
import { nextReview } from "@/lib/schedule";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const bodySchema = z.object({
  answer: z.string().trim().max(5000, "Keep the answer under about 800 words."),
  confidence: z.int().min(1).max(3),
  durationSec: z.int().min(0).max(24 * 60 * 60).optional(),
});

// Grades a practice answer for a word (its meaning, and a sentence using it),
// saves it, and sets when the word comes back. Same response as a quiz answer.
export async function POST(request: Request, { params }: RouteContext<"/api/vocabulary/[id]/grade">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { answer, confidence, durationSec } = parsed.data;

  const supabase = db();
  const { data: word } = await supabase
    .from("vocabulary_words")
    .select("word, definition, step, interval_days, due_at, last_score")
    .eq("id", id)
    .maybeSingle();
  if (!word) return Response.json({ error: "Word not found." }, { status: 404 });

  // The answer key: the meaning, and using the word correctly.
  const keyPoints = [`Meaning: ${word.definition}`, `Uses "${word.word}" correctly in a sentence of their own`];

  try {
    const result: GradeAnswerResult = answer
      ? (await gradeAnswer({ question: practicePrompt(word.word), keyPoints, answer })).result
      : {
          score: 0,
          points_hit: [],
          points_missed: keyPoints,
          feedback: "No answer this time. Read the meaning below; the word will come back tomorrow.",
          mistake_cause: "no answer",
        };

    const { data: attempt, error } = await supabase
      .from("vocabulary_attempts")
      .insert({
        word_id: id,
        answer,
        confidence,
        score: result.score,
        duration_sec: durationSec ?? null,
        feedback: {
          points_hit: result.points_hit,
          points_missed: result.points_missed,
          feedback: result.feedback,
          mistake_cause: result.mistake_cause,
        },
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not save your answer. Try again.");

    // A word never practiced has no schedule yet: its first answer starts one.
    const current =
      word.last_score === null ? null : { step: word.step, interval_days: word.interval_days, due_at: word.due_at };
    const schedule = nextReview(current, result.score, confidence);
    const { error: scheduleError } = await supabase.from("vocabulary_words").update(schedule).eq("id", id);
    if (scheduleError) console.error(`schedule word ${id} failed:`, scheduleError);

    const response: GradeResponse = {
      ...result,
      attemptId: attempt.id,
      keyPoints,
      confidentMiss: confidence === 3 && result.score <= 2,
      dueAt: schedule.due_at,
    };
    return Response.json(response);
  } catch (error) {
    console.error(`grade word ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a moment and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't grade this answer. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
