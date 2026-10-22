import "server-only";
import { makeSpeakingExercise, speakingFeedback, speakingFollowUp } from "@/lib/ai/speaking";
import {
  SPEAKING_PLAN,
  SPEAKING_SAVED_PREFIX,
  currentPlanDay,
  speakingFeedbackSchema,
  speakingFollowUpFeedbackSchema,
  speakingProfileSchema,
  type SpeakingFeedback,
  type SpeakingFollowUpFeedback,
  type SpeakingProfile,
  type SpeakingSkill,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

// The speaking coach's data: the profile, the plan position, exercises, and
// the expressions saved from it into Vocabulary (their context starts with
// SPEAKING_SAVED_PREFIX), which later exercises bring back.

export class SpeakingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function speakingProfile(): Promise<SpeakingProfile | null> {
  const { data } = await db().from("speaking_profile").select("goals, challenges, level, contexts, topics").eq("id", 1).maybeSingle();
  const parsed = speakingProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type SpeakingExercise = {
  id: string;
  createdAt: string;
  day: number;
  skill: SpeakingSkill;
  topic: string;
  scenario: string;
  question: string;
  tip: string | null;
  revisit: string[];
  answer: string | null;
  spoken: boolean | null;
  feedback: SpeakingFeedback | null;
  followUpAnswer: string | null;
  followUpFeedback: SpeakingFollowUpFeedback | null;
  completedAt: string | null;
};

const COLUMNS =
  "id, created_at, plan_day, skill, topic, scenario, question, tip, revisit, answer, spoken, feedback, follow_up_answer, follow_up_feedback, completed_at";

type Row = {
  id: string;
  created_at: string;
  plan_day: number;
  skill: string;
  topic: string;
  scenario: string;
  question: string;
  tip: string | null;
  revisit: string[];
  answer: string | null;
  spoken: boolean | null;
  feedback: unknown;
  follow_up_answer: string | null;
  follow_up_feedback: unknown;
  completed_at: string | null;
};

const toExercise = (r: Row): SpeakingExercise => {
  const feedback = speakingFeedbackSchema.safeParse(r.feedback);
  const followUp = speakingFollowUpFeedbackSchema.safeParse(r.follow_up_feedback);
  return {
    id: r.id,
    createdAt: r.created_at,
    day: r.plan_day,
    skill: r.skill as SpeakingSkill,
    topic: r.topic,
    scenario: r.scenario,
    question: r.question,
    tip: r.tip,
    revisit: r.revisit,
    answer: r.answer,
    spoken: r.spoken,
    feedback: feedback.success ? feedback.data : null,
    followUpAnswer: r.follow_up_answer,
    followUpFeedback: followUp.success ? followUp.data : null,
    completedAt: r.completed_at,
  };
};

export async function speakingExercise(id: string): Promise<SpeakingExercise | null> {
  const { data } = await db().from("speaking_exercises").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toExercise(data) : null;
}

export type SavedExpression = { word: string; dueAt: string | null; lastScore: number | null };

export type SpeakingOverview = {
  day: number;
  freePractice: boolean;
  doneByDay: Record<number, number>;
  done: number;
  open: SpeakingExercise | null;
  recent: SpeakingExercise[];
  saved: SavedExpression[];
  /** Times a saved expression came back into an answer. */
  reused: number;
};

async function savedExpressions(): Promise<SavedExpression[]> {
  const { data } = await db()
    .from("vocabulary_words")
    .select("word, due_at, last_score, created_at")
    .ilike("context", `${SPEAKING_SAVED_PREFIX}%`)
    .order("created_at", { ascending: false });
  return (data ?? []).map((w) => ({ word: w.word, dueAt: w.due_at, lastScore: w.last_score }));
}

export async function speakingOverview(): Promise<SpeakingOverview> {
  const [{ data }, saved] = await Promise.all([
    db().from("speaking_exercises").select(COLUMNS).order("created_at", { ascending: false }),
    savedExpressions(),
  ]);
  const exercises = (data ?? []).map(toExercise);
  const doneByDay = new Map<number, number>();
  for (const e of exercises) if (e.completedAt) doneByDay.set(e.day, (doneByDay.get(e.day) ?? 0) + 1);
  const { day, freePractice } = currentPlanDay(doneByDay);
  const reused = exercises.reduce(
    (n, e) => n + (e.feedback?.used_revisit.length ?? 0),
    0,
  );
  return {
    day,
    freePractice,
    doneByDay: Object.fromEntries(doneByDay),
    done: exercises.filter((e) => e.completedAt).length,
    open: exercises.find((e) => !e.completedAt) ?? null,
    recent: exercises.filter((e) => e.completedAt).slice(0, 5),
    saved,
    reused,
  };
}

/** Makes the next exercise on a topic, for the current plan day. */
export async function startSpeakingExercise(topic: string): Promise<string> {
  const profile = await speakingProfile();
  if (!profile) throw new SpeakingError("Set up the coach first.");
  const overview = await speakingOverview();
  // In free practice the four skills take turns (days 2, 4, 9 and 12).
  const plan = overview.freePractice ? SPEAKING_PLAN[[1, 3, 8, 11][overview.done % 4]] : SPEAKING_PLAN[overview.day - 1];

  // Saved expressions practised least first, a handful at a time.
  const revisitPool = [...overview.saved]
    .sort((a, b) => (a.lastScore ?? -1) - (b.lastScore ?? -1))
    .slice(0, 8)
    .map((s) => s.word);
  const { value, usage } = await makeSpeakingExercise({
    profile,
    day: plan.day,
    topic,
    recent: overview.recent.map((e) => ({ scenario: e.scenario, note: e.feedback?.clarity ?? null })),
    revisitPool,
  });
  console.log(`speaking exercise (day ${plan.day}):`, usage);

  const { data, error } = await db()
    .from("speaking_exercises")
    .insert({
      plan_day: plan.day,
      skill: plan.skill,
      topic,
      scenario: value.scenario,
      question: value.question,
      tip: value.tip || null,
      revisit: value.revisit,
    })
    .select("id")
    .single();
  if (error) throw new SpeakingError("Could not save the exercise. Try again.", 500);
  return data.id;
}

export async function answerSpeakingExercise(id: string, answer: { text: string; spoken: boolean }): Promise<SpeakingExercise> {
  const [profile, exercise] = await Promise.all([speakingProfile(), speakingExercise(id)]);
  if (!profile) throw new SpeakingError("Set up the coach first.");
  if (!exercise) throw new SpeakingError("Exercise not found.", 404);
  if (exercise.feedback) throw new SpeakingError("This one is answered already.");

  const { value, usage } = await speakingFeedback({
    profile,
    day: exercise.day,
    scenario: exercise.scenario,
    question: exercise.question,
    revisit: exercise.revisit,
    answer: answer.text,
    spoken: answer.spoken,
  });
  console.log(`speaking feedback ${id}:`, usage);
  const { data, error } = await db()
    .from("speaking_exercises")
    .update({ answer: answer.text, spoken: answer.spoken, feedback: value })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new SpeakingError("Could not save your answer. Try again.", 500);
  return toExercise(data);
}

/** The follow-up answer (or skipping it) completes the exercise. */
export async function followUpSpeakingExercise(
  id: string,
  answer: { text: string; spoken: boolean } | null,
): Promise<SpeakingExercise> {
  const [profile, exercise] = await Promise.all([speakingProfile(), speakingExercise(id)]);
  if (!profile) throw new SpeakingError("Set up the coach first.");
  if (!exercise?.feedback) throw new SpeakingError("Answer the exercise first.");
  if (exercise.completedAt) throw new SpeakingError("This one is done already.");

  let followUp: SpeakingFollowUpFeedback | null = null;
  if (answer) {
    const { value, usage } = await speakingFollowUp({
      profile,
      question: exercise.feedback.follow_up,
      expressions: exercise.feedback.expressions,
      answer: answer.text,
      spoken: answer.spoken,
    });
    console.log(`speaking follow-up ${id}:`, usage);
    followUp = value;
  }
  const { data, error } = await db()
    .from("speaking_exercises")
    .update({
      follow_up_answer: answer?.text ?? null,
      follow_up_feedback: followUp,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new SpeakingError("Could not save your answer. Try again.", 500);
  return toExercise(data);
}
