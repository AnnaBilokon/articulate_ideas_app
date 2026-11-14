import "server-only";
import type { RecentWorkout } from "@/lib/fitness-plan";
import { localDate } from "@/lib/schedule";
import {
  addDays,
  type Equipment,
  type Exercise,
  type ExerciseKind,
  type Feeling,
  type Measure,
  type Muscle,
  type Routine,
  type RoutineExercise,
  type WorkoutKind,
  type WorkoutSource,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The Fitness workspace: the exercise library, your own workouts (routines)
// and the workouts you've done, set by set.

export type WorkoutSet = {
  id: string;
  targetReps: number | null;
  targetSeconds: number | null;
  reps: number | null;
  seconds: number | null;
  weightKg: number | null;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string | null;
  name: string;
  /** The plan: sets of reps, holds of seconds, or minutes of cardio. */
  sets: number | null;
  reps: number | null;
  seconds: number | null;
  eachSide: boolean;
  logged: WorkoutSet[];
  /** Every set ticked off. */
  done: boolean;
  /** From the library; empty or null once the exercise is deleted from it. */
  kind: ExerciseKind | null;
  equipment: Equipment[];
  measure: Measure | null;
  muscles: Muscle[];
  how: string | null;
  picture: string | null;
  steps: string[];
};

export type Workout = {
  id: string;
  createdAt: string;
  day: string;
  title: string;
  kind: WorkoutKind;
  minutes: number;
  equipment: Equipment[];
  source: WorkoutSource;
  routineId: string | null;
  doneAt: string | null;
  feeling: Feeling | null;
  note: string | null;
  exercises: WorkoutExercise[];
};

const EXERCISE_COLUMNS = "id, name, kind, equipment, muscles, measure, reps, seconds, each_side, how, picture, steps, hidden_at";

type ExerciseRow = {
  id: string;
  name: string;
  kind: string;
  equipment: string[];
  muscles: string[];
  measure: string;
  reps: number | null;
  seconds: number | null;
  each_side: boolean;
  how: string | null;
  picture: string | null;
  steps: string[] | null;
  hidden_at: string | null;
};

export const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  kind: r.kind as ExerciseKind,
  equipment: r.equipment as Equipment[],
  muscles: r.muscles as Muscle[],
  measure: r.measure as Measure,
  reps: r.reps,
  seconds: r.seconds,
  eachSide: r.each_side,
  how: r.how,
  picture: r.picture,
  steps: r.steps ?? [],
  hidden: r.hidden_at !== null,
});

/** The whole library, hidden exercises too, by name. */
export async function listExercises(): Promise<Exercise[]> {
  const { data } = await db().from("fitness_exercises").select(EXERCISE_COLUMNS).order("name");
  return (data ?? []).map(toExercise);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data } = await db().from("fitness_exercises").select(EXERCISE_COLUMNS).eq("id", id).maybeSingle();
  return data ? toExercise(data) : null;
}

const SET_COLUMNS = "id, position, target_reps, target_seconds, reps, seconds, weight_kg, done_at";

type SetRow = {
  id: string;
  position: number;
  target_reps: number | null;
  target_seconds: number | null;
  reps: number | null;
  seconds: number | null;
  weight_kg: number | null;
  done_at: string | null;
};

const byPosition = (a: { position: number; id: string }, b: { position: number; id: string }) =>
  a.position - b.position || a.id.localeCompare(b.id);

const toSet = (s: SetRow): WorkoutSet => ({
  id: s.id,
  targetReps: s.target_reps,
  targetSeconds: s.target_seconds,
  reps: s.reps,
  seconds: s.seconds,
  weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
  done: s.done_at !== null,
});

const WORKOUT_COLUMNS = `id, created_at, day, title, kind, minutes, equipment, source, routine_id, done_at, feeling, note, fitness_workout_exercises(id, exercise_id, name, position, sets, reps, seconds, each_side, fitness_sets(${SET_COLUMNS}), fitness_exercises(kind, equipment, measure, muscles, how, picture, steps))`;

type WorkoutRow = {
  id: string;
  created_at: string;
  day: string;
  title: string;
  kind: string;
  minutes: number;
  equipment: string[];
  source: string;
  routine_id: string | null;
  done_at: string | null;
  feeling: string | null;
  note: string | null;
  fitness_workout_exercises: {
    id: string;
    exercise_id: string | null;
    name: string;
    position: number;
    sets: number | null;
    reps: number | null;
    seconds: number | null;
    each_side: boolean;
    fitness_sets: SetRow[];
    fitness_exercises: {
      kind: string;
      equipment: string[];
      measure: string;
      muscles: string[];
      how: string | null;
      picture: string | null;
      steps: string[] | null;
    } | null;
  }[];
};

function toWorkout(r: WorkoutRow): Workout {
  return {
    id: r.id,
    createdAt: r.created_at,
    day: r.day,
    title: r.title,
    kind: r.kind as WorkoutKind,
    minutes: r.minutes,
    equipment: r.equipment as Equipment[],
    source: r.source as WorkoutSource,
    routineId: r.routine_id,
    doneAt: r.done_at,
    feeling: r.feeling as Feeling | null,
    note: r.note,
    exercises: [...r.fitness_workout_exercises].sort(byPosition).map((e) => {
      const logged = [...e.fitness_sets].sort(byPosition).map(toSet);
      return {
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        seconds: e.seconds,
        eachSide: e.each_side,
        logged,
        done: logged.length > 0 && logged.every((s) => s.done),
        kind: (e.fitness_exercises?.kind ?? null) as ExerciseKind | null,
        equipment: (e.fitness_exercises?.equipment ?? []) as Equipment[],
        measure: (e.fitness_exercises?.measure ?? null) as Measure | null,
        muscles: (e.fitness_exercises?.muscles ?? []) as Muscle[],
        how: e.fitness_exercises?.how ?? null,
        picture: e.fitness_exercises?.picture ?? null,
        steps: e.fitness_exercises?.steps ?? [],
      };
    }),
  };
}

/** Workouts from `from` to today, newest first; started ones too. */
export async function listWorkouts(from: string, today: string = localDate()): Promise<Workout[]> {
  const { data } = await db()
    .from("fitness_workouts")
    .select(WORKOUT_COLUMNS)
    .gte("day", from)
    .lte("day", today)
    .order("day", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map(toWorkout);
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const { data } = await db().from("fitness_workouts").select(WORKOUT_COLUMNS).eq("id", id).maybeSingle();
  return data ? toWorkout(data) : null;
}

/** What you did last time with an exercise: the day and each set done. */
export type LastTime = { day: string; sets: { reps: number | null; seconds: number | null; weightKg: number | null }[] };

/**
 * For each exercise, its sets from the last finished workout that had it
 * (not counting `exceptWorkoutId`), so you can see and beat last time.
 */
export async function lastTimes(exerciseIds: string[], exceptWorkoutId?: string): Promise<Map<string, LastTime>> {
  const result = new Map<string, LastTime>();
  if (exerciseIds.length === 0) return result;
  const { data } = await db()
    .from("fitness_workout_exercises")
    .select(`exercise_id, workout_id, fitness_workouts!inner(day, done_at, created_at), fitness_sets(${SET_COLUMNS})`)
    .in("exercise_id", [...new Set(exerciseIds)])
    .not("fitness_workouts.done_at", "is", null)
    .order("created_at", { referencedTable: "fitness_workouts", ascending: false })
    .limit(500);

  const rows = (data ?? [])
    .filter((r) => r.workout_id !== exceptWorkoutId && r.exercise_id)
    .sort(
      (a, b) =>
        b.fitness_workouts.day.localeCompare(a.fitness_workouts.day) ||
        b.fitness_workouts.created_at.localeCompare(a.fitness_workouts.created_at),
    );
  for (const r of rows) {
    const done = [...r.fitness_sets].sort(byPosition).filter((s) => s.done_at !== null);
    if (done.length === 0 || result.has(r.exercise_id!)) continue;
    result.set(r.exercise_id!, {
      day: r.fitness_workouts.day,
      sets: done.map((s) => ({ reps: s.reps, seconds: s.seconds, weightKg: s.weight_kg === null ? null : Number(s.weight_kg) })),
    });
  }
  return result;
}

/** The last two weeks, as the suggestion rules need them. */
export const RECENT_DAYS = 14;

export function toRecent(workouts: Workout[]): RecentWorkout[] {
  return workouts.map((w) => ({
    day: w.day,
    kind: w.kind,
    done: w.doneAt !== null,
    exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, muscles: e.muscles })),
  }));
}

export const recentFrom = (today: string) => addDays(today, -RECENT_DAYS);

// Your own workouts

const ROUTINE_COLUMNS =
  "id, name, note, position, created_at, fitness_routine_exercises(id, exercise_id, position, sets, reps, seconds, weight_kg, fitness_exercises(name, kind, measure, equipment, muscles, picture, each_side))";

type RoutineRow = {
  id: string;
  name: string;
  note: string | null;
  fitness_routine_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    sets: number;
    reps: number | null;
    seconds: number | null;
    weight_kg: number | null;
    fitness_exercises: {
      name: string;
      kind: string;
      measure: string;
      equipment: string[];
      muscles: string[];
      picture: string | null;
      each_side: boolean;
    };
  }[];
};

function toRoutine(r: RoutineRow, lastDone: string | null): Routine {
  return {
    id: r.id,
    name: r.name,
    note: r.note,
    lastDone,
    exercises: [...r.fitness_routine_exercises].sort(byPosition).map(
      (e): RoutineExercise => ({
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.fitness_exercises.name,
        kind: e.fitness_exercises.kind as ExerciseKind,
        measure: e.fitness_exercises.measure as Measure,
        equipment: e.fitness_exercises.equipment as Equipment[],
        muscles: e.fitness_exercises.muscles as Muscle[],
        picture: e.fitness_exercises.picture,
        eachSide: e.fitness_exercises.each_side,
        sets: e.sets,
        reps: e.reps,
        seconds: e.seconds,
        weightKg: e.weight_kg === null ? null : Number(e.weight_kg),
      }),
    ),
  };
}

async function lastDoneByRoutine(ids: string[]): Promise<Map<string, string>> {
  const last = new Map<string, string>();
  if (ids.length === 0) return last;
  const { data } = await db()
    .from("fitness_workouts")
    .select("routine_id, day")
    .in("routine_id", ids)
    .not("done_at", "is", null)
    .order("day", { ascending: false });
  for (const w of data ?? []) if (w.routine_id && !last.has(w.routine_id)) last.set(w.routine_id, w.day);
  return last;
}

/** Your own workouts, in your order, then newest first. */
export async function listRoutines(): Promise<Routine[]> {
  const { data } = await db()
    .from("fitness_routines")
    .select(ROUTINE_COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  const last = await lastDoneByRoutine((data ?? []).map((r) => r.id));
  return (data ?? []).map((r) => toRoutine(r, last.get(r.id) ?? null));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data } = await db().from("fitness_routines").select(ROUTINE_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const last = await lastDoneByRoutine([id]);
  return toRoutine(data, last.get(id) ?? null);
}
