"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/schemas";
import { startOwnWorkout } from "../../actions";
import { ExercisePicker } from "../../exercise-picker";

export function NewWorkout({ library }: { library: Exercise[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("Workout");
  const [picking, setPicking] = useState(true);

  return (
    <div className="flex flex-col gap-5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        maxLength={80}
        aria-label="Workout name"
        className="-mx-2 rounded-lg bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight text-heading outline-none hover:bg-muted/60 focus:bg-muted/60"
      />
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border px-6 py-10 text-center">
        <p className="font-medium text-heading">Add the exercises you want to do</p>
        <p className="text-sm text-muted-foreground">Search by name or pick a muscle group. You can add more as you go.</p>
        <Button size="lg" className="h-11 rounded-xl px-5" onClick={() => setPicking(true)}>
          <Plus className="size-4" /> Add exercises
        </Button>
      </div>
      {picking && (
        <ExercisePicker
          exercises={library}
          already={new Set()}
          onAdd={async (ids) => {
            const result = await startOwnWorkout(title, ids);
            if (result.id) router.replace(`/fitness/workouts/${result.id}`);
            return result;
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
