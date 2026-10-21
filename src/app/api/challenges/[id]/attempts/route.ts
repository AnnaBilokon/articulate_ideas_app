import { requireSession } from "@/lib/auth";
import {
  scoreSpotMistake,
  scoreTwoTruths,
  spotMistakeAnswerSchema,
  spotMistakeContentSchema,
  twoTruthsAnswerSchema,
  twoTruthsContentSchema,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Scores an attempt at a challenge from its answer key (no Claude), saves it,
// and returns the score with the answer key revealed.
export async function POST(request: Request, { params }: RouteContext<"/api/challenges/[id]/attempts">) {
  await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const supabase = db();
  const { data: challenge } = await supabase.from("challenges").select("kind, content").eq("id", id).maybeSingle();
  if (!challenge) return Response.json({ error: "Challenge not found." }, { status: 404 });

  let scored: { score: number; result: unknown };
  if (challenge.kind === "spot_mistake") {
    const answer = spotMistakeAnswerSchema.safeParse(body);
    const content = spotMistakeContentSchema.safeParse(challenge.content);
    if (!answer.success) return Response.json({ error: "Pick the sentences you think are wrong." }, { status: 400 });
    if (!content.success) return Response.json({ error: "This challenge is damaged. Make a new one." }, { status: 500 });
    scored = scoreSpotMistake(content.data, answer.data.flagged);
  } else if (challenge.kind === "two_truths") {
    const answer = twoTruthsAnswerSchema.safeParse(body);
    const content = twoTruthsContentSchema.safeParse(challenge.content);
    if (!answer.success) return Response.json({ error: "Pick the lie in every round." }, { status: 400 });
    if (!content.success) return Response.json({ error: "This challenge is damaged. Make a new one." }, { status: 500 });
    scored = scoreTwoTruths(content.data, answer.data.picks);
  } else {
    return Response.json({ error: "Unknown kind of challenge." }, { status: 400 });
  }

  const { error } = await supabase
    .from("challenge_attempts")
    .insert({ challenge_id: id, answer: body, score: scored.score, result: scored.result as never });
  if (error) return Response.json({ error: "Could not save your answer. Try again." }, { status: 500 });
  return Response.json(scored);
}
