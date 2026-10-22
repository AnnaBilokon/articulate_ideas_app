"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { localDate } from "@/lib/schedule";
import { addDays, habitSchema, type HabitInput } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Habits: create, edit, rest or delete, and tick off a day.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh(habitId?: string) {
  revalidatePath("/");
  revalidatePath("/growth/habits");
  if (habitId) revalidatePath(`/growth/habits/${habitId}`);
}

const habitColumns = (h: HabitInput) => ({
  title: h.title,
  why: h.why || null,
  schedule: h.schedule,
  days: h.schedule === "days" ? [...new Set(h.days)].sort((a, b) => a - b) : [],
  times_per_week: h.schedule === "weekly" ? h.timesPerWeek : null,
});

export async function createHabit(input: HabitInput): Promise<Result> {
  await requireSession();
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("habits").insert(habitColumns(parsed.data));
  if (error) return { error: "Could not save the habit. Try again." };
  refresh();
  return { error: null };
}

export async function updateHabit(id: string, input: HabitInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Habit not found." };
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db()
    .from("habits")
    .update({ ...habitColumns(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save the habit. Try again." };
  refresh(id);
  return { error: null };
}

/** Rests a habit (it leaves Today, its history stays) or brings it back. */
export async function setHabitResting(id: string, resting: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Habit not found." };
  const { error } = await db()
    .from("habits")
    .update({ archived_at: resting ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not update the habit. Try again." };
  refresh(id);
  return { error: null };
}

export async function deleteHabit(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Habit not found." };
  const { error } = await db().from("habits").delete().eq("id", id);
  if (error) return { error: "Could not delete the habit. Try again." };
  refresh();
  return { error: null };
}

/** Ticks a day off, or unticks it. Any day in the past year up to today. */
export async function setHabitDone(habitId: string, day: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(habitId) || !z.iso.date().safeParse(day).success) return { error: "Habit not found." };
  const today = localDate();
  if (day > today) return { error: "That day hasn't come yet." };
  if (day < addDays(today, -366)) return { error: "That's too far back." };

  const { error } = done
    ? await db().from("habit_checks").upsert({ habit_id: habitId, day }, { onConflict: "habit_id,day", ignoreDuplicates: true })
    : await db().from("habit_checks").delete().eq("habit_id", habitId).eq("day", day);
  if (error) return { error: "Could not save that. Try again." };
  refresh(habitId);
  return { error: null };
}
