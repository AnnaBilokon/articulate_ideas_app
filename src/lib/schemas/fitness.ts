import { z } from "zod";

// Fitness workspace: the exercise library, workouts and what you log. Dates
// are YYYY-MM-DD in the app's time zone.

export const exerciseKinds = ["strength", "cardio", "mobility"] as const;
export type ExerciseKind = (typeof exerciseKinds)[number];

/** A workout's kind: an exercise kind, or a sport or class logged as done. */
export const workoutKinds = [...exerciseKinds, "sport"] as const;
export type WorkoutKind = (typeof workoutKinds)[number];

export const KIND_LABELS: Record<WorkoutKind, string> = {
  strength: "Strength",
  cardio: "Cardio",
  mobility: "Mobility",
  sport: "Sport or class",
};

/** Colour classes for each kind's badge or dot. */
export const KIND_TONES: Record<WorkoutKind, { soft: string; dot: string }> = {
  strength: { soft: "bg-info-soft text-info-foreground", dot: "bg-info" },
  cardio: { soft: "bg-coral-soft text-coral-foreground", dot: "bg-coral" },
  mobility: { soft: "bg-success-soft text-success-foreground", dot: "bg-success" },
  sport: { soft: "bg-sunflower-soft text-sunflower-foreground", dot: "bg-sunflower" },
};

export const equipmentKinds = ["body", "dumbbells", "bands", "kettlebell", "gym"] as const;
export type Equipment = (typeof equipmentKinds)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  body: "Bodyweight",
  dumbbells: "Dumbbells",
  bands: "Bands",
  kettlebell: "Kettlebell",
  gym: "Gym",
};

export const muscleGroups = ["legs", "glutes", "chest", "back", "shoulders", "arms", "core"] as const;
export type Muscle = (typeof muscleGroups)[number];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  legs: "Legs",
  glutes: "Glutes",
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
};

/** Sets of reps, a hold or interval in seconds, or minutes of steady cardio. */
export const measures = ["reps", "hold", "duration"] as const;
export type Measure = (typeof measures)[number];

export const feelings = ["easy", "good", "hard"] as const;
export type Feeling = (typeof feelings)[number];

export const FEELING_LABELS: Record<Feeling, string> = { easy: "Easy", good: "Good", hard: "Hard" };

/** The time choices on Today, in minutes. */
export const TIME_CHOICES = [10, 20, 30, 45, 60] as const;

export type Exercise = {
  id: string;
  name: string;
  kind: ExerciseKind;
  equipment: Equipment[];
  muscles: Muscle[];
  measure: Measure;
  reps: number | null;
  seconds: number | null;
  eachSide: boolean;
  how: string | null;
  /** Start and end photos, in public/exercise-pictures; null for none. */
  picture: string | null;
  hidden: boolean;
};

/** One exercise in a planned workout. Minutes of cardio are in `seconds`. */
export type PlannedExercise = {
  exerciseId: string | null;
  name: string;
  sets: number | null;
  reps: number | null;
  seconds: number | null;
  eachSide: boolean;
  /** A weight to start from, from your own workout; last time's wins. */
  weightKg?: number | null;
};

export type WorkoutPlan = {
  title: string;
  kind: ExerciseKind;
  minutes: number;
  /** Why this one today, in a line ("Legs rested since Monday"). */
  why: string | null;
  exercises: PlannedExercise[];
  /** One of your own workouts, fitted to the time. */
  routineId?: string | null;
};

const name = z.string().trim().min(1, "Give it a name.").max(80, "Keep the name under 80 characters.");
const equipmentList = z.array(z.enum(equipmentKinds)).max(equipmentKinds.length);

export const exerciseSchema = z
  .object({
    name,
    kind: z.enum(exerciseKinds),
    equipment: equipmentList.min(1, "Pick what it needs: Bodyweight if nothing."),
    muscles: z.array(z.enum(muscleGroups)).max(muscleGroups.length),
    measure: z.enum(measures),
    reps: z.number().int().min(1, "At least 1 rep.").max(100, "At most 100 reps.").nullable(),
    seconds: z.number().int().min(5, "At least 5 seconds.").max(600, "At most 10 minutes.").nullable(),
    eachSide: z.boolean(),
    how: z.string().trim().max(400, "Keep the cue under 400 characters."),
  })
  .refine((e) => e.measure !== "reps" || e.reps !== null, { message: "How many reps?", path: ["reps"] })
  .refine((e) => e.measure !== "hold" || e.seconds !== null, { message: "How many seconds?", path: ["seconds"] });
export type ExerciseInput = z.infer<typeof exerciseSchema>;

const plannedExerciseSchema = z.object({
  exerciseId: z.uuid().nullable(),
  name,
  sets: z.number().int().min(1).max(10).nullable(),
  reps: z.number().int().min(1).max(100).nullable(),
  seconds: z.number().int().min(5).max(7200).nullable(),
  eachSide: z.boolean(),
  weightKg: z.number().min(0).max(999).nullable().optional(),
});

export const workoutPlanSchema = z.object({
  title: name,
  kind: z.enum(exerciseKinds),
  minutes: z.number().int().min(1).max(600),
  why: z.string().max(300).nullable(),
  exercises: z.array(plannedExerciseSchema).min(1).max(20),
  routineId: z.uuid().nullable().optional(),
});

export const startWorkoutSchema = z.object({
  plan: workoutPlanSchema,
  equipment: equipmentList,
  source: z.enum(["rules", "ai"]),
});

/** Where a workout came from: a suggestion, your own, or logged afterwards. */
export const workoutSources = ["rules", "ai", "routine", "own", "logged"] as const;
export type WorkoutSource = (typeof workoutSources)[number];

const weightKg = z.number().min(0, "A weight can't be negative.").max(999, "That's a lot: under 1000 kg.").nullable();

/** A set as you log it: reps (or seconds) and weight, and whether it's done. */
export const setSchema = z.object({
  reps: z.number().int().min(0, "Reps can't be negative.").max(200, "At most 200 reps.").nullable(),
  seconds: z.number().int().min(0).max(7200, "At most 2 hours.").nullable(),
  weightKg,
  done: z.boolean(),
});
export type SetInput = z.infer<typeof setSchema>;

// Your own workouts ("routines"): exercises you like, with the plan for each.

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  name: string;
  kind: ExerciseKind;
  measure: Measure;
  equipment: Equipment[];
  muscles: Muscle[];
  picture: string | null;
  eachSide: boolean;
  sets: number;
  reps: number | null;
  seconds: number | null;
  weightKg: number | null;
};

export type Routine = {
  id: string;
  name: string;
  note: string | null;
  exercises: RoutineExercise[];
  /** The day it was last done, or null. */
  lastDone: string | null;
};

export const routineSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(80, "Keep the name under 80 characters."),
  note: z.string().trim().max(1000, "Keep the note under 1000 characters."),
});
export type RoutineInput = z.infer<typeof routineSchema>;

export const routineExerciseSchema = z.object({
  sets: z.number().int().min(1, "At least 1 set.").max(10, "At most 10 sets."),
  reps: z.number().int().min(1, "At least 1 rep.").max(100, "At most 100 reps.").nullable(),
  seconds: z.number().int().min(5, "At least 5 seconds.").max(7200, "At most 2 hours.").nullable(),
  weightKg,
});
export type RoutineExerciseInput = z.infer<typeof routineExerciseSchema>;

/** Sets for an exercise as planned: 3 sets of 10, or 3 holds of 30 s. */
export function plannedSets(e: { measure: Measure | null; sets: number | null; reps: number | null; seconds: number | null }) {
  if (e.measure === "duration") return [{ targetReps: null, targetSeconds: e.seconds ?? 1200 }];
  return Array.from({ length: e.sets ?? 3 }, () => ({
    targetReps: e.measure === "hold" ? null : (e.reps ?? 10),
    targetSeconds: e.measure === "hold" ? (e.seconds ?? 30) : null,
  }));
}

export type ExerciseFilter = { query: string; muscle: Muscle | "all"; kind: ExerciseKind | "all"; equipment: Equipment | "all" };

export const NO_FILTER: ExerciseFilter = { query: "", muscle: "all", kind: "all", equipment: "all" };

/** Search by name (any word order) and filter by muscle, kind and equipment. */
export function filterExercises<T extends Pick<Exercise, "name" | "muscles" | "kind" | "equipment">>(list: T[], f: ExerciseFilter): T[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(
    (e) =>
      words.every((w) => e.name.toLowerCase().includes(w)) &&
      (f.muscle === "all" || e.muscles.includes(f.muscle)) &&
      (f.kind === "all" || e.kind === f.kind) &&
      (f.equipment === "all" || e.equipment.includes(f.equipment)),
  );
}
export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;

export const finishWorkoutSchema = z.object({
  minutes: z.number().int().min(1, "At least a minute.").max(600, "At most 10 hours."),
  feeling: z.enum(feelings).nullable(),
  note: z.string().trim().max(1000, "Keep the note under 1000 characters."),
});
export type FinishWorkoutInput = z.infer<typeof finishWorkoutSchema>;

/** Something done without a planned workout: a class, a match, a run. */
export const logActivitySchema = z.object({
  title: name,
  kind: z.enum(workoutKinds),
  minutes: z.number().int().min(1, "At least a minute.").max(600, "At most 10 hours."),
  day: z.iso.date(),
  feeling: z.enum(feelings).nullable(),
  note: z.string().trim().max(1000, "Keep the note under 1000 characters."),
});
export type LogActivityInput = z.infer<typeof logActivitySchema>;

/** The choices for "Ask AI": what you have, and anything you'd like. */
export const aiWorkoutRequestSchema = z.object({
  minutes: z.number().int().min(5).max(180),
  kinds: z.array(z.enum(exerciseKinds)).max(exerciseKinds.length),
  equipment: equipmentList.min(1, "Pick what you have."),
  wish: z.string().trim().max(300, "Keep it under 300 characters."),
});
export type AiWorkoutRequest = z.infer<typeof aiWorkoutRequestSchema>;

/** "3 × 10", "3 × 10 each side", "30 s", "2 × 30 s each side", "20 min". */
export function prescription(e: Pick<PlannedExercise, "sets" | "reps" | "seconds" | "eachSide">): string {
  const side = e.eachSide ? " each side" : "";
  if (e.reps !== null) return `${e.sets ?? 1} × ${e.reps}${side}`;
  if (e.seconds !== null && e.seconds >= 300 && e.sets === null) return `${Math.round(e.seconds / 60)} min`;
  if (e.seconds !== null) return `${e.sets && e.sets > 1 ? `${e.sets} × ` : ""}${e.seconds} s${side}`;
  return "";
}

/** The start and end photos of an exercise that has them. */
export const pictureUrls = (picture: string) => [0, 1].map((n) => `/exercise-pictures/${picture}-${n}.webp`);

/** A video search for any exercise, for those without photos (and anyone who wants to see it move). */
export const videoSearchUrl = (name: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise how to`)}`;

/** Whether a weight makes sense to note: it uses more than your body. */
export const takesWeight = (equipment: Equipment[], measure: Measure | null) =>
  measure !== "duration" && equipment.some((e) => e === "dumbbells" || e === "kettlebell" || e === "gym");

/** "8 kg × 10", "× 7", "30 s", "20 min": one set as done or planned. */
export function setLabel(set: { reps: number | null; seconds: number | null; weightKg: number | null }, measure: Measure | null): string {
  if (measure === "duration" && set.seconds !== null) return `${Math.round(set.seconds / 60)} min`;
  const amount = set.reps !== null ? `${set.reps}` : set.seconds !== null ? `${set.seconds} s` : "";
  return set.weightKg !== null ? `${formatKg(set.weightKg)} kg × ${amount}` : set.reps !== null ? `× ${amount}` : amount;
}

export const formatKg = (kg: number) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1));
