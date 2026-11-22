import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { continueExploration, exploreErrorResponse } from "@/lib/explore";
import { exploreTurnInputSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

// One message in a chat: a question, or an answer to a check-yourself question.
export async function POST(request: Request, { params }: RouteContext<"/api/explore/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Chat not found." }, { status: 404 });

  const parsed = exploreTurnInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const exploration = await continueExploration(id, { role: "you", kind: parsed.data.kind, text: parsed.data.text });
    return Response.json({ exploration });
  } catch (error) {
    return exploreErrorResponse(error, `explore ${id}`);
  }
}

// Deletes a chat, its note and its review questions.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/explore/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Chat not found." }, { status: 404 });
  const { error } = await db().from("explorations").delete().eq("id", id);
  if (error) {
    console.error(`explore ${id} delete failed:`, error);
    return Response.json({ error: "Could not delete the chat. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
