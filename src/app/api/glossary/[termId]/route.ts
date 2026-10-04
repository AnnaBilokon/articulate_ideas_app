import { requireSession } from "@/lib/auth";
import { db } from "@/lib/supabase";

// Removes one glossary term.
export async function DELETE(_request: Request, { params }: RouteContext<"/api/glossary/[termId]">) {
  await requireSession();
  const { termId } = await params;
  const { error } = await db().from("glossary_terms").delete().eq("id", termId);
  if (error) return Response.json({ error: "Could not remove the term. Try again." }, { status: 500 });
  return Response.json({ status: "deleted" });
}
