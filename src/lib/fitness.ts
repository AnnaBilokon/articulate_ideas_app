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
  type WorkoutKind,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The Fitness workspace: the exercise library and your workouts.

export type WorkoutExercise = {
  id: string;
  exerciseId: string | null;
  name: string;
  sets: number | null;
  reps: number | null;
  seconds: number | null;
  eachSide: boolean;
  weightKg: number | null;
  done: boolean;
  /** From the library; null once the exercise is deleted from it. */
  equipment: Equipment[];
  measure: Measure | null;
  muscles: Muscle[];
  how: string | null;
  picture: string | null;
};

export type Workout = {
  id: string;
  day: string;
  title: string;
  kind: WorkoutKind;
  minutes: number;
  equipment: Equipment[];
  source: "rules" | "ai" | "logged";
  doneAt: string | null;
  feeling: Feeling | null;
  note: string | null;
  exercises: WorkoutExercise[];
};

const EXERCISE_COLUMNS = "id, name, kind, equipment, muscles, measure, reps, seconds, each_side, how, picture, hidden_at";

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

const WORKOUT_COLUMNS =
  "id, day, title, kind, minutes, equipment, source, done_at, feeling, note, fitness_workout_exercises(id, exercise_id, name, position, sets, reps, seconds, each_side, weight_kg, done_at, fitness_exercises(equipment, measure, muscles, how, picture))";

type WorkoutRow = {
  id: string;
  day: string;
  title: string;
  kind: string;
  minutes: number;
  equipment: string[];
  source: string;
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
    weight_kg: number | null;
    done_at: string | null;
    fitness_exercises: { equipment: string[]; measure: string; muscles: string[]; how: string | null; picture: string | null } | null;
  }[];
};

function toWorkout(r: WorkoutRow): Workout {
  return {
    id: r.id,
    day: r.day,
    title: r.title,
    kind: r.kind as WorkoutKind,
    minutes: r.minutes,
    equipment: r.equipment as Equipment[],
    source: r.source as Workout["source"],
    doneAt: r.done_at,
    feeling: r.feeling as Feeling | null,
    note: r.note,
    exercises: [...r.fitness_workout_exercises]
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        seconds: e.seconds,
        eachSide: e.each_side,
        weightKg: e.weight_kg === null ? null : Number(e.weight_kg),
        done: e.done_at !== null,
        equipment: (e.fitness_exercises?.equipment ?? []) as Equipment[],
        measure: (e.fitness_exercises?.measure ?? null) as Measure | null,
        muscles: (e.fitness_exercises?.muscles ?? []) as Muscle[],
        how: e.fitness_exercises?.how ?? null,
        picture: e.fitness_exercises?.picture ?? null,
      })),
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
