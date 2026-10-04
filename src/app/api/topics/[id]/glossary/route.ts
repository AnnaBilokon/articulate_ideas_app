import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth";
import { addTerm, ensureGlossary } from "@/lib/glossary";
import { newTermInputSchema } from "@/lib/schemas";

export const maxDuration = 120;

function errorResponse(id: string, error: unknown) {
  console.error(`glossary ${id} failed:`, error);
  const message =
    error instanceof Anthropic.RateLimitError
      ? "Claude is busy right now. Wait a moment and try again."
      : error instanceof Anthropic.APIError
        ? "Claude couldn't write the glossary. Try again."
        : error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status: 500 });
}

// Builds the glossary from the lesson (new topics get it in the background;
// this is for older topics and retries).
export async function POST(_request: Request, { params }: RouteContext<"/api/topics/[id]/glossary">) {
  await requireSession();
  const { id } = await params;
  try {
    return Response.json({ status: await ensureGlossary(id) });
  } catch (error) {
    return errorResponse(id, error);
  }
}

// Adds one term the learner wants explained.
export async function PUT(request: Request, { params }: RouteContext<"/api/topics/[id]/glossary">) {
  await requireSession();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { term?: unknown } | null;
  const parsed = newTermInputSchema.safeParse(body?.term);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    return Response.json({ term: await addTerm(id, parsed.data) });
  } catch (error) {
    return errorResponse(id, error);
  }
}
