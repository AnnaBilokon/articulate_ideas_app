import { requireSession } from "@/lib/auth";
import { tutorTurnInputSchema } from "@/lib/schemas";
import { continueTutor, tutorErrorResponse } from "@/lib/tutor";

export const maxDuration = 60;

// One learner turn in a tutor conversation: an answer, a hint request, or
// asking to finish. Returns the conversation with the tutor's reply.
export async function POST(request: Request, { params }: RouteContext<"/api/tutor/[id]">) {
  await requireSession();
  const { id } = await params;

  const parsed = tutorTurnInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const input = parsed.data;

  try {
    const session = await continueTutor(id, {
      role: "learner",
      kind: input.kind,
      text: input.kind === "answer" ? input.text : "",
    });
    return Response.json({ session });
  } catch (error) {
    return tutorErrorResponse(error, `tutor ${id}`);
  }
}
