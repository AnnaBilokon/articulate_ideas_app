"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Moon, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { HabitInput } from "@/lib/schemas";
import { deleteHabit, setHabitResting } from "./actions";
import { HabitForm } from "./habit-form";

// "New habit", and on a habit's page: edit, rest or bring back, delete.

export function NewHabit({ first }: { first: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {first ? "Add your first habit" : "New habit"}
      </Button>
    );
  }
  return (
    <Card>
      <CardContent>
        <HabitForm onDone={() => setOpen(false)} />
      </CardContent>
    </Card>
  );
}

export function EditHabit({ habitId, initial }: { habitId: string; initial: HabitInput }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit
      </Button>
    );
  }
  return (
    <Card className="w-full">
      <CardContent>
        <HabitForm habitId={habitId} initial={initial} onDone={() => setOpen(false)} />
      </CardContent>
    </Card>
  );
}

export function RestHabit({ habitId, resting }: { habitId: string; resting: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col gap-1">
      <Button variant="ghost" disabled={pending} onClick={() => start(async () => setError((await setHabitResting(habitId, !resting)).error))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : resting ? <Play className="size-4" /> : <Moon className="size-4" />}
        {resting ? "Bring it back" : "Rest it for now"}
      </Button>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </span>
  );
}

// Two steps: the first click asks, the second deletes.
export function DeleteHabit({ habitId, title }: { habitId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete habit
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-labelledby="delete-habit">
      <p id="delete-habit" className="font-medium text-coral-foreground">
        Delete “{title}”?
      </p>
      <p className="text-sm">This removes it and every day you ticked off. To keep its history, rest it instead.</p>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await deleteHabit(habitId);
              if (result.error) setError(result.error);
              else router.push("/growth/habits");
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete for good
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
