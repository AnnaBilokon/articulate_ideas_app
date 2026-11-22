import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { addExplorationReviews, exploreErrorResponse } from "@/lib/explore";
import { exploreReviewsInputSchema } from "@/lib/schemas";

// Adds the review questions you picked from the note; they come back from tomorrow.
export async function POST(request: Request, { params }: RouteContext<"/api/explore/[id]/reviews">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Chat not found." }, { status: 404 });

  const parsed = exploreReviewsInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    return Response.json({ exploration: await addExplorationReviews(id, parsed.data.picks) });
  } catch (error) {
    return exploreErrorResponse(error, `explore reviews ${id}`);
  }
}
