import { requireSession } from "@/lib/auth";
import { saveSpeakingExpressionSchema } from "@/lib/schemas";
import { saveSpeakingExpression } from "@/lib/speaking";
import { speakingErrorResponse } from "../respond";

// Saves an expression from feedback to the Speaking tab's list. 409 when
// it's there already.
export async function POST(request: Request) {
  await requireSession();
  const parsed = saveSpeakingExpressionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That expression can't be saved." }, { status: 400 });
  try {
    if (!(await saveSpeakingExpression(parsed.data))) {
      return Response.json({ error: "Already in your expressions." }, { status: 409 });
    }
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) {
    return speakingErrorResponse(error, "speaking expression");
  }
}
