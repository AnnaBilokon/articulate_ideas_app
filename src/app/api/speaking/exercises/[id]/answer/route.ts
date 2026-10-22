import { requireSession } from "@/lib/auth";
import { speakingAnswerSchema } from "@/lib/schemas";
import { answerSpeakingExercise } from "@/lib/speaking";
import { speakingErrorResponse } from "../../../respond";

export const maxDuration = 60;

// The answer to an exercise: feedback, an improved version, expressions and
// a follow-up question.
export async function POST(request: Request, { params }: RouteContext<"/api/speaking/exercises/[id]/answer">) {
  await requireSession();
  const { id } = await params;
  const parsed = speakingAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    return Response.json({ exercise: await answerSpeakingExercise(id, parsed.data) });
  } catch (error) {
    return speakingErrorResponse(error, `speaking answer ${id}`);
  }
}
