import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { exploreErrorResponse, saveExploration } from "@/lib/explore";

export const maxDuration = 60;

// "Save to my knowledge": writes a note of the chat, with review questions to
// pick from. Saving again after more chat brings the note up to date.
export async function POST(_request: Request, { params }: RouteContext<"/api/explore/[id]/save">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Chat not found." }, { status: 404 });

  try {
    return Response.json({ exploration: await saveExploration(id) });
  } catch (error) {
    return exploreErrorResponse(error, `explore save ${id}`);
  }
}
