import { requireSession } from "@/lib/auth";
import { exploreErrorResponse, startExploration } from "@/lib/explore";
import { exploreStartSchema } from "@/lib/schemas";

export const maxDuration = 60;

// Starts a chat from what you're curious about, with a short intro.
export async function POST(request: Request) {
  await requireSession();
  const parsed = exploreStartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    return Response.json({ exploration: await startExploration(parsed.data.question) });
  } catch (error) {
    return exploreErrorResponse(error, "explore start");
  }
}
