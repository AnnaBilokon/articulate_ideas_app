"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_SPEAKING_TOPIC,
  MAX_SPEAKING_TOPICS,
  speakingContextOptions,
  speakingLevelInfo,
  speakingLevels,
  type SpeakingLevel,
  type SpeakingProfile,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { saveSpeakingProfile } from "./actions";

const choiceClass =
  "relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

// The coach's profile: what to get better at, what's hard, the level, where
// English is needed, and the topics the scenes come from.
export function ProfileForm({ initial }: { initial: SpeakingProfile | null }) {
  const router = useRouter();
  const [goals, setGoals] = useState(initial?.goals ?? "");
  const [challenges, setChallenges] = useState(initial?.challenges ?? "");
  const [level, setLevel] = useState<SpeakingLevel>(initial?.level ?? "comfortable");
  const [contexts, setContexts] = useState<string[]>(initial?.contexts ?? []);
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? [DEFAULT_SPEAKING_TOPIC]);
  const [newTopic, setNewTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const toggleContext = (c: string) =>
    setContexts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const addTopic = () => {
    const t = newTopic.trim();
    if (!t || topics.some((x) => x.toLowerCase() === t.toLowerCase()) || topics.length >= MAX_SPEAKING_TOPICS) return;
    setTopics([...topics, t]);
    setNewTopic("");
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveSpeakingProfile({ goals, challenges, level, contexts, topics });
      if (result.error) setError(result.error);
      else {
        router.push("/speaking");
        router.refresh();
      }
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-7 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="goals">What do you want to get better at?</Label>
          <Textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Explain my technical decisions clearly in meetings, and join small talk without freezing."
            className="bg-background md:text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="challenges">What makes speaking hard for you?</Label>
          <Textarea
            id="challenges"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. I search for words, my answers get long, I worry about grammar when people listen."
            className="bg-background md:text-base"
          />
          <p className="text-sm text-muted-foreground">Only the coach reads this. It shapes the exercises and the feedback.</p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Your spoken English</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {speakingLevels.map((value) => (
              <label key={value} className={choiceClass}>
                <input type="radio" name="level" value={value} checked={level === value} onChange={() => setLevel(value)} className="peer sr-only" />
                <span className="text-sm font-medium">{speakingLevelInfo[value].label}</span>
                <span className="text-xs text-muted-foreground">{speakingLevelInfo[value].hint}</span>
                <Check className="absolute top-3 right-3 size-4 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Where do you need English?</legend>
          <div className="flex flex-wrap gap-2">
            {speakingContextOptions.map((c) => {
              const on = contexts.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleContext(c)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Topics to practise</legend>
          <p className="-mt-1 text-sm text-muted-foreground">The scenes come from these. You pick one each time.</p>
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t} className="flex items-center gap-1 rounded-full bg-highlight py-1.5 pr-2 pl-3.5 text-sm font-medium text-highlight-foreground">
                {t}
                {topics.length > 1 && (
                  <button type="button" onClick={() => setTopics(topics.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded-full p-0.5 opacity-70 hover:opacity-100">
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 sm:max-w-md">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="Add a topic, e.g. Small talk at conferences"
              maxLength={60}
              aria-label="New topic"
              className="h-9 bg-background"
            />
            <Button type="button" variant="secondary" onClick={addTopic} disabled={!newTopic.trim()} className="h-9">
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </fieldset>
      </CardContent>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-4 sm:px-6">
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
        <Button size="lg" className="h-10 px-4" onClick={save} disabled={saving || !goals.trim() || !challenges.trim()}>
          {saving ? "Saving…" : initial ? "Save" : "Start my plan"}
        </Button>
      </div>
    </Card>
  );
}
