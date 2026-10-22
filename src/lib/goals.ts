import "server-only";
import { goalProgress, type GoalStatus } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Goals and achievements for the Growth workspace.

export type GoalStep = { id: string; title: string; doneAt: string | null };
export type GoalNote = { id: string; createdAt: string; body: string };

export type GoalSummary = {
  id: string;
  createdAt: string;
  title: string;
  why: string | null;
  status: GoalStatus;
  targetDate: string | null;
  metricTarget: number | null;
  metricCurrent: number;
  metricUnit: string | null;
  achievedAt: string | null;
  stepsDone: number;
  stepsTotal: number;
  /** 0-1, by the number if there is one, else by the steps; null with neither. */
  progress: number | null;
};

export type Goal = GoalSummary & { steps: GoalStep[]; notes: GoalNote[] };

export type Achievement = {
  id: string;
  achievedOn: string;
  title: string;
  note: string | null;
  goalId: string | null;
  goalTitle: string | null;
  fromGoal: boolean;
};

const GOAL_COLUMNS =
  "id, created_at, title, why, status, target_date, metric_target, metric_current, metric_unit, achieved_at, goal_steps(id, title, position, done_at)";

type GoalRow = {
  id: string;
  created_at: string;
  title: string;
  why: string | null;
  status: string;
  target_date: string | null;
  metric_target: number | null;
  metric_current: number;
  metric_unit: string | null;
  achieved_at: string | null;
  goal_steps: { id: string; title: string; position: number; done_at: string | null }[];
};

function fromRow(r: GoalRow): { summary: GoalSummary; steps: GoalStep[] } {
  const steps = [...r.goal_steps]
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map((s) => ({ id: s.id, title: s.title, doneAt: s.done_at }));
  const counts = { stepsDone: steps.filter((s) => s.doneAt).length, stepsTotal: steps.length };
  const metric = {
    metricTarget: r.metric_target === null ? null : Number(r.metric_target),
    metricCurrent: Number(r.metric_current),
  };
  const summary: GoalSummary = {
    id: r.id,
    createdAt: r.created_at,
    title: r.title,
    why: r.why,
    status: r.status as GoalStatus,
    targetDate: r.target_date,
    ...metric,
    metricUnit: r.metric_unit,
    achievedAt: r.achieved_at,
    ...counts,
    progress: goalProgress({ ...metric, ...counts }),
  };
  return { summary, steps };
}

/** Every goal, newest first. */
export async function listGoals(): Promise<GoalSummary[]> {
  const { data } = await db().from("goals").select(GOAL_COLUMNS).order("created_at", { ascending: false });
  return (data ?? []).map((r) => fromRow(r).summary);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const [{ data }, { data: notes }] = await Promise.all([
    db().from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle(),
    db().from("goal_notes").select("id, created_at, body").eq("goal_id", id).order("created_at", { ascending: false }),
  ]);
  if (!data) return null;
  const { summary, steps } = fromRow(data);
  return {
    ...summary,
    steps,
    notes: (notes ?? []).map((n) => ({ id: n.id, createdAt: n.created_at, body: n.body })),
  };
}

/** Achievements, most recent first. */
export async function listAchievements(): Promise<Achievement[]> {
  const { data } = await db()
    .from("achievements")
    .select("id, achieved_on, title, note, goal_id, from_goal, goals(title)")
    .order("achieved_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    achievedOn: a.achieved_on,
    title: a.title,
    note: a.note,
    goalId: a.goal_id,
    goalTitle: a.goals?.title ?? null,
    fromGoal: a.from_goal,
  }));
}
