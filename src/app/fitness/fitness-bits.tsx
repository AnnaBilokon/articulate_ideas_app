import { Check, PlayCircle } from "lucide-react";
import { KIND_LABELS, KIND_TONES, WEEKDAYS, pictureUrls, videoSearchUrl, type WorkoutKind } from "@/lib/schemas";
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

/** Monday to Sunday: a dot for each workout done, in its kind's colour. On the dark hero by default. */
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
        return (
          <li
            key={day}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl py-2",
              day === today ? "bg-white/20 ring-1 ring-[#99d5c9]/70" : "bg-white/8",
              day > today && "opacity-55",
            )}
            aria-label={`${WEEKDAYS[i].short}: ${kinds.length === 0 ? "nothing" : kinds.map((k) => KIND_LABELS[k]).join(", ")}`}
          >
            <span className="text-xs font-medium text-white/75">{WEEKDAYS[i].short}</span>
            <span className="flex h-6 items-center gap-0.5">
              {kinds.length === 0 ? (
                <span className="size-1.5 rounded-full bg-white/30" />
              ) : kinds.length === 1 ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-[#99d5c9] text-[#1d1236]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : (
                kinds.slice(0, 3).map((k, j) => <span key={j} className={cn("size-2.5 rounded-full ring-1 ring-white/40", KIND_TONES[k].dot)} />)
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The start and end photos, taking turns. */
export function ExercisePicture({ picture, name, className }: { picture: string; name: string; className?: string }) {
  const [start, end] = pictureUrls(picture);
  return (
    <span className={cn("relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small, already resized */}
      <img src={start} alt={`${name}, start and end position`} loading="lazy" className="absolute inset-0 size-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element -- small, already resized */}
      <img src={end} alt="" loading="lazy" className="exercise-end-frame absolute inset-0 size-full object-contain" />
    </span>
  );
}

/** How to do it: the photos if there are any, the cue, and a video search. */
export function ExerciseHow({ name, how, picture }: { name: string; how: string | null; picture: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      {picture && <ExercisePicture picture={picture} name={name} className="w-full max-w-md" />}
      {how && <p className="text-sm leading-6 text-muted-foreground">{how}</p>}
      <a
        href={videoSearchUrl(name)}
        target="_blank"
        rel="noreferrer"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <PlayCircle className="size-4" /> Watch a video
      </a>
    </div>
  );
}

export const minutesLabel = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
