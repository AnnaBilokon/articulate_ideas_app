"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, type Exercise, type Routine } from "@/lib/schemas";
import { startOwnWorkout, startRoutine } from "../../actions";
import { ExercisePicker, ExerciseThumb } from "../../exercise-picker";

export function PastWorkout({ routines, library, today }: { routines: Routine[]; library: Exercise[]; today: string }) {
  const router = useRouter();
  const [day, setDay] = useState(addDays(today, -1));
  const [picking, setPicking] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const open = (key: string, task: () => Promise<{ error: string | null; id?: string }>) => {
    setStarting(key);
    setError(null);
    start(async () => {
      const result = await task();
      if (result.id) router.replace(`/fitness/workouts/${result.id}`);
      else {
        setError(result.error ?? "Something went wrong. Try again.");
        setStarting(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-56 flex-col gap-2">
        <Label htmlFor="past-day">Which day?</Label>
        <Input
          id="past-day"
          type="date"
          min={addDays(today, -366)}
          max={today}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          required
          className="h-11 rounded-xl bg-card md:text-base"
        />
      </div>

      {routines.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="from-yours">
          <h2 id="from-yours" className="text-lg font-semibold tracking-tight text-heading">
            One of your workouts
          </h2>
          <ul className="flex flex-col gap-2">
            {routines.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={starting !== null || !day}
                  onClick={() => open(r.id, () => startRoutine(r.id, day))}
                  className="group flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md disabled:opacity-70"
                >
                  <span className="flex -space-x-2">
                    {r.exercises.slice(0, 3).map((e) => (
                      <ExerciseThumb key={e.id} exercise={e} className="size-10 rounded-full ring-2 ring-card" />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-heading">{r.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.exercises.length} {r.exercises.length === 1 ? "exercise" : "exercises"}
                    </span>
                  </span>
                  {starting === r.id ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2" aria-labelledby="pick">
        <h2 id="pick" className="text-lg font-semibold tracking-tight text-heading">
          {routines.length > 0 ? "Or pick the exercises" : "Pick the exercises"}
        </h2>
        <Button variant="outline" size="lg" className="h-12 w-fit rounded-xl px-5" disabled={starting !== null || !day} onClick={() => setPicking(true)}>
          {starting === "pick" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Pick exercises
        </Button>
      </section>

      <p className="text-sm text-muted-foreground">
        Next, fill in the kg and reps you did, tick the sets, and save it with the minutes it took.
      </p>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}

      {picking && (
        <ExercisePicker
          exercises={library}
          already={new Set()}
          onAdd={async (ids) => {
            setStarting("pick");
            const result = await startOwnWorkout("Workout", ids, day);
            if (result.id) router.replace(`/fitness/workouts/${result.id}`);
            else setStarting(null);
            return result;
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
