"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Dumbbell, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EQUIPMENT_LABELS,
  KIND_LABELS,
  MUSCLE_LABELS,
  NO_FILTER,
  equipmentKinds,
  exerciseKinds,
  filterExercises,
  muscleGroups,
  pictureUrls,
  type Exercise,
  type ExerciseFilter,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Finding exercises: search by name, filter by muscle (and kind and
// equipment), on the Exercises page and when adding to a workout.

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-highlight hover:text-highlight-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** A row of choices that scrolls sideways on a phone instead of wrapping. */
function PillRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {children}
    </div>
  );
}

export function ExerciseFilters({
  filter,
  onChange,
  more = true,
  autoFocus,
}: {
  filter: ExerciseFilter;
  onChange: (filter: ExerciseFilter) => void;
  /** Kind and equipment too, not just the muscles. */
  more?: boolean;
  autoFocus?: boolean;
}) {
  const set = (next: Partial<ExerciseFilter>) => onChange({ ...filter, ...next });
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filter.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search exercises"
          aria-label="Search exercises by name"
          autoFocus={autoFocus}
          className="h-11 rounded-xl bg-background pl-9 md:text-base"
        />
      </div>
      <PillRow label="Muscle">
        <Pill on={filter.muscle === "all"} onClick={() => set({ muscle: "all" })}>
          All muscles
        </Pill>
        {muscleGroups.map((m) => (
          <Pill key={m} on={filter.muscle === m} onClick={() => set({ muscle: filter.muscle === m ? "all" : m })}>
            {MUSCLE_LABELS[m]}
          </Pill>
        ))}
      </PillRow>
      {more && (
        <>
          <PillRow label="Kind">
            <Pill on={filter.kind === "all"} onClick={() => set({ kind: "all" })}>
              All kinds
            </Pill>
            {exerciseKinds.map((k) => (
              <Pill key={k} on={filter.kind === k} onClick={() => set({ kind: filter.kind === k ? "all" : k })}>
                {KIND_LABELS[k]}
              </Pill>
            ))}
          </PillRow>
          <PillRow label="Equipment">
            <Pill on={filter.equipment === "all"} onClick={() => set({ equipment: "all" })}>
              Any equipment
            </Pill>
            {equipmentKinds.map((e) => (
              <Pill key={e} on={filter.equipment === e} onClick={() => set({ equipment: filter.equipment === e ? "all" : e })}>
                {EQUIPMENT_LABELS[e]}
              </Pill>
            ))}
          </PillRow>
        </>
      )}
    </div>
  );
}

export function ExerciseThumb({ exercise, className }: { exercise: { picture: string | null }; className?: string }) {
  return exercise.picture ? (
    // eslint-disable-next-line @next/next/no-img-element -- small, already resized
    <img src={pictureUrls(exercise.picture)[1]} alt="" loading="lazy" className={cn("shrink-0 rounded-xl bg-muted object-cover", className)} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground", className)}>
      <Dumbbell className="size-5" />
    </span>
  );
}

/** Pick one or more exercises to add, then add them all at once. */
export function ExercisePicker({
  exercises,
  already,
  onAdd,
  onClose,
}: {
  exercises: Exercise[];
  /** Already in the workout: marked, still addable. */
  already: Set<string>;
  onAdd: (ids: string[]) => Promise<{ error: string | null }>;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<ExerciseFilter>(NO_FILTER);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = filterExercises(
    exercises.filter((e) => !e.hidden),
    filter,
  );

  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/10 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <Dialog.Title className="text-lg font-semibold text-heading">Add exercises</Dialog.Title>
              <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" disabled={pending} />}>
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <ExerciseFilters filter={filter} onChange={setFilter} more={false} />
          </div>

          <ul className="flex-1 overflow-y-auto px-2 py-2">
            {shown.map((e) => {
              const on = picked.includes(e.id);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted",
                      on && "bg-highlight/35 hover:bg-highlight/45",
                    )}
                  >
                    <ExerciseThumb exercise={e} className="size-16" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{e.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[e.muscles.map((m) => MUSCLE_LABELS[m]).join(", ") || KIND_LABELS[e.kind], already.has(e.id) && "already in"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full ring-2 transition-colors",
                        on ? "bg-primary text-primary-foreground ring-primary" : "ring-foreground/15",
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing matches. Try another word.</li>}
          </ul>

          <div className="flex flex-col gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {error && (
              <p className="text-sm text-coral-foreground" role="alert">
                {error}
              </p>
            )}
            <Button
              size="lg"
              className="h-12 rounded-xl text-base"
              disabled={picked.length === 0 || pending}
              onClick={() =>
                start(async () => {
                  const result = await onAdd(picked);
                  if (result.error) setError(result.error);
                  else onClose();
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {picked.length === 0 ? "Pick exercises" : `Add ${picked.length} ${picked.length === 1 ? "exercise" : "exercises"}`}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
