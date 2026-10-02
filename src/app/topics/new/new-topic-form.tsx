"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TAGS, normalizeTag, topicLevelLabels, topicLevels } from "@/lib/schemas/topic";
import { createTopic, type NewTopicState } from "./actions";

const initialState: NewTopicState = { error: null };

export function NewTopicForm({ existingTags }: { existingTags: string[] }) {
  const [state, formAction, pending] = useActionState(createTopic, initialState);
  const [tags, setTags] = useState("");

  const chosen = tags.split(",").map(normalizeTag).filter(Boolean);
  const toggleTag = (tag: string) => {
    const next = chosen.includes(tag) ? chosen.filter((t) => t !== tag) : [...chosen, tag];
    setTags(next.join(", "));
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Topic</Label>
        <Input id="title" name="title" placeholder="e.g. Opportunity cost" required maxLength={200} autoFocus />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="questions">Your questions</Label>
        <Textarea
          id="questions"
          name="questions"
          rows={4}
          placeholder={"One per line, e.g.\nWhy do people ignore it?\nHow is it different from sunk cost?"}
        />
        <p className="text-sm text-muted-foreground">Optional. The lesson will answer these first.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Your level</legend>
        <div className="flex flex-wrap gap-4">
          {topicLevels.map((level) => (
            <label key={level} className="flex items-center gap-2 text-sm">
              <input type="radio" name="level" value={level} defaultChecked={level === "beginner"} />
              {topicLevelLabels[level]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. economics, decision-making"
        />
        <p className="text-sm text-muted-foreground">
          Optional, up to {MAX_TAGS}, separated by commas. Claude will suggest more after the lesson.
        </p>
        {existingTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingTags.map((tag) => (
              <Button
                key={tag}
                type="button"
                size="xs"
                variant={chosen.includes(tag) ? "default" : "outline"}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create topic"}
        </Button>
      </div>
    </form>
  );
}
