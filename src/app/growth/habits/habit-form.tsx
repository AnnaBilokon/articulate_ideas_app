"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAYS, type HabitInput, type HabitSchedule } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { createHabit, updateHabit } from "./actions";

const choiceClass =
  "relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

const scheduleOptions: { value: HabitSchedule; label: string; hint: string }[] = [
  { value: "daily", label: "Every day", hint: "A small daily thing" },
  { value: "days", label: "On certain days", hint: "e.g. Mon, Wed, Fri" },
  { value: "weekly", label: "A few times a week", hint: "Any days you like" },
];

// A habit's name, why, and when: every day, on chosen weekdays, or a number
// of times a week.
export function HabitForm({
  habitId,
  initial,
  onDone,
}: {
  habitId?: string;
  initial?: HabitInput;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [schedule, setSchedule] = useState<HabitSchedule>(initial?.schedule ?? "daily");
  const [days, setDays] = useState<number[]>(initial?.days.length ? initial.days : [1, 3, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(initial?.timesPerWeek ?? 3);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const id = habitId ?? "new";

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = () =>
    start(async () => {
      const input: HabitInput = { title, why, schedule, days, timesPerWeek };
      const result = habitId ? await updateHabit(habitId, input) : await createHabit(input);
      setError(result.error);
      if (!result.error) {
        if (!habitId) {
          setTitle("");
          setWhy("");
        }
        onDone?.();
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`habit-title-${id}`}>Habit</Label>
        <Input
          id={`habit-title-${id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Read 10 pages"
          className="h-10 bg-background md:text-base"
          autoFocus={!habitId}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`habit-why-${id}`}>Why</Label>
        <Textarea
          id={`habit-why-${id}`}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Optional. What it gives you."
          className="bg-background"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">When</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {scheduleOptions.map((o) => (
            <label key={o.value} className={choiceClass}>
              <input
                type="radio"
                name={`schedule-${id}`}
                value={o.value}
                checked={schedule === o.value}
                onChange={() => setSchedule(o.value)}
                className="peer sr-only"
              />
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
              <Check className="absolute top-3 right-3 size-4 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
            </label>
          ))}
        </div>
        {schedule === "days" && (
          <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Days">
            {WEEKDAYS.map((w) => {
              const on = days.includes(w.day);
              return (
                <button
                  key={w.day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(w.day)}
                  className={cn(
                    "h-9 min-w-12 rounded-full border px-3 text-sm transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40",
                  )}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
        )}
        {schedule === "weekly" && (
          <div className="flex items-center gap-2 pt-1 text-sm">
            <select
              aria-label="Times a week"
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-2.5"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {timesPerWeek === 1 ? "time" : "times"} a week
          </div>
        )}
      </fieldset>

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving || !title.trim() || (schedule === "days" && days.length === 0)}>
          {saving ? "Saving…" : habitId ? "Save" : "Add habit"}
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
