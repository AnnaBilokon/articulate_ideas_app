import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase";

// Removes a word, with its practice history.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/vocabulary/[id]">) {
  await requireSession();
  const { id } = await params;
  const { error } = await db().from("vocabulary_words").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not remove the word. Try again." }, { status: 500 });
  return Response.json({ status: "deleted" });
}
