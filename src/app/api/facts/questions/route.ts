import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { factQuestions } from "@/lib/ai/quick-facts";
import { requireSession } from "@/lib/auth";
import { favoriteAreas } from "@/lib/discover";
import { factQuestionsRead } from "@/lib/facts";
import { SURPRISE_AREA, areaInputSchema } from "@/lib/schemas";

export const maxDuration = 60;

// shown: questions already on screen, so "More questions" brings new ones.
const bodySchema = z.object({ area: areaInputSchema, shown: z.array(z.string().max(200)).max(40).default([]) });

// Curious questions for a topic (or "Surprise me"), leaving out ones already read.
export async function POST(request: Request) {
  await requireSession();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { area, shown } = parsed.data;

  try {
    const [favorites, alreadySeen] = await Promise.all([
      favoriteAreas(),
      factQuestionsRead(area === SURPRISE_AREA ? null : area),
    ]);
    const { questions, usage } = await factQuestions({ area, favorites, alreadySeen: [...shown, ...alreadySeen] });
    console.log("fact questions:", usage);
    return Response.json({ questions });
  } catch (error) {
    console.error("fact questions failed:", error);
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

function message(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "Claude is busy right now. Wait a minute and try again.";
  if (error instanceof Anthropic.APIError) return "Claude couldn't reply. Try again.";
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
