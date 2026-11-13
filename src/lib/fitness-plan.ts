import {
  MUSCLE_LABELS,
  addDays,
  isoWeekday,
  weekStart,
  type Equipment,
  type Exercise,
  type ExerciseKind,
  type Muscle,
  type PlannedExercise,
  type WorkoutKind,
  type WorkoutPlan,
} from "@/lib/schemas";

// Today's workout ideas, from rules rather than AI: free, instant, and the
// same inputs give the same ideas (a new seed gives others). It looks at the
// time and equipment you have, which muscles had a rest, what you did this
// week, and which exercises you haven't done lately.

/** A workout from the last two weeks, as the rules need it. */
export type RecentWorkout = {
  day: string;
  kind: WorkoutKind;
  done: boolean;
  exercises: { exerciseId: string | null; muscles: Muscle[] }[];
};

export type PlanChoices = { minutes: number; kinds: ExerciseKind[]; equipment: Equipment[] };

const UPPER: Muscle[] = ["chest", "back", "shoulders", "arms"];
const LOWER: Muscle[] = ["legs", "glutes"];
const FOCUSES: { id: string; title: string; muscles: Muscle[] }[] = [
  { id: "lower", title: "Lower body", muscles: LOWER },
  { id: "upper", title: "Upper body", muscles: UPPER },
  { id: "full", title: "Full body", muscles: [...LOWER, ...UPPER, "core"] },
  { id: "core", title: "Core", muscles: ["core"] },
];

/** Never trained, or long enough ago that it makes no difference. */
const RESTED = 4;
/** Seconds of rest between sets, and between interval moves. */
const SET_REST = 60;
const HOLD_REST = 45;
const INTERVAL_REST = 20;
const MOBILITY_CHANGE = 15;
const WARMUP_MINUTES = 3;
const MAX_STRETCHES = 8;

// A small seeded random, so a shuffle is repeatable and the server and the
// browser agree. Never call it inside a sort's comparison: engines compare a
// different number of times, and the two would drift apart.
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function whenLabel(day: string, today: string): string {
  const days = daysBetween(day, today);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return days < 7 ? WEEKDAY_NAMES[isoWeekday(day) - 1] : `${days} days ago`;
}

function listLabel(muscles: Muscle[]): string {
  const names = muscles.map((m) => MUSCLE_LABELS[m].toLowerCase());
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The gym has the small kit too. */
function expand(equipment: Equipment[]): Set<Equipment> {
  const set = new Set(equipment);
  if (set.has("gym")) for (const e of ["dumbbells", "kettlebell", "bands", "body"] as const) set.add(e);
  return set;
}

/** Strength sticks to what you picked; cardio and stretching can always use your body. */
export function isAvailable(exercise: Exercise, equipment: Equipment[]): boolean {
  if (exercise.hidden) return false;
  const have = expand(exercise.kind === "strength" ? equipment : [...equipment, "body"]);
  return exercise.equipment.some((e) => have.has(e));
}

/** Seconds an exercise takes as planned, rests included. */
export function plannedSeconds(e: PlannedExercise, kind: ExerciseKind): number {
  const sides = e.eachSide ? 2 : 1;
  const sets = e.sets ?? 1;
  if (e.reps !== null) return sets * (sides * 40 + SET_REST);
  if (e.seconds === null) return 0;
  if (e.sets === null) return e.seconds; // steady cardio
  const rest = kind === "mobility" ? MOBILITY_CHANGE : kind === "cardio" ? INTERVAL_REST : HOLD_REST;
  return sets * (sides * e.seconds + rest);
}

function toPlanned(e: Exercise, sets: number | null): PlannedExercise {
  return {
    exerciseId: e.id,
    name: e.name,
    sets,
    reps: e.measure === "reps" ? e.reps : null,
    seconds: e.measure === "hold" ? e.seconds : null,
    eachSide: e.eachSide,
  };
}

type Context = {
  today: string;
  minutes: number;
  equipment: Equipment[];
  pool: Exercise[];
  /** Days since each muscle was last trained in a strength workout. */
  rest: Record<Muscle, number>;
  lastDay: Partial<Record<Muscle, string>>;
  /** Days since each exercise was last done. */
  used: Map<string, number>;
  thisWeek: Record<WorkoutKind, number>;
  rand: () => number;
};

type Candidate = { plan: WorkoutPlan; score: number; family: string };

/** The time it really takes, to the nearest 5 minutes, never more than you have. */
const roundedMinutes = (ctx: Context, seconds: number) => Math.min(ctx.minutes, Math.max(5, Math.round(seconds / 300) * 5));

/** Ideas that fill much less than the time you have rank lower. */
const fillPenalty = (used: number, budget: number) => Math.max(0, 0.8 - used / budget) * 3;

/** Sorts best first by a score, with a random number per item drawn once, up front. */
function rankBy<T extends { id: string }>(items: T[], score: (item: T) => number, rand: () => number): T[] {
  const noise = new Map(items.map((item) => [item.id, rand()]));
  return [...items].sort((a, b) => score(b) + noise.get(b.id)! - (score(a) + noise.get(a.id)!));
}

/** Lower for exercises done lately, so the same ones don't keep coming back. */
function freshness(ctx: Context, e: Exercise): number {
  const days = ctx.used.get(e.id);
  if (days === undefined) return 0;
  return days <= 3 ? -1.5 : days <= 7 ? -0.5 : 0;
}

function strengthWorkout(ctx: Context, focus: (typeof FOCUSES)[number]): Candidate | null {
  const warmup = ctx.minutes >= 20 ? WARMUP_MINUTES : 0;
  const budget = (ctx.minutes - warmup) * 60;
  let sets = ctx.minutes <= 15 ? 2 : ctx.minutes >= 45 ? 4 : 3;
  const tired = (m: Muscle) => ctx.rest[m] <= 1;
  const picked = new Set<Equipment>(ctx.equipment.filter((e) => e !== "body"));

  const pool = ctx.pool.filter((e) => e.kind === "strength" && e.muscles.some((m) => focus.muscles.includes(m)));
  const noise = new Map(pool.map((e) => [e.id, ctx.rand()]));
  const chosen: PlannedExercise[] = [];
  const covered = new Map<Muscle, number>();
  let used = 0;

  while (chosen.length < 8) {
    let best: { e: Exercise; score: number } | null = null;
    for (const e of pool) {
      if (chosen.some((c) => c.exerciseId === e.id)) continue;
      // Past the first two, only what still fits the time: a shorter one
      // can fill the gap a longer one would overrun.
      if (chosen.length >= 2 && used + plannedSeconds(toPlanned(e, sets), "strength") > budget * 1.05) continue;
      const focusMuscles = e.muscles.filter((m) => focus.muscles.includes(m));
      // Muscles this workout hasn't reached yet count most.
      const reach = focusMuscles.reduce((sum, m) => sum + 1 / (1 + (covered.get(m) ?? 0)), 0);
      const score =
        2 * reach +
        freshness(ctx, e) -
        e.muscles.filter(tired).length +
        // What you picked (dumbbells, say) over plain bodyweight.
        (e.equipment.some((q) => picked.has(q) || (q !== "body" && picked.has("gym"))) ? 1 : 0) +
        noise.get(e.id)!;
      if (!best || score > best.score) best = { e, score };
    }
    if (!best) break;
    const planned = toPlanned(best.e, sets);
    chosen.push(planned);
    used += plannedSeconds(planned, "strength");
    for (const m of best.e.muscles) covered.set(m, (covered.get(m) ?? 0) + 1);
  }
  if (chosen.length < 2) return null;
  // Few exercises fit (say, core with dumbbells only): more sets of them.
  if (used < budget * 0.75) {
    sets = Math.min(5, Math.max(sets, Math.round((sets * budget) / used)));
    for (const c of chosen) c.sets = sets;
    used = chosen.reduce((sum, c) => sum + plannedSeconds(c, "strength"), 0);
  }

  const rested = focus.muscles.reduce((sum, m) => sum + Math.min(ctx.rest[m], RESTED), 0) / focus.muscles.length;
  const tiredShare = focus.muscles.filter(tired).length / focus.muscles.length;
  const score =
    rested -
    4 * tiredShare +
    (focus.id === "full" && ctx.thisWeek.strength === 0 ? 0.8 : 0) +
    (focus.id === "core" ? (ctx.minutes <= 15 ? 0.3 : -1.5) : 0) +
    (ctx.thisWeek.strength >= 3 ? -1 : 0) -
    fillPenalty(used, budget);

  const last = focus.muscles.map((m) => ctx.lastDay[m]).filter((d): d is string => !!d).sort().at(-1);
  const why = !last
    ? focus.id === "full"
      ? "Everything is rested: a good day for all of it"
      : `${focus.title} hasn't had a session lately`
    : tiredShare > 0
      ? `Some of these worked ${whenLabel(last, ctx.today)}: go lighter if they're tired`
      : `Last worked ${whenLabel(last, ctx.today)}, rested now`;

  return {
    plan: { title: focus.title, kind: "strength", minutes: roundedMinutes(ctx, used + warmup * 60), why, exercises: chosen },
    score,
    family: `strength:${focus.id}`,
  };
}

function steadyCardio(ctx: Context): Candidate | null {
  const options = ctx.pool.filter((e) => e.kind === "cardio" && e.measure === "duration");
  if (options.length === 0 || ctx.minutes < 10) return null;
  const e = rankBy(options, (o) => freshness(ctx, o), ctx.rand)[0];
  return {
    plan: {
      title: e.name,
      kind: "cardio",
      minutes: ctx.minutes,
      why: ctx.thisWeek.cardio === 0 ? "No cardio yet this week" : "Easy on the joints, good for the heart",
      exercises: [{ ...toPlanned(e, null), seconds: ctx.minutes * 60 }],
    },
    score: 2.2 + (ctx.thisWeek.cardio === 0 ? 1 : 0) + (ctx.minutes >= 30 ? 0.5 : -0.3) + ctx.rand() * 0.3,
    family: "cardio:steady",
  };
}

function intervals(ctx: Context): Candidate | null {
  const options = ctx.pool.filter((e) => e.kind === "cardio" && e.measure === "hold");
  if (options.length < 3) return null;
  const warmup = ctx.minutes >= 20 ? WARMUP_MINUTES : 0;
  const budget = (ctx.minutes - warmup) * 60;
  const legsTired = ctx.rest.legs <= 1;
  const ranked = rankBy(options, (o) => freshness(ctx, o) - (legsTired && o.muscles.includes("legs") ? 1 : 0), ctx.rand);
  // Rounds of 4-6 moves; more moves rather than many rounds of the same ones.
  let moves = Math.min(4, ranked.length);
  const roundOf = (n: number) => ranked.slice(0, n).reduce((sum, e) => sum + (e.seconds ?? 30) + INTERVAL_REST, 0);
  while (moves < Math.min(6, ranked.length) && budget / roundOf(moves) > 4) moves++;
  const rounds = Math.max(1, Math.min(10, Math.round(budget / roundOf(moves))));
  return {
    plan: {
      title: "Cardio intervals",
      kind: "cardio",
      minutes: roundedMinutes(ctx, rounds * roundOf(moves) + warmup * 60),
      why: `${rounds} ${rounds === 1 ? "round" : "rounds"} of ${moves} moves, ${INTERVAL_REST} s rest between moves`,
      exercises: ranked.slice(0, moves).map((e) => toPlanned(e, rounds)),
    },
    score: 2.2 + (ctx.thisWeek.cardio === 0 ? 1 : 0) + (ctx.minutes <= 20 ? 0.5 : -0.3) - (legsTired ? 0.5 : 0) + ctx.rand() * 0.3,
    family: "cardio:intervals",
  };
}

function stretching(ctx: Context, focusTired: boolean): Candidate | null {
  const recent = (Object.keys(ctx.rest) as Muscle[]).filter((m) => ctx.rest[m] <= 1);
  const focus: Muscle[] = focusTired ? recent : ["back", "glutes", "legs"];
  if (focusTired && focus.length === 0) return null;
  const options = ctx.pool.filter((e) => e.kind === "mobility");
  if (options.length < 3) return null;
  const ranked = rankBy(options, (e) => (e.muscles.some((m) => focus.includes(m)) ? 2 : 0) + freshness(ctx, e) * 0.5, ctx.rand);

  const budget = ctx.minutes * 60;
  const chosen: PlannedExercise[] = [];
  let used = 0;
  for (const e of ranked) {
    const planned = toPlanned(e, 1);
    const cost = plannedSeconds(planned, "mobility");
    if (chosen.length >= MAX_STRETCHES || (chosen.length >= 3 && used + cost > budget * 1.05)) break;
    chosen.push(planned);
    used += cost;
  }
  // Longer sessions hold each stretch again rather than adding more.
  const rounds = Math.min(3, Math.max(1, Math.round(budget / used)));
  for (const c of chosen) c.sets = rounds;
  used *= rounds;

  return {
    plan: {
      title: focusTired ? "Recovery stretch" : "Back and hips",
      kind: "mobility",
      minutes: roundedMinutes(ctx, used),
      why: focusTired
        ? `For the ${listLabel(focus)} you trained ${whenLabel(focus.map((m) => ctx.lastDay[m]!).sort().at(-1)!, ctx.today)}`
        : ctx.thisWeek.mobility === 0
          ? "No stretching yet this week"
          : "For stiffness from sitting",
      exercises: chosen,
    },
    score:
      1.8 +
      (focusTired ? 1 : 0) +
      (ctx.thisWeek.mobility === 0 ? 0.5 : 0) +
      (ctx.minutes <= 10 ? 1 : 0) -
      (ctx.minutes >= 45 ? 1 : 0) -
      fillPenalty(used, budget) +
      ctx.rand() * 0.3,
    family: focusTired ? "mobility:recovery" : "mobility:general",
  };
}

/**
 * Up to three workout ideas for today, best first: different kinds when any
 * kind will do, different focuses within one.
 */
export function suggestWorkouts(
  library: Exercise[],
  recent: RecentWorkout[],
  choices: PlanChoices,
  today: string,
  seed = 0,
): WorkoutPlan[] {
  const rest = Object.fromEntries(Object.keys(MUSCLE_LABELS).map((m) => [m, RESTED + 1])) as Record<Muscle, number>;
  const lastDay: Partial<Record<Muscle, string>> = {};
  const used = new Map<string, number>();
  const thisWeek: Record<WorkoutKind, number> = { strength: 0, cardio: 0, mobility: 0, sport: 0 };
  const monday = weekStart(today);

  for (const w of recent) {
    if (!w.done || w.day > today) continue;
    const days = daysBetween(w.day, today);
    if (w.day >= monday) thisWeek[w.kind]++;
    for (const e of w.exercises) {
      if (e.exerciseId) used.set(e.exerciseId, Math.min(used.get(e.exerciseId) ?? Infinity, days));
      if (w.kind !== "strength") continue;
      for (const m of e.muscles) {
        if (days < rest[m]) rest[m] = days;
        if (!lastDay[m] || w.day > lastDay[m]) lastDay[m] = w.day;
      }
    }
  }

  const ctx: Context = {
    today,
    minutes: choices.minutes,
    equipment: choices.equipment,
    pool: library.filter((e) => isAvailable(e, choices.equipment)),
    rest,
    lastDay,
    used,
    thisWeek,
    rand: random(seed * 7919 + choices.minutes * 31 + daysBetween("2026-01-01", today)),
  };

  const kinds = choices.kinds.length > 0 ? choices.kinds : (["strength", "cardio", "mobility"] as const);
  const candidates: Candidate[] = [];
  if (kinds.includes("strength") && choices.equipment.length > 0)
    for (const focus of FOCUSES) {
      const c = strengthWorkout(ctx, focus);
      if (c) candidates.push(c);
    }
  if (kinds.includes("cardio")) candidates.push(...[steadyCardio(ctx), intervals(ctx)].filter((c) => c !== null));
  if (kinds.includes("mobility")) candidates.push(...[stretching(ctx, true), stretching(ctx, false)].filter((c) => c !== null));

  candidates.sort((a, b) => b.score - a.score);
  const picked: Candidate[] = [];
  const perKind = kinds.length === 1 ? 3 : 1;
  for (const c of candidates) {
    if (picked.length === 3) break;
    if (picked.filter((p) => p.plan.kind === c.plan.kind).length >= perKind) continue;
    picked.push(c);
  }
  // Fewer kinds than slots: fill with the next best of any kind.
  for (const c of candidates) {
    if (picked.length === 3) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked.map((c) => c.plan);
}

/** Another exercise for the same job, for "Swap": same kind, a shared muscle, at hand. */
export function swapFor(
  library: Exercise[],
  current: Exercise,
  inWorkout: Set<string>,
  equipment: Equipment[],
  seed: number,
): Exercise | null {
  const options = library.filter(
    (e) =>
      e.id !== current.id &&
      !inWorkout.has(e.id) &&
      e.kind === current.kind &&
      e.measure === current.measure &&
      isAvailable(e, equipment.length > 0 ? equipment : ["body"]) &&
      (current.muscles.length === 0 || e.muscles.some((m) => current.muscles.includes(m))),
  );
  if (options.length === 0) return null;
  const shared = (e: Exercise) => e.muscles.filter((m) => current.muscles.includes(m)).length;
  return rankBy(options, shared, random(seed))[0];
}

/** Days from Monday to Sunday of the week `today` is in. */
export const weekDays = (today: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));
