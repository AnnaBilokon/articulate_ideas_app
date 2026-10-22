import Anthropic from "@anthropic-ai/sdk";
import { reframeHelp } from "@/lib/ai/reframe";
import { requireSession } from "@/lib/auth";
import { beliefSchema } from "@/lib/schemas";

export const maxDuration = 60;

const bodySchema = beliefSchema.pick({ belief: true, origin: true, evidenceAgainst: true, reframe: true });

// "Help me reframe": questions and kinder ways to put a belief, from what's
// written so far (saved or not). Runs only when the button is pressed.
export async function POST(request: Request) {
  await requireSession();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const { help, usage } = await reframeHelp({
      belief: parsed.data.belief,
      origin: parsed.data.origin || null,
      evidenceAgainst: parsed.data.evidenceAgainst || null,
      reframe: parsed.data.reframe || null,
    });
    console.log("reframe help:", usage);
    return Response.json({ help });
  } catch (error) {
    console.error("reframe help failed:", error);
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
