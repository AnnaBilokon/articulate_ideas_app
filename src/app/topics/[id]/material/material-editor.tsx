"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SOURCE_CHARS } from "@/lib/schemas/topic";
import { cn } from "@/lib/utils";
import { ResearchProgress, useResearch } from "../research-panel";

type Mode = "lesson" | "everything";

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const choiceClass =
  "group relative flex cursor-pointer flex-col gap-1 rounded-xl border bg-background p-3 transition-colors hover:border-primary/40 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

export function MaterialEditor({
  topicId,
  initialText,
  hasLesson,
  historyCounts,
}: {
  topicId: string;
  initialText: string;
  hasLesson: boolean;
  historyCounts: { dumps: number; answers: number };
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [mode, setMode] = useState<Mode>("lesson");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const research = useResearch(topicId, () => router.push(`/topics/${topicId}`));

  const changed = text.trim() !== initialText.trim();
  const needsConfirm = hasLesson && mode === "everything";
  const hasHistory = historyCounts.dumps + historyCounts.answers > 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/topics/${topicId}/material`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, mode: hasLesson ? mode : "save" }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save your changes. Try again.");

      if (!hasLesson) {
        router.push(`/topics/${topicId}`);
        return;
      }
      // Rebuild straight away, showing the same progress as "Build my lesson".
      setRebuilding(true);
      await research.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (rebuilding) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <span className="font-medium">Saved. Rebuilding from your updated material…</span>
          <ResearchProgress research={research} fromMaterial />
          <p className="text-sm text-muted-foreground">
            {mode === "everything"
              ? "Your Topic Card, recall questions and glossary follow in the background."
              : "Your glossary is rebuilt in the background; your Topic Card and history stay as they are."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_SOURCE_CHARS}
            rows={16}
            disabled={saving}
            aria-label="Your material"
            className="min-h-80 bg-background px-3 py-2.5 md:text-base"
          />
          <p className="text-sm text-muted-foreground">
            {wordCount(text).toLocaleString("en")} words · up to about 10,000
          </p>
        </div>

        {hasLesson && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Your lesson was built from the old text. What should change?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={choiceClass}>
                <input
                  type="radio"
                  name="mode"
                  value="lesson"
                  checked={mode === "lesson"}
                  onChange={() => setMode("lesson")}
                  className="peer sr-only"
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="size-4 text-primary" /> Update the lesson
                </span>
                <span className="text-xs leading-5 text-muted-foreground">
                  Rebuilds the lesson and glossary from the new text. Keeps your Topic Card, quiz history and brain
                  dumps. About $0.08.
                </span>
                <Check className="absolute top-3 right-3 size-4 text-primary opacity-0 peer-checked:opacity-100" />
              </label>
              <label className={cn(choiceClass, "has-checked:border-coral has-checked:bg-coral-soft/60")}>
                <input
                  type="radio"
                  name="mode"
                  value="everything"
                  checked={mode === "everything"}
                  onChange={() => setMode("everything")}
                  className="peer sr-only"
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <TriangleAlert className="size-4 text-coral-foreground" /> Rebuild everything
                </span>
                <span className="text-xs leading-5 text-muted-foreground">
                  Also remakes the Topic Card, recall questions and Think deeper. Clears this topic&apos;s quiz and
                  brain dump history. About $0.20.
                </span>
                <Check className="absolute top-3 right-3 size-4 text-coral-foreground opacity-0 peer-checked:opacity-100" />
              </label>
            </div>
            {needsConfirm && hasHistory && (
              <label className="mt-1 flex items-start gap-2 rounded-lg bg-coral-soft p-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand this deletes {historyCounts.answers} quiz{" "}
                  {historyCounts.answers === 1 ? "answer" : "answers"} and {historyCounts.dumps} brain{" "}
                  {historyCounts.dumps === 1 ? "dump" : "dumps"} for this topic.
                </span>
              </label>
            )}
          </fieldset>
        )}
      </CardContent>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/50 px-4 py-4 sm:px-6">
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={saving} onClick={() => router.push(`/topics/${topicId}`)}>
            Cancel
          </Button>
          <Button
            size="lg"
            className="h-10 px-4"
            variant={needsConfirm ? "destructive" : "default"}
            disabled={saving || !changed || (needsConfirm && hasHistory && !confirmed)}
            onClick={save}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {!hasLesson ? "Save" : mode === "lesson" ? "Save and update lesson" : "Save and rebuild everything"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
