"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getRoutine, getWorkout, lastTimes, listExercises, type Workout } from "@/lib/fitness";
import { coolDownFor, mainKind, suggestTitle, swapFor, warmUpFor } from "@/lib/fitness-plan";
import { localDate } from "@/lib/schedule";
import {
  addDays,
  exerciseSchema,
  finishWorkoutSchema,
  logActivitySchema,
  plannedSets,
  routineExerciseSchema,
  routineSchema,
  setSchema,
  startWorkoutSchema,
  type Equipment,
  type Exercise,
  type ExerciseInput,
  type ExerciseKind,
  type FinishWorkoutInput,
  type LogActivityInput,
  type Measure,
  type RoutineExerciseInput,
  type RoutineInput,
  type SetInput,
  type StartWorkoutInput,
  type WorkoutSource,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Fitness: start your own workout, an empty one or a suggested one; log each
// set; finish it. Keep your own workouts and the exercise library.

type Result = { error: string | null };

const isId = (id: string) => z.uuid().safeParse(id).success;
const ids = z.array(z.uuid()).min(1, "Pick at least one exercise.").max(30, "At most 30 at a time.");

function refresh(workoutId?: string) {
  revalidatePath("/");
  revalidatePath("/fitness");
  if (workoutId) revalidatePath(`/fitness/workouts/${workoutId}`);
}

function refreshRoutine(routineId?: string) {
  revalidatePath("/fitness");
  if (routineId) revalidatePath(`/fitness/routines/${routineId}`);
}

/** An exercise as it goes into a workout: the plan, and a weight to start from. */
type NewExercise = {
  exerciseId: string | null;
  name: string;
  measure: Measure | null;
  sets: number | null;
  reps: number | null;
  seconds: number | null;
  eachSide: boolean;
  weightKg?: number | null;
};

/**
 * Adds exercises to a workout with a set row for each planned set. Weights
 * start from last time's, set by set, so beating it is one tap away.
 */
async function insertExercises(workoutId: string, items: NewExercise[], from: number): Promise<boolean> {
  if (items.length === 0) return true;
  const { data: rows, error } = await db()
    .from("fitness_workout_exercises")
    .insert(
      items.map((e, i) => ({
        workout_id: workoutId,
        exercise_id: e.exerciseId,
        name: e.name,
        position: from + i,
        sets: e.measure === "duration" ? null : e.sets,
        reps: e.measure === "reps" ? e.reps : null,
        seconds: e.measure === "reps" ? null : e.seconds,
        each_side: e.eachSide,
      })),
    )
    .select("id, position");
  if (error || !rows) return false;

  const last = await lastTimes(items.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])), workoutId);
  const sets = rows.flatMap((row) => {
    const e = items[row.position - from];
    const before = e.exerciseId ? last.get(e.exerciseId)?.sets : undefined;
    return plannedSets(e).map((planned, i) => ({
      workout_exercise_id: row.id,
      position: i,
      target_reps: planned.targetReps,
      target_seconds: planned.targetSeconds,
      weight_kg: before?.[Math.min(i, before.length - 1)]?.weightKg ?? e.weightKg ?? null,
    }));
  });
  const { error: setsError } = await db().from("fitness_sets").insert(sets);
  return !setsError;
}

/** Started but never given an exercise: not a workout, so it goes. */
async function dropEmptyWorkouts() {
  const { data } = await db().from("fitness_workouts").select("id, fitness_workout_exercises(id)").is("done_at", null);
  const empty = (data ?? []).filter((w) => w.fitness_workout_exercises.length === 0).map((w) => w.id);
  if (empty.length > 0) await db().from("fitness_workouts").delete().in("id", empty);
}

async function createWorkout(w: {
  title: string;
  kind: ExerciseKind;
  minutes: number;
  equipment: Equipment[];
  source: WorkoutSource;
  routineId?: string;
}): Promise<string | null> {
  await dropEmptyWorkouts();
  const { data } = await db()
    .from("fitness_workouts")
    .insert({
      day: localDate(),
      title: w.title,
      kind: w.kind,
      minutes: w.minutes,
      equipment: w.equipment,
      source: w.source,
      routine_id: w.routineId ?? null,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

const measureOf = (e: { sets: number | null; reps: number | null; seconds: number | null }): Measure =>
  e.reps !== null ? "reps" : e.sets === null ? "duration" : "hold";

/** Saves a suggested workout as today's, not done yet, and opens it. */
export async function startWorkout(input: StartWorkoutInput): Promise<Result & { id?: string }> {
  await requireSession();
  const parsed = startWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "That workout didn't come through right. Try another." };
  const { plan, equipment, source } = parsed.data;

  // One of your own workouts, fitted to the time: it counts as doing that one.
  const routineId = plan.routineId ?? undefined;
  const id = await createWorkout({
    title: plan.title,
    kind: plan.kind,
    minutes: plan.minutes,
    equipment,
    source: routineId ? "routine" : source,
    routineId,
  });
  if (!id) return { error: "Could not start the workout. Try again." };
  if (!(await insertExercises(id, plan.exercises.map((e) => ({ ...e, measure: measureOf(e) })), 0))) {
    await db().from("fitness_workouts").delete().eq("id", id);
    return { error: "Could not start the workout. Try again." };
  }
  refresh();
  return { error: null, id };
}

/** Starts one of your own workouts, with last time's weights filled in. */
export async function startRoutine(routineId: string): Promise<Result & { id?: string }> {
  await requireSession();
  if (!isId(routineId)) return { error: "Workout not found." };
  const routine = await getRoutine(routineId);
  if (!routine) return { error: "Workout not found." };
  if (routine.exercises.length === 0) return { error: "Add an exercise first." };

  const minutes = Math.max(
    5,
    Math.round(
      routine.exercises.reduce(
        (sum, e) => sum + (e.measure === "duration" ? (e.seconds ?? 1200) / 60 : e.sets * (e.eachSide ? 2.3 : 1.7)),
        0,
      ),
    ),
  );
  const id = await createWorkout({
    title: routine.name,
    kind: mainKind(routine.exercises.map((e) => e.kind)),
    minutes: Math.min(600, minutes),
    equipment: [...new Set(routine.exercises.flatMap((e) => e.equipment))],
    source: "routine",
    routineId,
  });
  if (!id) return { error: "Could not start the workout. Try again." };
  const ok = await insertExercises(
    id,
    routine.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      measure: e.measure,
      sets: e.sets,
      reps: e.reps,
      seconds: e.seconds,
      eachSide: e.eachSide,
      weightKg: e.weightKg,
    })),
    0,
  );
  if (!ok) {
    await db().from("fitness_workouts").delete().eq("id", id);
    return { error: "Could not start the workout. Try again." };
  }
  refresh();
  return { error: null, id };
}

const DEFAULT_WORKOUT_NAME = "Workout";
const DEFAULT_ROUTINE_NAME = "New workout";

/**
 * A workout you put together as you go. It's only saved once it has its
 * first exercises, so an empty one never shows up in your week.
 */
export async function startOwnWorkout(title: string, exerciseIds: string[]): Promise<Result & { id?: string }> {
  await requireSession();
  const name = z.string().trim().min(1).max(80).catch(DEFAULT_WORKOUT_NAME).parse(title);
  const parsed = ids.safeParse(exerciseIds);
  if (!parsed.success) return { error: "Pick at least one exercise." };
  const library = await listExercises();
  const picked = parsed.data.flatMap((id) => library.filter((e) => e.id === id));
  if (picked.length === 0) return { error: "Pick at least one exercise." };

  const id = await createWorkout({
    title: name === DEFAULT_WORKOUT_NAME ? (suggestTitle(picked) ?? name) : name,
    kind: mainKind(picked.map((e) => e.kind)),
    minutes: 30,
    equipment: [...new Set(picked.flatMap((e) => e.equipment))],
    source: "own",
  });
  if (!id) return { error: "Could not start the workout. Try again." };
  if (!(await insertExercises(id, picked.map(fromLibrary), 0))) {
    await db().from("fitness_workouts").delete().eq("id", id);
    return { error: "Could not start the workout. Try again." };
  }
  refresh();
  return { error: null, id };
}

const fromLibrary = (e: Exercise): NewExercise => ({
  exerciseId: e.id,
  name: e.name,
  measure: e.measure,
  sets: e.measure === "duration" ? null : 3,
  reps: e.reps,
  seconds: e.measure === "duration" ? 1200 : e.seconds,
  eachSide: e.eachSide,
});

export async function addWorkoutExercises(workoutId: string, exerciseIds: string[]): Promise<Result> {
  await requireSession();
  const parsed = ids.safeParse(exerciseIds);
  if (!isId(workoutId) || !parsed.success) return { error: "Pick at least one exercise." };
  const [workout, library] = await Promise.all([getWorkout(workoutId), listExercises()]);
  if (!workout) return { error: "Workout not found." };
  const picked = parsed.data.flatMap((id) => library.filter((e) => e.id === id));
  const from = Math.max(-1, ...workout.exercises.map((_, i) => i)) + 1;
  if (!(await insertExercises(workoutId, picked.map(fromLibrary), from))) return { error: "Could not add them. Try again." };
  refresh(workoutId);
  return { error: null };
}

// A warm-up before, or stretching after: the moves the suggestion showed.

type Target = { workoutId: string } | { routineId: string };

export async function addWarmUpOrCoolDown(target: Target, which: "warmup" | "cooldown"): Promise<Result> {
  await requireSession();
  const id = "workoutId" in target ? target.workoutId : target.routineId;
  if (!isId(id)) return { error: "Workout not found." };
  const library = await listExercises();

  const items =
    "workoutId" in target
      ? ((await getWorkout(id))?.exercises.map((e) => ({ rowId: e.id, exerciseId: e.exerciseId, kind: e.kind, muscles: e.muscles })) ?? null)
      : ((await getRoutine(id))?.exercises.map((e) => ({ rowId: e.id, exerciseId: e.exerciseId, kind: e.kind, muscles: e.muscles })) ?? null);
  if (!items) return { error: "Workout not found." };
  const worked = [...new Set(items.filter((i) => i.kind === "strength").flatMap((i) => i.muscles))];
  const taken = new Set(items.flatMap((i) => (i.exerciseId ? [i.exerciseId] : [])));
  const moves = which === "warmup" ? warmUpFor(library, worked, taken) : coolDownFor(library, worked, taken);
  if (moves.length === 0) return { error: "Nothing to add with your exercises." };

  // A warm-up goes first: everything else moves down to make room.
  const table = "workoutId" in target ? "fitness_workout_exercises" : "fitness_routine_exercises";
  if (which === "warmup") {
    const moved = await Promise.all(items.map((i, n) => db().from(table).update({ position: moves.length + n }).eq("id", i.rowId)));
    if (moved.some((r) => r.error)) return { error: "Could not add it. Try again." };
  }
  const from = which === "warmup" ? 0 : items.length;

  if ("workoutId" in target) {
    const ok = await insertExercises(
      id,
      moves.map((e) => ({ exerciseId: e.id, name: e.name, measure: "hold", sets: 1, reps: null, seconds: e.seconds, eachSide: e.eachSide })),
      from,
    );
    if (!ok) return { error: "Could not add it. Try again." };
    refresh(id);
  } else {
    const { error } = await db()
      .from("fitness_routine_exercises")
      .insert(moves.map((e, i) => ({ routine_id: id, exercise_id: e.id, position: from + i, sets: 1, reps: null, seconds: e.seconds })));
    if (error) return { error: "Could not add it. Try again." };
    refreshRoutine(id);
  }
  return { error: null };
}

// Sets

async function workoutOfSet(setId: string): Promise<string | null> {
  const { data } = await db()
    .from("fitness_sets")
    .select("fitness_workout_exercises(workout_id)")
    .eq("id", setId)
    .maybeSingle();
  return data?.fitness_workout_exercises?.workout_id ?? null;
}

/** Saves what you did in a set: reps (or seconds), weight, and done or not. */
export async function saveSet(id: string, input: SetInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Set not found." };
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const s = parsed.data;
  const { error } = await db()
    .from("fitness_sets")
    .update({
      reps: s.reps,
      seconds: s.seconds,
      weight_kg: s.weightKg === null ? null : Math.round(s.weightKg * 10) / 10,
      done_at: s.done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { error: "Could not save the set. Try again." };
  refresh((await workoutOfSet(id)) ?? undefined);
  return { error: null };
}

/** One more set, like the last one. */
export async function addSet(workoutExerciseId: string): Promise<Result> {
  await requireSession();
  if (!isId(workoutExerciseId)) return { error: "Exercise not found." };
  const { data: row } = await db()
    .from("fitness_workout_exercises")
    .select(`workout_id, fitness_sets(position, target_reps, target_seconds, reps, seconds, weight_kg)`)
    .eq("id", workoutExerciseId)
    .maybeSingle();
  if (!row) return { error: "Exercise not found." };
  if (row.fitness_sets.length >= 20) return { error: "That's plenty of sets." };
  const last = [...row.fitness_sets].sort((a, b) => b.position - a.position)[0];
  const { error } = await db()
    .from("fitness_sets")
    .insert({
      workout_exercise_id: workoutExerciseId,
      position: (last?.position ?? -1) + 1,
      target_reps: last?.target_reps ?? last?.reps ?? 10,
      target_seconds: last?.target_seconds ?? null,
      weight_kg: last?.weight_kg ?? null,
    });
  if (error) return { error: "Could not add a set. Try again." };
  refresh(row.workout_id);
  return { error: null };
}

export async function removeSet(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Set not found." };
  const workoutId = await workoutOfSet(id);
  const { error } = await db().from("fitness_sets").delete().eq("id", id);
  if (error) return { error: "Could not remove the set. Try again." };
  refresh(workoutId ?? undefined);
  return { error: null };
}

// Exercises in a workout

async function workoutOf(exerciseRowId: string): Promise<Workout | null> {
  const { data } = await db().from("fitness_workout_exercises").select("workout_id").eq("id", exerciseRowId).maybeSingle();
  return data ? getWorkout(data.workout_id) : null;
}

/** Swaps one exercise for another that does the same job with what's at hand. */
export async function swapExercise(id: string, seed: number): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const workout = await workoutOf(id);
  const row = workout?.exercises.find((e) => e.id === id);
  if (!workout || !row?.exerciseId) return { error: "This one can't be swapped." };

  const library = await listExercises();
  const current = library.find((e) => e.id === row.exerciseId);
  if (!current) return { error: "This one can't be swapped." };
  const inWorkout = new Set(workout.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])));
  const equipment = workout.equipment.length > 0 ? workout.equipment : current.equipment;
  const next = swapFor(library, current, inWorkout, equipment, Math.floor(seed));
  if (!next) return { error: "Nothing else does the same job with what you have." };

  // Same number of sets; the reps or seconds and last weights come from the new one.
  const { error } = await db().from("fitness_workout_exercises").delete().eq("id", id);
  if (error) return { error: "Could not swap it. Try again." };
  const position = workout.exercises.findIndex((e) => e.id === id);
  const sets = Math.max(1, row.logged.length);
  const ok = await insertExercises(workout.id, [{ ...fromLibrary(next), sets, seconds: next.measure === "duration" ? row.seconds : next.seconds }], position);
  if (!ok) return { error: "Could not swap it. Try again." };
  refresh(workout.id);
  return { error: null };
}

/** Moves an exercise one place up or down in a workout. */
export async function moveWorkoutExercise(id: string, direction: -1 | 1): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const workout = await workoutOf(id);
  if (!workout) return { error: "Exercise not found." };
  const order = workout.exercises.map((e) => e.id);
  const from = order.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= order.length) return { error: null };
  [order[from], order[to]] = [order[to], order[from]];
  const results = await Promise.all(
    order.map((rowId, position) => db().from("fitness_workout_exercises").update({ position }).eq("id", rowId)),
  );
  if (results.some((r) => r.error)) return { error: "Could not move it. Try again." };
  refresh(workout.id);
  return { error: null };
}

export async function removeWorkoutExercise(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const workout = await workoutOf(id);
  const { error } = await db().from("fitness_workout_exercises").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  refresh(workout?.id);
  return { error: null };
}

// The workout itself

export async function renameWorkout(id: string, title: string): Promise<Result> {
  await requireSession();
  const parsed = z.string().trim().min(1, "Give it a name.").max(80, "Keep the name under 80 characters.").safeParse(title);
  if (!isId(id) || !parsed.success) return { error: parsed.success ? "Workout not found." : parsed.error.issues[0].message };
  const { error } = await db().from("fitness_workouts").update({ title: parsed.data }).eq("id", id);
  if (error) return { error: "Could not rename it. Try again." };
  refresh(id);
  return { error: null };
}

export async function finishWorkout(id: string, input: FinishWorkoutInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const parsed = finishWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const workout = await getWorkout(id);
  if (!workout) return { error: "Workout not found." };
  // Nothing done: nothing to save.
  if (!workout.exercises.some((e) => e.logged.some((s) => s.done))) return { error: "Tick at least one set first." };
  const { error } = await db()
    .from("fitness_workouts")
    .update({
      done_at: new Date().toISOString(),
      minutes: parsed.data.minutes,
      feeling: parsed.data.feeling,
      note: parsed.data.note || null,
      // Put together as you went: its kind is what most of it was.
      ...(workout.source === "own" && workout.exercises.length > 0 ? { kind: mainKind(workout.exercises.map((e) => e.kind)) } : {}),
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

// Your own workouts

/** A new, empty workout of your own, ready to add exercises to. */
export async function createRoutine(): Promise<Result & { id?: string }> {
  await requireSession();
  const { data, error } = await db().from("fitness_routines").insert({ name: DEFAULT_ROUTINE_NAME }).select("id").single();
  if (error || !data) return { error: "Could not create it. Try again." };
  refreshRoutine();
  return { error: null, id: data.id };
}

/** Keeps a workout you did (a suggestion, say) as one of your own. */
export async function saveWorkoutAsRoutine(workoutId: string): Promise<Result & { id?: string }> {
  await requireSession();
  if (!isId(workoutId)) return { error: "Workout not found." };
  const workout = await getWorkout(workoutId);
  const exercises = workout?.exercises.filter((e) => e.exerciseId) ?? [];
  if (!workout || exercises.length === 0) return { error: "There are no exercises to keep." };

  const { data: routine, error } = await db().from("fitness_routines").insert({ name: workout.title }).select("id").single();
  if (error || !routine) return { error: "Could not save it. Try again." };
  const { error: exercisesError } = await db()
    .from("fitness_routine_exercises")
    .insert(
      exercises.map((e, position) => {
        const sets = e.logged.length > 0 ? e.logged : null;
        const first = sets?.find((s) => s.done) ?? sets?.[0];
        return {
          routine_id: routine.id,
          exercise_id: e.exerciseId!,
          position,
          sets: Math.min(10, Math.max(1, sets?.length ?? e.sets ?? 3)),
          reps: first?.targetReps ?? e.reps,
          seconds: first?.targetSeconds ?? e.seconds,
          weight_kg: sets?.findLast((s) => s.weightKg !== null)?.weightKg ?? null,
        };
      }),
    );
  if (exercisesError) {
    await db().from("fitness_routines").delete().eq("id", routine.id);
    return { error: "Could not save it. Try again." };
  }
  await db().from("fitness_workouts").update({ routine_id: routine.id }).eq("id", workoutId);
  refreshRoutine();
  return { error: null, id: routine.id };
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await db()
    .from("fitness_routines")
    .update({ name: parsed.data.name, note: parsed.data.note || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save it. Try again." };
  refreshRoutine(id);
  return { error: null };
}

export async function deleteRoutine(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Workout not found." };
  const { error } = await db().from("fitness_routines").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  refreshRoutine();
  return { error: null };
}

export async function addRoutineExercises(routineId: string, exerciseIds: string[]): Promise<Result> {
  await requireSession();
  const parsed = ids.safeParse(exerciseIds);
  if (!isId(routineId) || !parsed.success) return { error: "Pick at least one exercise." };
  const [routine, library] = await Promise.all([getRoutine(routineId), listExercises()]);
  if (!routine) return { error: "Workout not found." };
  const picked = parsed.data.flatMap((id) => library.filter((e) => e.id === id));
  if (routine.name === DEFAULT_ROUTINE_NAME && routine.exercises.length === 0) {
    const title = suggestTitle(picked);
    if (title) await db().from("fitness_routines").update({ name: title }).eq("id", routineId);
  }
  const { error } = await db()
    .from("fitness_routine_exercises")
    .insert(
      picked.map((e, i) => ({
        routine_id: routineId,
        exercise_id: e.id,
        position: routine.exercises.length + i,
        sets: e.measure === "duration" ? 1 : 3,
        reps: e.measure === "reps" ? e.reps : null,
        seconds: e.measure === "hold" ? e.seconds : e.measure === "duration" ? 1200 : null,
      })),
    );
  if (error) return { error: "Could not add them. Try again." };
  refreshRoutine(routineId);
  return { error: null };
}

async function routineOf(rowId: string): Promise<string | null> {
  const { data } = await db().from("fitness_routine_exercises").select("routine_id").eq("id", rowId).maybeSingle();
  return data?.routine_id ?? null;
}

/** The plan for one exercise: sets, reps or seconds, and a starting weight. */
export async function updateRoutineExercise(id: string, input: RoutineExerciseInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const parsed = routineExerciseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await db()
    .from("fitness_routine_exercises")
    .update({
      sets: parsed.data.sets,
      reps: parsed.data.reps,
      seconds: parsed.data.seconds,
      weight_kg: parsed.data.weightKg === null ? null : Math.round(parsed.data.weightKg * 10) / 10,
    })
    .eq("id", id)
    .select("routine_id")
    .maybeSingle();
  if (error || !data) return { error: "Could not save that. Try again." };
  refreshRoutine(data.routine_id);
  return { error: null };
}

export async function removeRoutineExercise(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const routineId = await routineOf(id);
  const { error } = await db().from("fitness_routine_exercises").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  refreshRoutine(routineId ?? undefined);
  return { error: null };
}

/** Moves an exercise one place up or down in your workout. */
export async function moveRoutineExercise(id: string, direction: -1 | 1): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Exercise not found." };
  const routineId = await routineOf(id);
  const routine = routineId ? await getRoutine(routineId) : null;
  if (!routine) return { error: "Exercise not found." };
  const order = routine.exercises.map((e) => e.id);
  const from = order.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= order.length) return { error: null };
  [order[from], order[to]] = [order[to], order[from]];
  const results = await Promise.all(
    order.map((rowId, position) => db().from("fitness_routine_exercises").update({ position }).eq("id", rowId)),
  );
  if (results.some((r) => r.error)) return { error: "Could not move it. Try again." };
  refreshRoutine(routine.id);
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
  if (!isId(id)) return { error: "Exercise not found." };
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
