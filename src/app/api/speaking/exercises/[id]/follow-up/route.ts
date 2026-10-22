import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { speakingAnswerSchema } from "@/lib/schemas";
import { followUpSpeakingExercise } from "@/lib/speaking";
import { speakingErrorResponse } from "../../../respond";

export const maxDuration = 60;

const bodySchema = z.union([speakingAnswerSchema, z.object({ skip: z.literal(true) })]);

// The follow-up answer (or skipping it), which completes the exercise.
export async function POST(request: Request, { params }: RouteContext<"/api/speaking/exercises/[id]/follow-up">) {
  await requireSession();
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Say or type an answer first." }, { status: 400 });
  try {
    const answer = "skip" in parsed.data ? null : parsed.data;
    return Response.json({ exercise: await followUpSpeakingExercise(id, answer) });
  } catch (error) {
    return speakingErrorResponse(error, `speaking follow-up ${id}`);
  }
}
