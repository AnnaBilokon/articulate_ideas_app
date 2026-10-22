"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Strength } from "@/lib/beliefs";
import { formatDay } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { deleteStrength, saveStrength, setStrengthExamples } from "../beliefs/actions";

type AchievementOption = { id: string; title: string; achievedOn: string };

// Ideas to start from; tapping one fills in the name.
const IDEAS = ["Curious", "Persistent", "Kind", "Organised", "Calm under pressure", "Good listener", "Creative", "Honest", "Quick learner", "Reliable"];

function StrengthForm({
  id,
  initial,
  onDone,
  showIdeas,
}: {
  id: string | null;
  initial: { title: string; description: string };
  onDone: () => void;
  showIdeas: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const key = id ?? "new";

  const save = () =>
    start(async () => {
      const result = await saveStrength(id, { title, description });
      setError(result.error);
      if (!result.error) onDone();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`strength-title-${key}`}>Strength</Label>
        <Input
          id={`strength-title-${key}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. I keep going when things get hard"
          className="h-10 bg-background md:text-base"
          autoFocus
        />
        {showIdeas && (
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setTitle(idea)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`strength-description-${key}`}>What it looks like in you</Label>
        <Textarea
          id={`strength-description-${key}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Optional. How it shows up, and what it lets you do."
          className="bg-background"
        />
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending || !title.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" />} {id ? "Save" : "Add strength"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function AddStrength({ first }: { first: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {first ? "Add your first strength" : "Add a strength"}
      </Button>
    );
  }
  return (
    <Card>
      <CardContent>
        <StrengthForm id={null} initial={{ title: "", description: "" }} onDone={() => setOpen(false)} showIdeas />
      </CardContent>
    </Card>
  );
}

// Picks the achievements that show a strength.
function ExamplesPicker({
  strengthId,
  chosen,
  achievements,
  onDone,
}: {
  strengthId: string;
  chosen: string[];
  achievements: AchievementOption[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(chosen);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
      <span className="text-sm font-medium">Which achievements show it?</span>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {achievements.map((a) => (
          <li key={a.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60">
              <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="mt-0.5 size-4 accent-primary" />
              <span className="flex-1">{a.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDay(a.achievedOn)}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await setStrengthExamples(strengthId, selected);
              setError(result.error);
              if (!result.error) onDone();
            })
          }
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />} Save
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function StrengthCard({ strength: s, achievements }: { strength: Strength; achievements: AchievementOption[] }) {
  const [mode, setMode] = useState<"view" | "edit" | "examples">("view");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  if (mode === "edit") {
    return (
      <Card size="sm">
        <CardContent>
          <StrengthForm id={s.id} initial={{ title: s.title, description: s.description ?? "" }} onDone={() => setMode("view")} showIdeas={false} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold text-heading">{s.title}</span>
            {s.description && <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{s.description}</p>}
          </div>
          <span className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              aria-label={`Edit ${s.title}`}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${s.title}`}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-coral-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        </div>

        {s.examples.length > 0 && (
          <ul className="flex flex-col gap-1">
            {s.examples.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <Trophy className="size-3.5 shrink-0 text-sunflower-foreground" />
                <span className="flex-1">{e.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDay(e.achievedOn)}</span>
              </li>
            ))}
          </ul>
        )}

        {mode === "examples" ? (
          <ExamplesPicker strengthId={s.id} chosen={s.examples.map((e) => e.id)} achievements={achievements} onDone={() => setMode("view")} />
        ) : achievements.length > 0 ? (
          <button
            type="button"
            onClick={() => setMode("examples")}
            className={cn("flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground", s.examples.length === 0 && "text-primary")}
          >
            {s.examples.length === 0 ? <Plus className="size-3.5" /> : <Check className="size-3.5" />}
            {s.examples.length === 0 ? "Add achievements that show it" : "Change examples"}
          </button>
        ) : (
          <Link href="/growth/achievements" className="w-fit text-sm text-muted-foreground hover:text-foreground">
            Log achievements to link them here
          </Link>
        )}

        {confirming && (
          <div className="flex flex-col gap-2 rounded-lg bg-coral-soft p-3 ring-1 ring-coral/30" role="alertdialog" aria-label={`Delete ${s.title}?`}>
            <p className="text-sm font-medium text-coral-foreground">Delete “{s.title}”? Its achievements stay.</p>
            {error && <p className="text-sm text-coral-foreground">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={() => startDeleting(async () => setError((await deleteStrength(s.id)).error))}
              >
                {deleting && <Loader2 className="size-3.5 animate-spin" />} Delete
              </Button>
              <Button size="sm" variant="outline" disabled={deleting} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
