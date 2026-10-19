import Anthropic from "@anthropic-ai/sdk";
import { suggestTopics } from "@/lib/ai/suggest";
import { requireSession } from "@/lib/auth";
import { studiedTopics } from "@/lib/discover";
import { suggestRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

// Topic ideas for one favourite area, building on what's been studied.
export async function POST(request: Request) {
  await requireSession();

  const parsed = suggestRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { area, exclude } = parsed.data;

  try {
    const { suggestions, usage } = await suggestTopics({ area, studied: await studiedTopics(), exclude });
    console.log(`suggest "${area}":`, usage);
    return Response.json({ suggestions });
  } catch (error) {
    console.error(`suggest "${area}" failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a moment and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't suggest topics. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
