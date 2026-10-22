"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteAchievement, logAchievement } from "../actions";

// "Log a win": anything worth remembering, big or small, on its own or
// towards a goal.
export function LogWin({ goals, today }: { goals: { id: string; title: string }[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [achievedOn, setAchievedOn] = useState(today);
  const [goalId, setGoalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await logAchievement({ title, note, achievedOn, goalId: goalId || null });
      setError(result.error);
      if (!result.error) {
        setTitle("");
        setNote("");
        setAchievedOn(today);
        setGoalId("");
        setOpen(false);
      }
    });

  if (!open) {
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log a win
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="win-title">What did you do?</Label>
          <Input
            id="win-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Asked the first question in the all-hands"
            className="h-10 bg-background md:text-base"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="win-note">What it meant</Label>
          <Textarea
            id="win-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Optional. How it felt, what made it possible."
            className="bg-background"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="win-date">When</Label>
            <Input
              id="win-date"
              type="date"
              value={achievedOn}
              max={today}
              onChange={(e) => setAchievedOn(e.target.value)}
              className="h-10 bg-background"
            />
          </div>
          {goals.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="win-goal">Towards a goal</Label>
              <select
                id="win-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending || !title.trim() || !achievedOn}>
            {pending && <Loader2 className="size-4 animate-spin" />} Save the win
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RemoveAchievement({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-1">
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
      <button
        type="button"
        onClick={() => start(async () => setError((await deleteAchievement(id)).error))}
        disabled={pending}
        aria-label={`Remove “${title}”`}
        className="rounded-full p-1 text-muted-foreground opacity-60 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
    </span>
  );
}
