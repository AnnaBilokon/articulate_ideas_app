"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { localDate } from "@/lib/schedule";
import {
  MAX_GOAL_STEPS,
  MAX_STEP_ITEMS,
  achievementSchema,
  goalNoteSchema,
  goalSchema,
  goalStatuses,
  goalStepTitleSchema,
  newGoalSchema,
  type AchievementInput,
  type GoalInput,
  type GoalStatus,
  type NewGoalInput,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Goals, their steps, numbers and notes, and achievements.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh(goalId?: string) {
  revalidatePath("/");
  revalidatePath("/growth/goals");
  revalidatePath("/growth/achievements");
  if (goalId) revalidatePath(`/growth/goals/${goalId}`);
}

const goalColumns = (g: GoalInput) => ({
  title: g.title,
  why: g.why || null,
  target_year: g.targetYear,
  metric_target: g.metricTarget,
  metric_unit: g.metricTarget === null ? null : g.metricUnit || null,
  color: g.color,
});

export async function createGoal(input: NewGoalInput): Promise<Result & { id?: string }> {
  await requireSession();
  const parsed = newGoalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // A new goal goes last; drag it up if it comes first.
  const { data: last } = await db().from("goals").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db()
    .from("goals")
    .insert({ ...goalColumns(parsed.data), position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return { error: "Could not save the goal. Try again." };
  if (parsed.data.steps.length > 0) {
    const { error: stepsError } = await db()
      .from("goal_steps")
      .insert(parsed.data.steps.map((title, position) => ({ goal_id: data.id, title, position })));
    if (stepsError) return { error: "The goal is saved, but its steps weren't. Add them on the goal.", id: data.id };
  }
  refresh();
  return { error: null, id: data.id };
}

export async function updateGoal(id: string, input: GoalInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Goal not found." };
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db()
    .from("goals")
    .update({ ...goalColumns(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save the goal. Try again." };
  refresh(id);
  return { error: null };
}

/** Saves the order of goals dragged on the Goals page: the first id comes first. */
export async function reorderGoals(ids: string[]): Promise<Result> {
  await requireSession();
  const parsed = z.array(z.uuid()).max(500).safeParse(ids);
  if (!parsed.success) return { error: "Could not save the order. Try again." };
  const results = await Promise.all(parsed.data.map((id, position) => db().from("goals").update({ position }).eq("id", id)));
  if (results.some((r) => r.error)) return { error: "Could not save the order. Try again." };
  refresh();
  return { error: null };
}

export async function deleteGoal(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Goal not found." };
  const { error } = await db().from("goals").delete().eq("id", id);
  if (error) return { error: "Could not delete the goal. Try again." };
  refresh();
  return { error: null };
}

/**
 * Moves a goal to a status. Reaching it adds an achievement (once);
 * reopening it takes that achievement away again.
 */
export async function setGoalStatus(id: string, status: GoalStatus): Promise<Result> {
  await requireSession();
  if (!isId(id) || !goalStatuses.includes(status)) return { error: "Goal not found." };
  const { data: goal } = await db().from("goals").select("title, status").eq("id", id).maybeSingle();
  if (!goal) return { error: "Goal not found." };

  const achieved = status === "achieved";
  const { error } = await db()
    .from("goals")
    .update({
      status,
      achieved_at: achieved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "Could not update the goal. Try again." };

  if (achieved && goal.status !== "achieved") {
    // A unique index allows one per goal; a duplicate insert just fails.
    await db().from("achievements").insert({ goal_id: id, from_goal: true, title: goal.title, achieved_on: localDate() });
  } else if (!achieved && goal.status === "achieved") {
    await db().from("achievements").delete().eq("goal_id", id).eq("from_goal", true);
  }
  refresh(id);
  return { error: null };
}

/** Sets the number reached so far. */
export async function setGoalMetric(id: string, value: number): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Goal not found." };
  if (!Number.isFinite(value) || value < 0 || value > 1e12) return { error: "Enter a number from 0 up." };
  const { error } = await db()
    .from("goals")
    .update({ metric_current: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  refresh(id);
  return { error: null };
}

export async function addGoalStep(goalId: string, title: string): Promise<Result> {
  await requireSession();
  if (!isId(goalId)) return { error: "Goal not found." };
  const parsed = goalStepTitleSchema.safeParse(title);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: last } = await db()
    .from("goal_steps")
    .select("position")
    .eq("goal_id", goalId)
    .order("position", { ascending: false });
  if ((last ?? []).length >= MAX_GOAL_STEPS) return { error: `Up to ${MAX_GOAL_STEPS} steps.` };
  const { error } = await db()
    .from("goal_steps")
    .insert({ goal_id: goalId, title: parsed.data, position: (last?.[0]?.position ?? -1) + 1 });
  if (error) return { error: "Could not add the step. Try again." };
  refresh(goalId);
  return { error: null };
}

/** Steps picked from an "AI helps" plan, added after the others, with the answers given as a note if wanted. */
export async function addGoalSteps(goalId: string, titles: string[], note: string | null): Promise<Result> {
  await requireSession();
  if (!isId(goalId)) return { error: "Goal not found." };
  const parsed = z.array(goalStepTitleSchema).min(1, "Pick a step first.").safeParse(titles);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const parsedNote = note ? goalNoteSchema.safeParse(note) : null;
  if (parsedNote && !parsedNote.success) return { error: parsedNote.error.issues[0].message };
  const { data: last } = await db()
    .from("goal_steps")
    .select("position")
    .eq("goal_id", goalId)
    .order("position", { ascending: false });
  const room = MAX_GOAL_STEPS - (last ?? []).length;
  if (parsed.data.length > room) return { error: room > 0 ? `Up to ${MAX_GOAL_STEPS} steps: pick ${room} or fewer.` : `Up to ${MAX_GOAL_STEPS} steps.` };
  const start = (last?.[0]?.position ?? -1) + 1;
  const { error } = await db()
    .from("goal_steps")
    .insert(parsed.data.map((title, i) => ({ goal_id: goalId, title, position: start + i })));
  if (error) return { error: "Could not add the steps. Try again." };
  if (parsedNote?.success) {
    const { error: noteError } = await db().from("goal_notes").insert({ goal_id: goalId, body: parsedNote.data });
    if (noteError) console.error(`plan note for goal ${goalId} failed:`, noteError);
  }
  refresh(goalId);
  return { error: null };
}

/** Ticking a step by hand ticks its whole list too; unticking leaves the list as it is. */
export async function setGoalStepDone(stepId: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(stepId)) return { error: "Step not found." };
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("goal_steps")
    .update({ done_at: done ? now : null })
    .eq("id", stepId)
    .select("goal_id")
    .single();
  if (error) return { error: "Could not update the step. Try again." };
  if (done) await db().from("goal_step_items").update({ done_at: now }).eq("step_id", stepId).is("done_at", null);
  refresh(data.goal_id);
  return { error: null };
}

// --- A checklist inside a step ---------------------------------------------

/** The step is done when every item on its list is, and not done otherwise. A step with no list is left alone. */
async function syncStep(stepId: string): Promise<void> {
  const { data: items } = await db().from("goal_step_items").select("done_at").eq("step_id", stepId);
  if (!items || items.length === 0) return;
  const allDone = items.every((i) => i.done_at);
  if (allDone) await db().from("goal_steps").update({ done_at: new Date().toISOString() }).eq("id", stepId).is("done_at", null);
  else await db().from("goal_steps").update({ done_at: null }).eq("id", stepId);
}

export async function addStepItem(stepId: string, title: string): Promise<Result> {
  await requireSession();
  if (!isId(stepId)) return { error: "Step not found." };
  const parsed = goalStepTitleSchema.safeParse(title);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: step } = await db().from("goal_steps").select("goal_id").eq("id", stepId).maybeSingle();
  if (!step) return { error: "Step not found." };
  const { data: last } = await db()
    .from("goal_step_items")
    .select("position")
    .eq("step_id", stepId)
    .order("position", { ascending: false });
  if ((last ?? []).length >= MAX_STEP_ITEMS) return { error: `Up to ${MAX_STEP_ITEMS} on one list.` };
  const { error } = await db()
    .from("goal_step_items")
    .insert({ step_id: stepId, title: parsed.data, position: (last?.[0]?.position ?? -1) + 1 });
  if (error) return { error: "Could not add it. Try again." };
  // Something new to do: the step isn't done any more.
  await syncStep(stepId);
  refresh(step.goal_id);
  return { error: null };
}

export async function setStepItemDone(itemId: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(itemId)) return { error: "Not found." };
  const { data, error } = await db()
    .from("goal_step_items")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select("step_id, goal_steps(goal_id)")
    .single();
  if (error) return { error: "Could not update it. Try again." };
  await syncStep(data.step_id);
  refresh(data.goal_steps?.goal_id);
  return { error: null };
}

export async function deleteStepItem(itemId: string): Promise<Result> {
  await requireSession();
  if (!isId(itemId)) return { error: "Not found." };
  const { data, error } = await db()
    .from("goal_step_items")
    .delete()
    .eq("id", itemId)
    .select("step_id, goal_steps(goal_id)")
    .single();
  if (error) return { error: "Could not remove it. Try again." };
  await syncStep(data.step_id);
  refresh(data.goal_steps?.goal_id);
  return { error: null };
}

export async function deleteGoalStep(stepId: string): Promise<Result> {
  await requireSession();
  if (!isId(stepId)) return { error: "Step not found." };
  const { data, error } = await db().from("goal_steps").delete().eq("id", stepId).select("goal_id").single();
  if (error) return { error: "Could not remove the step. Try again." };
  refresh(data.goal_id);
  return { error: null };
}

export async function addGoalNote(goalId: string, body: string): Promise<Result> {
  await requireSession();
  if (!isId(goalId)) return { error: "Goal not found." };
  const parsed = goalNoteSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("goal_notes").insert({ goal_id: goalId, body: parsed.data });
  if (error) return { error: "Could not save the note. Try again." };
  refresh(goalId);
  return { error: null };
}

export async function updateGoalNote(noteId: string, body: string): Promise<Result> {
  await requireSession();
  if (!isId(noteId)) return { error: "Note not found." };
  const parsed = goalNoteSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await db().from("goal_notes").update({ body: parsed.data }).eq("id", noteId).select("goal_id").single();
  if (error) return { error: "Could not save the note. Try again." };
  refresh(data.goal_id);
  return { error: null };
}

export async function deleteGoalNote(noteId: string): Promise<Result> {
  await requireSession();
  if (!isId(noteId)) return { error: "Note not found." };
  const { data, error } = await db().from("goal_notes").delete().eq("id", noteId).select("goal_id").single();
  if (error) return { error: "Could not remove the note. Try again." };
  refresh(data.goal_id);
  return { error: null };
}

/** Logs a win, on its own or towards a goal. */
export async function logAchievement(input: AchievementInput): Promise<Result> {
  await requireSession();
  const parsed = achievementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.achievedOn > localDate()) return { error: "Pick today or a day in the past." };
  const { error } = await db().from("achievements").insert({
    title: parsed.data.title,
    note: parsed.data.note || null,
    achieved_on: parsed.data.achievedOn,
    goal_id: parsed.data.goalId,
  });
  if (error) return { error: "Could not save it. Try again." };
  refresh(parsed.data.goalId ?? undefined);
  return { error: null };
}

/**
 * Edits an achievement. For one a goal earned, the goal's achieved date
 * follows, and the goal it belongs to can't change.
 */
export async function updateAchievement(id: string, input: AchievementInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = achievementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.achievedOn > localDate()) return { error: "Pick today or a day in the past." };
  const { data: current } = await db().from("achievements").select("goal_id, from_goal").eq("id", id).maybeSingle();
  if (!current) return { error: "Not found." };

  const { error } = await db()
    .from("achievements")
    .update({
      title: parsed.data.title,
      note: parsed.data.note || null,
      achieved_on: parsed.data.achievedOn,
      goal_id: current.from_goal ? current.goal_id : parsed.data.goalId,
    })
    .eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  if (current.from_goal && current.goal_id) {
    await db().from("goals").update({ achieved_at: achievedAt(parsed.data.achievedOn) }).eq("id", current.goal_id);
  }
  refresh(current.goal_id ?? undefined);
  return { error: null };
}

/** Midday on a calendar day, so the day reads the same in any time zone nearby. */
const achievedAt = (day: string) => `${day}T12:00:00Z`;

/** Changes the day a goal was reached, on the goal and its achievement. */
export async function setGoalAchievedOn(goalId: string, day: string): Promise<Result> {
  await requireSession();
  if (!isId(goalId) || !z.iso.date().safeParse(day).success) return { error: "Pick a date." };
  if (day > localDate()) return { error: "Pick today or a day in the past." };
  const { error } = await db()
    .from("goals")
    .update({ achieved_at: achievedAt(day), updated_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("status", "achieved");
  if (error) return { error: "Could not save the date. Try again." };
  await db().from("achievements").update({ achieved_on: day }).eq("goal_id", goalId).eq("from_goal", true);
  refresh(goalId);
  return { error: null };
}

export async function deleteAchievement(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("achievements").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  refresh();
  return { error: null };
}

// --- Motivation: notes to yourself at the top of Goals ----------------------

const motivationSchema = z.string().trim().min(1, "Write something first.").max(500, "Keep it under 500 characters.");

export async function addMotivation(body: string): Promise<Result> {
  await requireSession();
  const parsed = motivationSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("motivation_notes").insert({ body: parsed.data });
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/goals");
  return { error: null };
}

export async function updateMotivation(id: string, body: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = motivationSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("motivation_notes").update({ body: parsed.data }).eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/goals");
  return { error: null };
}

export async function deleteMotivation(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("motivation_notes").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  revalidatePath("/growth/goals");
  return { error: null };
}
