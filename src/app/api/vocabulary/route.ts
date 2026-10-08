import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth";
import { saveWordSchema } from "@/lib/schemas";
import { WordError, saveWord } from "@/lib/vocabulary";

export const maxDuration = 60;

// Adds a word to the vocabulary, typed in or saved from a lesson, with
// Claude's definition, usage, examples and translation.
export async function POST(request: Request) {
  await requireSession();

  const parsed = saveWordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    return Response.json({ word: await saveWord(parsed.data) });
  } catch (error) {
    if (error instanceof WordError) {
      return Response.json({ error: error.message, existing: error.existing }, { status: error.status });
    }
    console.error(`save word "${parsed.data.word}" failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a moment and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't explain this word. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
