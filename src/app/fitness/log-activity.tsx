"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FEELING_LABELS, KIND_LABELS, addDays, feelings, workoutKinds, type Feeling, type WorkoutKind } from "@/lib/schemas";
import { logActivity } from "./actions";
import { Chip } from "./fitness-bits";

// Something done without a planned workout: a class, a match, a run with
// friends. It counts in the week like any workout.

export function LogActivity({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<WorkoutKind>("sport");
  const [minutes, setMinutes] = useState("45");
  const [day, setDay] = useState(today);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log something you did
      </Button>
    );
  }

  function save() {
    start(async () => {
      const result = await logActivity({ title, kind, minutes: Number(minutes), day, feeling, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setTitle("");
      setNote("");
      setFeeling(null);
      setError(null);
    });
  }

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-title">What did you do?</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              autoFocus
              placeholder="Padel, a yoga class, a long walk…"
              className="h-10 bg-background md:text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kind">
            {workoutKinds.map((k) => (
              <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
                {KIND_LABELS[k]}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-minutes">Minutes</Label>
              <Input
                id="activity-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                required
                className="h-10 bg-background md:text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-day">Day</Label>
              <Input
                id="activity-day"
                type="date"
                min={addDays(today, -366)}
                max={today}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
                className="h-10 bg-background md:text-base"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">How did it feel? (optional)</span>
            <div className="flex flex-wrap gap-2">
              {feelings.map((f) => (
                <Chip key={f} on={feeling === f} onClick={() => setFeeling(feeling === f ? null : f)}>
                  {FEELING_LABELS[f]}
                </Chip>
              ))}
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="A note, if you like"
            aria-label="Note"
            className="bg-background"
          />
          {error && (
            <p className="text-sm text-coral-foreground" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
