"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getExercise, getWorkout, listExercises } from "@/lib/fitness";
import { swapFor } from "@/lib/fitness-plan";
import { localDate } from "@/lib/schedule";
import {
  addDays,
  exerciseSchema,
  finishWorkoutSchema,
  logActivitySchema,
  startWorkoutSchema,
  type ExerciseInput,
  type FinishWorkoutInput,
  type LogActivityInput,
  type StartWorkoutInput,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Fitness: start a suggested workout, tick it off, finish it; log a sport or
// class; keep the exercise library.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;

function refresh(workoutId?: string) {
  revalidatePath("/");
  revalidatePath("/fitness");
  if (workoutId) revalidatePath(`/fitness/workouts/${workoutId}`);
}

/** Saves a suggested workout as today's, not done yet, and opens it. */
export async function startWorkout(input: StartWorkoutInput): Promise<Result & { id?: string }> {
  await requireSession();
  const parsed = startWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "That workout didn't come through right. Try another." };
  const { plan, equipment, source } = parsed.data;

  const { data: workout, error } = await db()
    .from("fitness_workouts")
    .insert({ day: localDate(), title: plan.title, kind: plan.kind, minutes: plan.minutes, equipment, source })
    .select("id")
    .single();
  if (error || !workout) return { error: "Could not start the workout. Try again." };

  const { error: exercisesError } = await db()
    .from("fitness_workout_exercises")
    .insert(
      plan.exercises.map((e, position) => ({
        workout_id: workout.id,
        exercise_id: e.exerciseId,
        name: e.name,
        position,
        sets: e.sets,
        reps: e.reps,
        seconds: e.seconds,
        each_side: e.eachSide,
      })),
    );
  if (exercisesError) {
    await db().from("fitness_workouts").delete().eq("id", workout.id);
    return { error: "Could not start the workout. Try again." };
  }
  refresh();
  return { error: null, id: workout.id };
}

async function workoutOf(exerciseRowId: string): Promise<string | null> {
  const { data } = await db().from("fitness_workout_exercises").select("workout_id").eq("id", exerciseRowId).maybeSingle();
  return data?.workout_id ?? null;
}

export async function setExerciseDone(id: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const { data, error } = await db()
    .from("fitness_workout_exercises")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("workout_id")
    .maybeSingle();
  if (error || !data) return { error: "Could not save that. Try again." };
  refresh(data.workout_id);
  return { error: null };
}

const weightSchema = z.number().min(0, "A weight can't be negative.").max(999, "That's a lot: under 1000 kg.").nullable();

/** The weight used, in kg; null clears it. */
export async function setExerciseWeight(id: string, weightKg: number | null): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const parsed = weightSchema.safeParse(weightKg);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const weight = parsed.data === null ? null : Math.round(parsed.data * 10) / 10;
  const { data, error } = await db()
    .from("fitness_workout_exercises")
    .update({ weight_kg: weight })
    .eq("id", id)
    .select("workout_id")
    .maybeSingle();
  if (error || !data) return { error: "Could not save the weight. Try again." };
  refresh(data.workout_id);
  return { error: null };
}

/** Swaps one exercise for another that does the same job with what's at hand. */
export async function swapExercise(id: string, seed: number): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const workoutId = await workoutOf(id);
  const workout = workoutId ? await getWorkout(workoutId) : null;
  const row = workout?.exercises.find((e) => e.id === id);
  if (!workout || !row?.exerciseId) return { error: "This one can't be swapped." };

  const library = await listExercises();
  const current = library.find((e) => e.id === row.exerciseId);
  if (!current) return { error: "This one can't be swapped." };
  const inWorkout = new Set(workout.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])));
  const next = swapFor(library, current, inWorkout, workout.equipment, Math.floor(seed));
  if (!next) return { error: "Nothing else does the same job with what you have." };

  // Same amount of work: sets stay, reps or seconds come from the new one.
  const { error } = await db()
    .from("fitness_workout_exercises")
    .update({
      exercise_id: next.id,
      name: next.name,
      reps: next.measure === "reps" ? next.reps : null,
      seconds: next.measure === "hold" ? next.seconds : row.seconds,
      each_side: next.eachSide,
      weight_kg: null,
      done_at: null,
    })
    .eq("id", id);
  if (error) return { error: "Could not swap it. Try again." };
  refresh(workout.id);
  return { error: null };
}

export async function removeWorkoutExercise(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const workoutId = await workoutOf(id);
  const { error } = await db().from("fitness_workout_exercises").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  refresh(workoutId ?? undefined);
  return { error: null };
}

export async function finishWorkout(id: string, input: FinishWorkoutInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const parsed = finishWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db()
    .from("fitness_workouts")
    .update({
      done_at: new Date().toISOString(),
      minutes: parsed.data.minutes,
      feeling: parsed.data.feeling,
      note: parsed.data.note || null,
    })
    .eq("id", id);
  if (error) return { error: "Could not save the workout. Try again." };
  refresh(id);
  return { error: null };
}

/** Back to not done, to carry on with it. */
export async function reopenWorkout(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const { error } = await db().from("fitness_workouts").update({ done_at: null }).eq("id", id);
  if (error) return { error: "Could not reopen the workout. Try again." };
  refresh(id);
  return { error: null };
}

export async function deleteWorkout(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const { error } = await db().from("fitness_workouts").delete().eq("id", id);
  if (error) return { error: "Could not delete the workout. Try again." };
  refresh();
  return { error: null };
}

/** Something done without a planned workout: a class, a match, a run. */
export async function logActivity(input: LogActivityInput): Promise<Result> {
  await requireSession();
  const parsed = logActivitySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = parsed.data;
  const today = localDate();
  if (a.day > today) return { error: "That day hasn't come yet." };
  if (a.day < addDays(today, -366)) return { error: "That's too far back." };
  const { error } = await db().from("fitness_workouts").insert({
    day: a.day,
    title: a.title,
    kind: a.kind,
    minutes: a.minutes,
    source: "logged",
    done_at: new Date().toISOString(),
    feeling: a.feeling,
    note: a.note || null,
  });
  if (error) return { error: "Could not save it. Try again." };
  refresh();
  return { error: null };
}

// The exercise library

const exerciseColumns = (e: ExerciseInput) => ({
  name: e.name,
  kind: e.kind,
  equipment: [...new Set(e.equipment)],
  muscles: [...new Set(e.muscles)],
  measure: e.measure,
  reps: e.measure === "reps" ? e.reps : null,
  seconds: e.measure === "hold" ? e.seconds : null,
  each_side: e.measure !== "duration" && e.eachSide,
  how: e.how || null,
});

function refreshLibrary() {
  revalidatePath("/fitness");
  revalidatePath("/fitness/exercises");
}

const duplicate = (code: string | undefined) =>
  code === "23505" ? "There's already an exercise with that name." : "Could not save the exercise. Try again.";

export async function createExercise(input: ExerciseInput): Promise<Result> {
  await requireSession();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("fitness_exercises").insert(exerciseColumns(parsed.data));
  if (error) return { error: duplicate(error.code) };
  refreshLibrary();
  return { error: null };
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db().from("fitness_exercises").update(exerciseColumns(parsed.data)).eq("id", id);
  if (error) return { error: duplicate(error.code) };
  refreshLibrary();
  return { error: null };
}

/** Hidden exercises aren't suggested or swapped in; past workouts keep them. */
export async function setExerciseHidden(id: string, hidden: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id) || !(await getExercise(id))) return { error: "Exercise not found." };
  const { error } = await db()
    .from("fitness_exercises")
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Could not update the exercise. Try again." };
  refreshLibrary();
  return { error: null };
}

export async function deleteExercise(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const { error } = await db().from("fitness_exercises").delete().eq("id", id);
  if (error) return { error: "Could not delete the exercise. Try again." };
  refreshLibrary();
  return { error: null };
}
