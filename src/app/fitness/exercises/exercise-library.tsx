"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EQUIPMENT_LABELS,
  KIND_LABELS,
  MUSCLE_LABELS,
  NO_FILTER,
  equipmentKinds,
  exerciseKinds,
  filterExercises,
  muscleGroups,
  type Equipment,
  type Exercise,
  type ExerciseFilter,
  type ExerciseInput,
  type ExerciseKind,
  type Measure,
} from "@/lib/schemas";
import { createExercise, deleteExercise, setExerciseHidden, updateExercise } from "../actions";
import { ExerciseFilters, ExerciseThumb } from "../exercise-picker";
import { Chip, ExerciseHow, KindBadge } from "../fitness-bits";

const MEASURE_LABELS: Record<Measure, string> = { reps: "Reps", hold: "Seconds", duration: "Minutes (steady)" };

const defaultAmount = (e: Exercise) =>
  e.measure === "duration"
    ? "as long as you have"
    : `${e.measure === "reps" ? `${e.reps} reps` : `${e.seconds} s`}${e.eachSide ? " each side" : ""}`;

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [filter, setFilter] = useState<ExerciseFilter>(NO_FILTER);
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);

  const shown = filterExercises(exercises, filter);
  const visible = shown.filter((e) => !e.hidden);
  const hidden = shown.filter((e) => e.hidden);

  return (
    <div className="flex flex-col gap-5">
      <ExerciseFilters filter={filter} onChange={setFilter} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "exercise" : "exercises"}
        </p>
        <Button variant="outline" className="rounded-xl" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add your own
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {visible.map((e) => (
          <li key={e.id}>
            <ExerciseRow exercise={e} onEdit={() => setEditing(e)} />
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="hidden-exercises">
          <h2 id="hidden-exercises" className="text-lg font-semibold tracking-tight text-heading">
            Hidden
          </h2>
          <p className="-mt-1 text-sm text-muted-foreground">Not suggested in workouts.</p>
          <ul className="flex flex-col gap-2 opacity-70">
            {hidden.map((e) => (
              <li key={e.id}>
                <ExerciseRow exercise={e} onEdit={() => setEditing(e)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <ExerciseEditor
          key={editing === "new" ? "new" : editing.id}
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ExerciseRow({ exercise: e, onEdit }: { exercise: Exercise; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center gap-3 rounded-2xl bg-card p-2.5 text-left shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-primary/30 sm:p-3"
    >
      <ExerciseThumb exercise={e} className="size-14" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{e.name}</span>
          <KindBadge kind={e.kind} />
        </span>
        <span className="text-xs text-muted-foreground">
          {[
            e.equipment.map((q) => EQUIPMENT_LABELS[q]).join(" or "),
            e.muscles.map((m) => MUSCLE_LABELS[m]).join(", "),
            defaultAmount(e),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <Pencil className="size-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
    </button>
  );
}

function ExerciseEditor({ existing, onClose }: { existing: Exercise | null; onClose: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [kind, setKind] = useState<ExerciseKind>(existing?.kind ?? "strength");
  const [equipment, setEquipment] = useState<Equipment[]>(existing?.equipment ?? ["body"]);
  const [muscles, setMuscles] = useState(existing?.muscles ?? []);
  const [measure, setMeasure] = useState<Measure>(existing?.measure ?? "reps");
  const [reps, setReps] = useState(String(existing?.reps ?? 10));
  const [seconds, setSeconds] = useState(String(existing?.seconds ?? 30));
  const [eachSide, setEachSide] = useState(existing?.eachSide ?? false);
  const [how, setHow] = useState(existing?.how ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  function run(task: () => Promise<{ error: string | null }>) {
    start(async () => {
      const result = await task();
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function save() {
    const input: ExerciseInput = {
      name,
      kind,
      equipment,
      muscles,
      measure,
      reps: measure === "reps" ? Number(reps) || null : null,
      seconds: measure === "hold" ? Number(seconds) || null : null,
      eachSide: measure !== "duration" && eachSide,
      how,
    };
    run(() => (existing ? updateExercise(existing.id, input) : createExercise(input)));
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-5 text-card-foreground shadow-xl ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="font-semibold text-heading">{existing ? "Change exercise" : "Add an exercise"}</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" disabled={pending} />}>
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {existing && <ExerciseHow name={existing.name} how={null} picture={existing.picture} />}

          <form
            className="flex flex-col gap-4"
            onSubmit={(x) => {
              x.preventDefault();
              save();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="exercise-name">Name</Label>
              <Input
                id="exercise-name"
                value={name}
                onChange={(x) => setName(x.target.value)}
                maxLength={80}
                required
                autoFocus={!existing}
                className="h-10 bg-background md:text-base"
              />
            </div>

            <Group label="Kind">
              {exerciseKinds.map((k) => (
                <Chip
                  key={k}
                  on={kind === k}
                  onClick={() => {
                    setKind(k);
                    if (k !== "cardio" && measure === "duration") setMeasure(k === "mobility" ? "hold" : "reps");
                  }}
                >
                  {KIND_LABELS[k]}
                </Chip>
              ))}
            </Group>

            <Group label="Works with (any of)">
              {equipmentKinds.map((e) => (
                <Chip key={e} on={equipment.includes(e)} onClick={() => setEquipment(toggle(equipment, e))}>
                  {EQUIPMENT_LABELS[e]}
                </Chip>
              ))}
            </Group>

            <Group label="Muscles">
              {muscleGroups.map((m) => (
                <Chip key={m} on={muscles.includes(m)} onClick={() => setMuscles(toggle(muscles, m))}>
                  {MUSCLE_LABELS[m]}
                </Chip>
              ))}
            </Group>

            <Group label="Counted in">
              {(kind === "cardio" ? (["reps", "hold", "duration"] as const) : (["reps", "hold"] as const)).map((m) => (
                <Chip key={m} on={measure === m} onClick={() => setMeasure(m)}>
                  {MEASURE_LABELS[m]}
                </Chip>
              ))}
            </Group>

            {measure !== "duration" && (
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex w-28 flex-col gap-2">
                  <Label htmlFor="exercise-amount">{measure === "reps" ? "Reps per set" : "Seconds"}</Label>
                  <Input
                    id="exercise-amount"
                    type="number"
                    inputMode="numeric"
                    min={measure === "reps" ? 1 : 5}
                    max={measure === "reps" ? 100 : 600}
                    value={measure === "reps" ? reps : seconds}
                    onChange={(x) => (measure === "reps" ? setReps : setSeconds)(x.target.value)}
                    required
                    className="h-10 bg-background md:text-base"
                  />
                </div>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={eachSide}
                    onChange={(x) => setEachSide(x.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Each side
                </label>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="exercise-how">How to do it (optional)</Label>
              <Textarea
                id="exercise-how"
                value={how}
                onChange={(x) => setHow(x.target.value)}
                maxLength={400}
                rows={2}
                placeholder="A short cue to remember"
                className="bg-background"
              />
            </div>

            {error && (
              <p className="text-sm text-coral-foreground" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
              {existing && (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setExerciseHidden(existing.id, !existing.hidden))}
                  >
                    {existing.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    {existing.hidden ? "Show again" : "Hide"}
                  </Button>
                  {confirmDelete ? (
                    <Button type="button" variant="destructive" disabled={pending} onClick={() => run(() => deleteExercise(existing.id))}>
                      Delete for good
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      className="text-muted-foreground hover:text-coral-foreground"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
            {confirmDelete && (
              <p className="text-xs text-muted-foreground">Past workouts keep it by name. To stop seeing it in ideas, Hide is enough.</p>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
