"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createRoutine, startEmptyWorkout, startRoutine } from "./actions";

// Buttons that start something and open it: a workout of your own, an empty
// one, or a new workout to put together.

function useStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (task: () => Promise<{ error: string | null; id?: string }>, to: (id: string) => string) =>
    start(async () => {
      const result = await task();
      if (result.error || !result.id) setError(result.error ?? "Something went wrong. Try again.");
      else router.push(to(result.id));
    });
  return { error, pending, run };
}

const errorLine = (error: string | null) =>
  error && (
    <span className="text-xs text-coral-foreground" role="alert">
      {error}
    </span>
  );

export function StartEmptyButton({ className }: { className?: string }) {
  const { error, pending, run } = useStart();
  return (
    <span className="flex flex-col gap-1">
      <Button
        size="lg"
        disabled={pending}
        className={cn("h-12 rounded-xl px-5 text-base", className)}
        onClick={() => run(startEmptyWorkout, (id) => `/fitness/workouts/${id}`)}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4.5" />} Start empty workout
      </Button>
      {errorLine(error)}
    </span>
  );
}

export function NewRoutineButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { error, pending, run } = useStart();
  return (
    <>
      <button type="button" disabled={pending} className={className} onClick={() => run(createRoutine, (id) => `/fitness/routines/${id}`)}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
        {children}
      </button>
      {errorLine(error)}
    </>
  );
}

export function StartRoutineButton({ routineId, disabled }: { routineId: string; disabled?: boolean }) {
  const { error, pending, run } = useStart();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        disabled={pending || disabled}
        className="h-10 rounded-xl px-4"
        onClick={() => run(() => startRoutine(routineId), (id) => `/fitness/workouts/${id}`)}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start
      </Button>
      {errorLine(error)}
    </span>
  );
}
