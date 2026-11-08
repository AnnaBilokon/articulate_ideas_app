import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { quickFact } from "@/lib/ai/quick-facts";
import { requireSession } from "@/lib/auth";
import { FACT_COLUMNS, toFact } from "@/lib/facts";
import { areaInputSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const bodySchema = z.object({ area: areaInputSchema, question: z.string().trim().min(1).max(200) });

// The short answer to a picked question, saved at once: every fact read goes
// into the Library.
export async function POST(request: Request) {
  await requireSession();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { area, question } = parsed.data;

  try {
    const { reply, usage } = await quickFact({ area, question });
    console.log("quick fact:", usage);
    const { data, error } = await db()
      .from("quick_facts")
      .insert({ area, question, fact: reply.fact, why_interesting: reply.why_interesting, review_draft: reply.review_question })
      .select(FACT_COLUMNS)
      .single();
    if (error) throw new Error("Could not save the fact. Try again.");
    return Response.json({ fact: toFact(data) });
  } catch (error) {
    console.error("quick fact failed:", error);
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
