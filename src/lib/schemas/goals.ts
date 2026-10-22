import { z } from "zod";

// Growth workspace: goals (with optional steps, a number to reach, notes and
// a target year) and achievements. Progress is shown, never judged: no
// "overdue", no red.

export const goalStatuses = ["active", "paused", "achieved", "let_go"] as const;
export type GoalStatus = (typeof goalStatuses)[number];

export const goalStatusLabels: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  achieved: "Achieved",
  let_go: "Let go",
};

export const MAX_GOAL_STEPS = 30;

const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

export const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Give your goal a name.").max(200, "Keep the name under 200 characters."),
    why: optionalText(2000, "Keep the why under 2000 characters."),
    targetYear: z.number().int().min(2000).max(2100).nullable(),
    metricTarget: z.number().positive("The number to reach should be above 0.").max(1e12).nullable(),
    metricUnit: optionalText(40, "Keep the unit short, like “books” or “km”."),
  })
  .refine((g) => !g.metricUnit || g.metricTarget !== null, {
    message: "Add the number to reach, or clear the unit.",
    path: ["metricTarget"],
  });
export type GoalInput = z.infer<typeof goalSchema>;

/** A new goal can come with its first steps. */
export const newGoalSchema = goalSchema.and(
  z.object({ steps: z.array(z.string().trim().min(1).max(200)).max(MAX_GOAL_STEPS, `Up to ${MAX_GOAL_STEPS} steps.`) }),
);
export type NewGoalInput = z.infer<typeof newGoalSchema>;

export const goalStepTitleSchema = z.string().trim().min(1, "Write the step first.").max(200, "Keep a step under 200 characters.");
export const goalNoteSchema = z.string().trim().min(1, "Write something first.").max(4000, "Keep a note under 4000 characters.");

export const achievementSchema = z.object({
  title: z.string().trim().min(1, "Say what you achieved.").max(200, "Keep it under 200 characters."),
  note: optionalText(2000, "Keep the note under 2000 characters."),
  achievedOn: z.iso.date(),
  goalId: z.uuid().nullable(),
});
export type AchievementInput = z.infer<typeof achievementSchema>;

/** How far along a goal is: by its number if it has one, else by its steps. Null when it has neither. */
export function goalProgress(goal: {
  metricTarget: number | null;
  metricCurrent: number;
  stepsDone: number;
  stepsTotal: number;
}): number | null {
  if (goal.metricTarget) return Math.min(1, Math.max(0, goal.metricCurrent / goal.metricTarget));
  if (goal.stepsTotal > 0) return goal.stepsDone / goal.stepsTotal;
  return null;
}

/** A number as people write it: 12, 2.5, 50,000. */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A YYYY-MM-DD date as "31 Dec 2026". */
export const formatDay = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

/** A target year told gently: "This year", "Next year", "By 2029", or "Target was 2025" once it's passed. */
export function describeTargetYear(target: number, currentYear: number): string {
  if (target < currentYear) return `Target was ${target}`;
  if (target === currentYear) return `This year (${target})`;
  if (target === currentYear + 1) return `Next year (${target})`;
  return `By ${target}`;
}
