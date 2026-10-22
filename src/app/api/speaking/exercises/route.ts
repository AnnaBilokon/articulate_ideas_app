import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { startSpeakingExercise } from "@/lib/speaking";
import { speakingErrorResponse } from "../respond";

export const maxDuration = 60;

const bodySchema = z.object({ topic: z.string().trim().min(1).max(60) });

// Makes the next speaking exercise on a topic.
export async function POST(request: Request) {
  await requireSession();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pick a topic." }, { status: 400 });
  try {
    return Response.json({ id: await startSpeakingExercise(parsed.data.topic) });
  } catch (error) {
    return speakingErrorResponse(error, "speaking exercise");
  }
}
