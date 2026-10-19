import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase";

// Removes a saved question.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/saved-questions/[id]">) {
  await requireSession();
  const { id } = await params;

  const { error } = await db().from("saved_questions").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not remove the question. Try again." }, { status: 500 });
  return Response.json({ ok: true });
}
