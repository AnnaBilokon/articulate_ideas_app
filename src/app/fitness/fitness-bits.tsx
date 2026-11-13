import { Check } from "lucide-react";
import { KIND_LABELS, KIND_TONES, WEEKDAYS, type WorkoutKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Small pieces shared by the Fitness pages.

/** A choice that can be on or off: time, kind, equipment. */
export function Chip({
  on,
  onClick,
  disabled,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
        on ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-highlight hover:text-highlight-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function KindBadge({ kind, className }: { kind: WorkoutKind; className?: string }) {
  return (
    <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-medium", KIND_TONES[kind].soft, className)}>
      {KIND_LABELS[kind]}
    </span>
  );
}

/** Monday to Sunday: a dot for each workout done, in its kind's colour. */
export function WeekStrip({
  days,
  today,
  done,
}: {
  days: string[];
  today: string;
  done: { day: string; kind: WorkoutKind }[];
}) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="This week">
      {days.map((day, i) => {
        const kinds = done.filter((w) => w.day === day).map((w) => w.kind);
        const future = day > today;
        return (
          <li
            key={day}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl py-2",
              day === today ? "bg-highlight/60 ring-1 ring-primary/30" : "bg-muted/50",
              future && "opacity-50",
            )}
            aria-label={`${WEEKDAYS[i].short}: ${kinds.length === 0 ? "nothing" : kinds.map((k) => KIND_LABELS[k]).join(", ")}`}
          >
            <span className="text-xs font-medium text-muted-foreground">{WEEKDAYS[i].short}</span>
            <span className="flex h-5 items-center gap-0.5">
              {kinds.length === 0 ? (
                <span className="size-1.5 rounded-full bg-foreground/15" />
              ) : kinds.length === 1 ? (
                <span className={cn("flex size-5 items-center justify-center rounded-full text-background", KIND_TONES[kinds[0]].dot)}>
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : (
                kinds.slice(0, 3).map((k, j) => <span key={j} className={cn("size-2.5 rounded-full", KIND_TONES[k].dot)} />)
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const minutesLabel = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
