import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { judgeTerm } from "@/lib/ai/judge-term";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { matchTerm, type TermVerdict } from "@/lib/term-match";

export const maxDuration = 30;

const inputSchema = z.object({ answer: z.string().trim().max(200, "Keep it to a word or a few.") });

export type TermCheck = {
  verdict: TermVerdict;
  // Claude's one-line explanation, when it judged the answer.
  note: string | null;
  term: string;
  fullForm: string | null;
  example: string | null;
};

// Checks a term-quiz answer: a clear match is free, anything else is judged
// by Claude. A blank answer ("I don't know") just reveals the term. Nothing
// is saved: the term quiz is practice.
export async function POST(request: Request, { params }: RouteContext<"/api/terms/[id]/check">) {
  await requireSession();
  const { id } = await params;

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { answer } = parsed.data;

  const { data: term } = await db()
    .from("glossary_terms")
    .select("term, full_form, definition, example")
    .eq("id", id)
    .maybeSingle();
  if (!term) return Response.json({ error: "Term not found." }, { status: 404 });

  const reveal = { term: term.term, fullForm: term.full_form, example: term.example };
  const verdict = matchTerm(answer, term.term, term.full_form);
  if (verdict !== "wrong" || !answer) return Response.json({ verdict, note: null, ...reveal } satisfies TermCheck);

  try {
    const judged = await judgeTerm({ term: term.term, fullForm: term.full_form, definition: term.definition, answer });
    console.log(`judge term ${id}:`, judged.usage);
    return Response.json({ verdict: judged.correct ? "right" : "wrong", note: judged.note, ...reveal } satisfies TermCheck);
  } catch (error) {
    console.error(`judge term ${id} failed:`, error);
    // Still show the answer; the learner can count it as right themselves.
    const note =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy, so this wasn't checked. Count it as right if you meant the same thing."
        : "This couldn't be checked. Count it as right if you meant the same thing.";
    return Response.json({ verdict: "wrong", note, ...reveal } satisfies TermCheck);
  }
}
