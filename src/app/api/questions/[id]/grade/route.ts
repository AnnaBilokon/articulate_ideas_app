import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { gradeAnswer } from "@/lib/ai/grade-answer";
import { requireSession } from "@/lib/auth";
import type { GradeAnswerResult } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const bodySchema = z.object({
  answer: z.string().trim().max(5000, "Keep the answer under about 800 words."),
  confidence: z.int().min(1).max(3),
  mode: z.enum(["quiz", "review"]),
  durationSec: z.int().min(0).max(24 * 60 * 60).optional(),
});

export type GradeResponse = GradeAnswerResult & {
  attemptId: string;
  keyPoints: string[];
  // Sure (confidence 3) but scored 0-2: the hypercorrection case.
  confidentMiss: boolean;
};

// Grades one answer to a recall question and saves it as an attempt.
export async function POST(request: Request, { params }: RouteContext<"/api/questions/[id]/grade">) {
  await requireSession();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { answer, confidence, mode, durationSec } = parsed.data;

  const supabase = db();
  const { data: question } = await supabase
    .from("recall_questions")
    .select("text, key_points")
    .eq("id", id)
    .maybeSingle();
  if (!question) return Response.json({ error: "Question not found." }, { status: 404 });

  try {
    // A blank answer is a 0 by the rubric; no need to ask Claude.
    const result: GradeAnswerResult = answer
      ? (await gradeAnswer({ question: question.text, keyPoints: question.key_points, answer })).result
      : {
          score: 0,
          points_hit: [],
          points_missed: question.key_points,
          feedback: "No answer this time. Read the key points below; it will come back so you can try again.",
          mistake_cause: "no answer",
        };

    const { data: attempt, error } = await supabase
      .from("attempts")
      .insert({
        question_id: id,
        mode,
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

    const response: GradeResponse = {
      ...result,
      attemptId: attempt.id,
      keyPoints: question.key_points,
      confidentMiss: confidence === 3 && result.score <= 2,
    };
    return Response.json(response);
  } catch (error) {
    console.error(`grade ${id} failed:`, error);
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
