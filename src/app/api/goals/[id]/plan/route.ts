import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { goalPlan } from "@/lib/ai/goal-plan";
import { requireSession } from "@/lib/auth";
import { getGoal } from "@/lib/goals";
import { localDate } from "@/lib/schedule";
import { goalPlanAnswersSchema } from "@/lib/schemas";

export const maxDuration = 60;

// No answers yet: Claude may ask questions first. With answers: a plan.
const bodySchema = z.object({ answers: goalPlanAnswersSchema.nullable() });

// "AI helps": questions about a goal, or a plan of steps for it, from the goal
// as it's saved. Runs only when the button is pressed; nothing is saved here.
export async function POST(request: Request, { params }: RouteContext<"/api/goals/[id]/plan">) {
  await requireSession();
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Goal not found." }, { status: 404 });
  const goal = await getGoal(id);
  if (!goal) return Response.json({ error: "Goal not found." }, { status: 404 });

  try {
    const { plan, usage } = await goalPlan(goal, parsed.data.answers, Number(localDate().slice(0, 4)));
    console.log("goal plan:", usage);
    return Response.json({ plan });
  } catch (error) {
    console.error(`goal plan ${id} failed:`, error);
    const message =
      error instanceof Anthropic.RateLimitError
        ? "Claude is busy right now. Wait a minute and try again."
        : error instanceof Anthropic.APIError
          ? "Claude couldn't reply. Try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
