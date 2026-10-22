"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_GOAL_STEPS, type GoalInput } from "@/lib/schemas";
import { createGoal, updateGoal } from "../actions";

// A goal's name and why, and the optional ways to track it: a target year,
// a number to reach, and (for a new goal) its first steps.
export function GoalForm({ goalId, initial }: { goalId?: string; initial?: GoalInput }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [targetYear, setTargetYear] = useState(initial?.targetYear?.toString() ?? "");
  const [metricTarget, setMetricTarget] = useState(initial?.metricTarget?.toString() ?? "");
  const [metricUnit, setMetricUnit] = useState(initial?.metricUnit ?? "");
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // This year and the next ten, plus a past year a goal already has.
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => thisYear + i);
  if (initial?.targetYear && initial.targetYear < thisYear) years.unshift(initial.targetYear);

  const addStep = () => {
    const s = newStep.trim();
    if (!s || steps.length >= MAX_GOAL_STEPS) return;
    setSteps([...steps, s]);
    setNewStep("");
  };

  const save = () =>
    startSaving(async () => {
      const target = metricTarget.trim() === "" ? null : Number(metricTarget.replace(",", "."));
      if (target !== null && !Number.isFinite(target)) {
        setError("The number to reach should be a number, like 12 or 2.5.");
        return;
      }
      const goal: GoalInput = { title, why, targetYear: targetYear ? Number(targetYear) : null, metricTarget: target, metricUnit };
      // A step typed but not added yet still counts.
      const allSteps = newStep.trim() ? [...steps, newStep.trim()] : steps;
      const result = goalId ? await updateGoal(goalId, goal) : await createGoal({ ...goal, steps: allSteps });
      const id = goalId ?? ("id" in result ? result.id : undefined);
      if (result.error && !id) setError(result.error);
      else {
        router.push(`/growth/goals/${id}`);
        router.refresh();
      }
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Your goal</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Speak up in every team meeting"
            className="h-10 bg-background md:text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="why">Why it matters to you</Label>
          <Textarea
            id="why"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Optional. A line to come back to when it gets hard."
            className="bg-background md:text-base"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="target-year">Target year</Label>
            <select
              id="target-year"
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">No target year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Optional. A direction, not a deadline.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="metric-target">A number to reach</Label>
            <div className="flex gap-2">
              <Input
                id="metric-target"
                inputMode="decimal"
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                placeholder="12"
                className="h-10 w-28 bg-background"
              />
              <Input
                aria-label="Unit"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                maxLength={40}
                placeholder="books"
                className="h-10 flex-1 bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground">Optional. For goals you can count.</p>
          </div>
        </div>

        {!goalId && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Steps</legend>
            <p className="-mt-1 text-sm text-muted-foreground">Optional. Small, concrete steps you can tick off.</p>
            {steps.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {steps.map((s, i) => (
                  <li key={`${i}-${s}`} className="flex items-center gap-2 rounded-lg bg-muted/60 py-1.5 pr-1.5 pl-3 text-sm">
                    <span className="flex-1">{s}</span>
                    <button
                      type="button"
                      onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                      aria-label={`Remove ${s}`}
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex gap-2">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep();
                  }
                }}
                maxLength={200}
                placeholder="e.g. Prepare one point before each meeting"
                aria-label="New step"
                className="h-9 bg-background"
              />
              <Button type="button" variant="secondary" onClick={addStep} disabled={!newStep.trim()} className="h-9">
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </fieldset>
        )}
      </CardContent>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-4 sm:px-6">
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
        <Button size="lg" className="h-10 px-4" onClick={save} disabled={saving || !title.trim()}>
          {saving ? "Saving…" : goalId ? "Save" : "Add goal"}
        </Button>
      </div>
    </Card>
  );
}
