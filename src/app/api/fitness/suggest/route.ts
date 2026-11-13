import Anthropic from "@anthropic-ai/sdk";
import { suggestWorkoutsAi } from "@/lib/ai/workout";
import { requireSession } from "@/lib/auth";
import { listExercises, listWorkouts, recentFrom } from "@/lib/fitness";
import { localDate } from "@/lib/schedule";
import { aiWorkoutRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

// "Ask AI" on Fitness Today: workouts from your library for the time and
// equipment you have, after your last two weeks. Nothing is saved here.
export async function POST(request: Request) {
  await requireSession();
  const parsed = aiWorkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const today = localDate();
  const [library, recent] = await Promise.all([listExercises(), listWorkouts(recentFrom(today), today)]);
  try {
    const { workouts, usage } = await suggestWorkoutsAi(parsed.data, library, recent, today);
    console.log("workout suggestions:", usage);
    return Response.json({ workouts });
  } catch (error) {
    console.error("workout suggestions failed:", error);
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
}
