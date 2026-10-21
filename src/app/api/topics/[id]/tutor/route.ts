import { requireSession } from "@/lib/auth";
import { startTutor, tutorErrorResponse } from "@/lib/tutor";

export const maxDuration = 60;

// Starts a new tutor conversation on the topic.
export async function POST(_request: Request, { params }: RouteContext<"/api/topics/[id]/tutor">) {
  await requireSession();
  const { id } = await params;
  try {
    return Response.json({ session: await startTutor(id) });
  } catch (error) {
    return tutorErrorResponse(error, `tutor start ${id}`);
  }
}
