import { formatAmount, type GoalColor, type GoalStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Small pieces shared by the goal pages and Journey home.

/** A goal's progress; in the goal's own colour when it has one. */
export function ProgressBar({
  value,
  label,
  color,
  className,
}: {
  value: number;
  label: string;
  color?: GoalColor;
  className?: string;
}) {
  const bar = color && `var(--goal-${color}-bar)`;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      style={bar ? { background: `color-mix(in oklab, ${bar} 18%, transparent)` } : undefined}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", bar ? "" : value >= 1 ? "bg-success" : "bg-primary")}
        style={{ width: `${Math.max(value > 0 ? 4 : 0, value * 100)}%`, background: bar }}
      />
    </div>
  );
}

/** "4 of 12 books", or "3 of 5 steps"; null when the goal tracks neither. */
export function progressText(goal: {
  metricTarget: number | null;
  metricCurrent: number;
  metricUnit: string | null;
  stepsDone: number;
  stepsTotal: number;
}): string | null {
  if (goal.metricTarget) {
    return `${formatAmount(goal.metricCurrent)} of ${formatAmount(goal.metricTarget)}${goal.metricUnit ? ` ${goal.metricUnit}` : ""}`;
  }
  if (goal.stepsTotal > 0) return `${goal.stepsDone} of ${goal.stepsTotal} ${goal.stepsTotal === 1 ? "step" : "steps"}`;
  return null;
}

export const statusTone: Record<GoalStatus, string> = {
  active: "bg-info-soft text-info-foreground",
  paused: "bg-muted text-muted-foreground",
  achieved: "bg-success-soft text-success-foreground",
  let_go: "bg-muted text-muted-foreground",
};
