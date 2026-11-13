"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowRight, Loader2, Play, Shuffle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { suggestWorkouts, type RecentWorkout } from "@/lib/fitness-plan";
import { noSubscribe, readStored, writeStored } from "@/lib/local-draft";
import {
  EQUIPMENT_LABELS,
  TIME_CHOICES,
  equipmentKinds,
  exerciseKinds,
  KIND_LABELS,
  prescription,
  type Equipment,
  type Exercise,
  type ExerciseKind,
  type WorkoutPlan,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { startWorkout } from "./actions";
import { Chip, KindBadge, minutesLabel } from "./fitness-bits";

// "How much time do you have?": pick the time, the kind and what's at hand,
// and get three ideas from rules (instant, free). None fit? Shuffle, or ask
// Claude for something different.

type Choices = { minutes: number; kind: ExerciseKind | "any"; equipment: Equipment[] };

const DEFAULT_CHOICES: Choices = { minutes: 30, kind: "any", equipment: ["body", "dumbbells"] };

// Your last choices are kept in this browser, ready for next time.
const CHOICES_KEY = "fitness-choices";

function parseChoices(stored: string): Choices {
  try {
    const v = JSON.parse(stored) as Partial<Choices>;
    return {
      minutes: TIME_CHOICES.includes(v.minutes as (typeof TIME_CHOICES)[number]) ? v.minutes! : DEFAULT_CHOICES.minutes,
      kind: v.kind === "any" || exerciseKinds.includes(v.kind as ExerciseKind) ? v.kind! : "any",
      equipment: Array.isArray(v.equipment) ? v.equipment.filter((e) => equipmentKinds.includes(e)) : DEFAULT_CHOICES.equipment,
    };
  } catch {
    return DEFAULT_CHOICES;
  }
}

export function TodayPlanner({ library, recent, today }: { library: Exercise[]; recent: RecentWorkout[]; today: string }) {
  const router = useRouter();
  const stored = useSyncExternalStore(noSubscribe, () => readStored(CHOICES_KEY), () => "");
  const [edited, setEdited] = useState<Choices | null>(null);
  const choices = edited ?? (stored ? parseChoices(stored) : DEFAULT_CHOICES);
  const [seed, setSeed] = useState(0);
  const [ai, setAi] = useState<WorkoutPlan[] | null>(null);
  const [wish, setWish] = useState("");
  const [asking, setAsking] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function choose(next: Partial<Choices>) {
    const value = { ...choices, ...next };
    setEdited(value);
    writeStored(CHOICES_KEY, JSON.stringify(value));
    setAi(null);
    setError(null);
  }

  const kinds = choices.kind === "any" ? [] : [choices.kind];
  // Quick to work out, and the same choices and seed always give the same ideas.
  const ideas = suggestWorkouts(library, recent, { minutes: choices.minutes, kinds, equipment: choices.equipment }, today, seed);
  const shown = ai ?? ideas;

  async function askAi() {
    setAsking(true);
    setError(null);
    try {
      const response = await fetch("/api/fitness/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: choices.minutes, kinds, equipment: choices.equipment, wish }),
      });
      const data = (await response.json().catch(() => null)) as { workouts?: WorkoutPlan[]; error?: string } | null;
      if (!response.ok || !data?.workouts) throw new Error(data?.error ?? "Something went wrong. Try again.");
      setAi(data.workouts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setAsking(false);
    }
  }

  function start(plan: WorkoutPlan, index: number) {
    setStarting(index);
    setError(null);
    startTransition(async () => {
      const result = await startWorkout({ plan, equipment: choices.equipment, source: ai ? "ai" : "rules" });
      if (result.error || !result.id) {
        setError(result.error ?? "Could not start the workout. Try again.");
        setStarting(null);
        return;
      }
      router.push(`/fitness/workouts/${result.id}`);
    });
  }

  const busy = asking || starting !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">How much time do you have?</legend>
          <div className="flex flex-wrap gap-2">
            {TIME_CHOICES.map((m) => (
              <Chip key={m} on={choices.minutes === m} onClick={() => choose({ minutes: m })} disabled={busy}>
                {minutesLabel(m)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">What kind?</legend>
          <div className="flex flex-wrap gap-2">
            <Chip on={choices.kind === "any"} onClick={() => choose({ kind: "any" })} disabled={busy}>
              Any
            </Chip>
            {exerciseKinds.map((k) => (
              <Chip key={k} on={choices.kind === k} onClick={() => choose({ kind: k })} disabled={busy}>
                {KIND_LABELS[k]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">What do you have?</legend>
          <div className="flex flex-wrap gap-2">
            {equipmentKinds.map((e) => {
              const on = choices.equipment.includes(e);
              return (
                <Chip
                  key={e}
                  on={on}
                  disabled={busy}
                  onClick={() => choose({ equipment: on ? choices.equipment.filter((x) => x !== e) : [...choices.equipment, e] })}
                >
                  {EQUIPMENT_LABELS[e]}
                </Chip>
              );
            })}
          </div>
        </fieldset>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="ideas">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ideas" className="text-lg font-semibold tracking-tight text-heading">
            {ai ? "Claude's ideas" : "Ideas for today"}
          </h2>
          {ai ? (
            <Button variant="ghost" size="sm" onClick={() => setAi(null)} disabled={busy}>
              Back to the first ideas
            </Button>
          ) : (
            shown.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSeed(seed + 1)} disabled={busy}>
                <Shuffle className="size-3.5" /> Other ideas
              </Button>
            )
          )}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            {choices.equipment.length === 0
              ? "Pick what you have: Bodyweight if nothing."
              : "Nothing in your library fits that. Pick more equipment, another kind, or add exercises."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((plan, i) => (
              <li key={`${plan.title}-${i}`}>
                <IdeaCard plan={plan} onStart={() => start(plan, i)} starting={starting === i} disabled={busy} />
              </li>
            ))}
          </ul>
        )}

        <Card className="bg-muted/40">
          <CardContent className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> None of these? Ask Claude
            </p>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) void askAi();
              }}
            >
              <Input
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={300}
                placeholder="Anything you'd like? Easy on my knees, more arms, outdoors…"
                aria-label="What you'd like today"
                className="h-9 bg-background"
                disabled={busy}
              />
              <Button type="submit" variant="secondary" className="h-9 shrink-0" disabled={busy || choices.equipment.length === 0}>
                {asking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {asking ? "Thinking…" : "Ask AI"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">It looks at your last two weeks too. About 2 cents a time.</p>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

const SHOWN_EXERCISES = 6;

function IdeaCard({
  plan,
  onStart,
  starting,
  disabled,
}: {
  plan: WorkoutPlan;
  onStart: () => void;
  starting: boolean;
  disabled: boolean;
}) {
  const [all, setAll] = useState(false);
  const exercises = all ? plan.exercises : plan.exercises.slice(0, SHOWN_EXERCISES);
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <KindBadge kind={plan.kind} />
              <span className="text-xs text-muted-foreground">about {minutesLabel(plan.minutes)}</span>
            </span>
            <h3 className="text-lg font-semibold text-heading">{plan.title}</h3>
            {plan.why && <p className="text-sm text-muted-foreground">{plan.why}</p>}
          </div>
          <Button onClick={onStart} disabled={disabled} className="shrink-0 max-sm:hidden">
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start
          </Button>
        </div>
        <ol className="flex flex-col divide-y divide-border/60 text-sm">
          {exercises.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span>{e.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{prescription(e)}</span>
            </li>
          ))}
        </ol>
        {plan.exercises.length > SHOWN_EXERCISES && (
          <button type="button" onClick={() => setAll(!all)} className="w-fit text-xs text-muted-foreground hover:text-foreground">
            {all ? "Show fewer" : `and ${plan.exercises.length - SHOWN_EXERCISES} more`}
          </button>
        )}
        <Button onClick={onStart} disabled={disabled} className={cn("h-10 sm:hidden")}>
          {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start this one <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
