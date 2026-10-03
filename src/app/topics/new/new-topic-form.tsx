"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, FileText, Globe } from "lucide-react";
import { tagColorClass } from "@/components/tag-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_SOURCE_CHARS,
  MAX_TAGS,
  normalizeTag,
  topicLevelLabels,
  topicLevels,
  type TopicLevel,
} from "@/lib/schemas/topic";
import { cn } from "@/lib/utils";
import { createTopic, type NewTopicState } from "./actions";

const initialState: NewTopicState = { error: null };

const levelHints: Record<TopicLevel, string> = {
  beginner: "Start from the basics",
  intermediate: "Skip the fundamentals",
  advanced: "Go deep and nuanced",
};

const modes = [
  { value: "research", label: "Research it for me", hint: "Claude searches the web and writes the lesson", icon: Globe },
  { value: "own", label: "I'll provide the material", hint: "Paste your notes, an article or a transcript", icon: FileText },
] as const;
type Mode = (typeof modes)[number]["value"];

const fieldClass = "h-10 bg-background px-3 md:text-base";
const choiceClass =
  "group relative flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// Fields are controlled: React resets uncontrolled fields after every form
// action, which would wipe pasted material when the server returns an error.
export function NewTopicForm({ existingTags }: { existingTags: string[] }) {
  const [state, formAction, pending] = useActionState(createTopic, initialState);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("research");
  const [source, setSource] = useState("");
  const [questions, setQuestions] = useState("");
  const [level, setLevel] = useState<TopicLevel>("beginner");
  const [tags, setTags] = useState("");

  const chosen = tags.split(",").map(normalizeTag).filter(Boolean);
  const toggleTag = (tag: string) => {
    const next = chosen.includes(tag) ? chosen.filter((t) => t !== tag) : [...chosen, tag];
    setTags(next.join(", "));
  };

  return (
    <form action={formAction}>
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-7 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-sm">What do you want to learn?</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Opportunity cost"
              required
              maxLength={200}
              autoFocus
              className={cn(fieldClass, "h-12 text-lg md:text-lg")}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">How should the lesson be made?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {modes.map(({ value, label, hint, icon: Icon }) => (
                <label key={value} className={choiceClass}>
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="peer sr-only"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4 text-primary" />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                  <Check className="absolute top-3 right-3 size-4 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
                </label>
              ))}
            </div>
          </fieldset>

          {mode === "own" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="source">Your material</Label>
              <Textarea
                id="source"
                name="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                rows={12}
                maxLength={MAX_SOURCE_CHARS}
                placeholder="Paste your notes, an article, or a transcript. Claude organizes it into short lesson parts, fills small gaps, and flags anything that looks doubtful."
                className="min-h-64 bg-background px-3 py-2.5 md:text-base"
              />
              <p className="text-sm text-muted-foreground">
                {wordCount(source).toLocaleString("en")} words · up to about 10,000. No web search, so check the
                facts yourself.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="questions">
              Your questions <span className="font-normal text-muted-foreground">· optional</span>
            </Label>
            <Textarea
              id="questions"
              name="questions"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              rows={4}
              placeholder={"One per line, e.g.\nWhy do people ignore it?\nHow is it different from sunk cost?"}
              className="min-h-28 bg-background px-3 py-2.5 md:text-base"
            />
            <p className="text-sm text-muted-foreground">
              {mode === "own" ? "Answered from your material first." : "The lesson answers these first."}
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Your level</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {topicLevels.map((value) => (
                <label key={value} className={choiceClass}>
                  <input
                    type="radio"
                    name="level"
                    value={value}
                    checked={level === value}
                    onChange={() => setLevel(value)}
                    className="peer sr-only"
                  />
                  <span className="text-sm font-medium">{topicLevelLabels[value]}</span>
                  <span className="text-xs text-muted-foreground">{levelHints[value]}</span>
                  <Check className="absolute top-3 right-3 size-4 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">
              Tags <span className="font-normal text-muted-foreground">· optional, up to {MAX_TAGS}</span>
            </Label>
            <Input
              id="tags"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. economics, decision-making"
              className={fieldClass}
            />
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {existingTags.map((tag) => {
                  const on = chosen.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : cn("border-transparent hover:border-current/30", tagColorClass(tag)),
                      )}
                    >
                      {on && <Check className="size-3" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-muted-foreground">Separate with commas. Claude suggests more after the lesson.</p>
          </div>
        </CardContent>

        <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-4 sm:px-6">
          <p className="text-sm text-coral-foreground" role="alert">
            {state.error}
          </p>
          <Button type="submit" size="lg" disabled={pending} className="h-10 px-4">
            {pending ? "Saving…" : "Create topic"}
            {!pending && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </Card>
    </form>
  );
}
