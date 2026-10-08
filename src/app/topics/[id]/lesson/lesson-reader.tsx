"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, Loader2, PartyPopper, PenLine } from "lucide-react";
import { GlossaryText, type GlossaryEntry } from "@/components/glossary-text";
import { SelectionSaver, useSaveWord } from "@/components/save-word";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CHUNK_RECALL_CHARS,
  MIN_DUMP_CHARS,
  type ChunkRecallVerdict,
  type GradeChunkRecallResult,
} from "@/lib/schemas/grading";
import { cn } from "@/lib/utils";

type Chunk = { id: string; title: string; content: string };

// Paragraphs, plus "- " lines as bullet lists. Glossary terms are marked at
// their first appearance in each part.
function ChunkBody({
  content,
  terms,
  onSave,
}: {
  content: string;
  terms: GlossaryEntry[];
  onSave: (term: string, context: string) => void;
}) {
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const seen = new Set<string>();
  return (
    <div className="flex flex-col gap-4 text-base leading-7 sm:text-[1.0625rem]">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="flex flex-col gap-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j} className="list-disc marker:text-primary">
                  <GlossaryText text={l.slice(2)} terms={terms} seen={seen} onSave={onSave} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <GlossaryText text={lines.join(" ")} terms={terms} seen={seen} onSave={onSave} />
          </p>
        );
      })}
    </div>
  );
}

type Phase = "reading" | "recall" | "feedback";
type Recall = { text: string; feedback: GradeChunkRecallResult };

const verdicts: Record<ChunkRecallVerdict, { label: string; className: string }> = {
  got_it: { label: "Got it", className: "bg-success-soft text-success-foreground" },
  partly: { label: "Partly", className: "bg-sunflower-soft text-sunflower-foreground" },
  missed: { label: "Not yet", className: "bg-coral-soft text-coral-foreground" },
};

export function LessonReader({
  topicId,
  chunks,
  terms,
}: {
  topicId: string;
  chunks: Chunk[];
  terms: GlossaryEntry[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // After reading a part, recall its main idea before the next one opens.
  const [phase, setPhase] = useState<Phase>("reading");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [recalls, setRecalls] = useState<Record<number, Recall>>({});
  // Parts recalled (or skipped) in this visit don't ask again when you go back.
  const [passed, setPassed] = useState<Set<number>>(new Set());
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { save, saving, toast } = useSaveWord(topicId);
  const finished = index >= chunks.length;
  const chunk = chunks[Math.min(index, chunks.length - 1)];
  const isLast = index === chunks.length - 1;
  const recallsDone = Object.keys(recalls).length;
  const recall = recalls[index];

  function show(nextIndex: number, nextPhase: Phase = "reading") {
    setIndex(nextIndex);
    setPhase(nextPhase);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveOn() {
    setPassed((p) => new Set(p).add(index));
    show(index + 1);
    // Right after research the glossary may still be building; pick it up.
    if (terms.length === 0) router.refresh();
  }

  async function check() {
    setChecking(true);
    setError(null);
    try {
      const text = drafts[index] ?? "";
      const response = await fetch(`/api/chunks/${chunk.id}/recall`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json()) as { feedback?: GradeChunkRecallResult; error?: string };
      if (!response.ok || !body.feedback) throw new Error(body.error ?? "Something went wrong. Try again.");
      const feedback = body.feedback;
      setRecalls((r) => ({ ...r, [index]: { text, feedback } }));
      setPassed((p) => new Set(p).add(index));
      show(index, "feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const nextLabel = isLast ? (
    <>
      Finish lesson <Check className="size-4" />
    </>
  ) : (
    <>
      Next part <ArrowRight className="size-4" />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Progress: one segment per part */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5" aria-label={`Part ${Math.min(index + 1, chunks.length)} of ${chunks.length}`}>
          {chunks.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < index || (i === index && phase === "feedback")
                  ? "bg-primary"
                  : i === index
                    ? "bg-sunflower"
                    : "bg-border",
              )}
            />
          ))}
        </div>
        {!finished && phase === "reading" && (
          <p className="text-xs text-muted-foreground">
            {terms.length > 0 && "Words with a dotted underline have an explanation: hover or tap them. "}
            Select any word to add it to your vocabulary.
          </p>
        )}
      </div>

      {finished ? (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success text-white">
              <PartyPopper className="size-6" />
            </span>
            <div className="text-lg font-semibold">Lesson done</div>
            <p className="max-w-md text-muted-foreground">
              {recallsDone > 0
                ? `${recallsDone === chunks.length ? "You recalled every part on its own." : `You recalled ${recallsDone} of ${chunks.length} parts.`} Now put them together: close the lesson and write what you remember about the whole topic. It unlocks your Topic Card.`
                : "Now close the lesson and write down everything you remember. Recalling it while it's fresh is what makes it stick, and it unlocks your Topic Card."}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => show(0)}>
                Read again
              </Button>
              <Link href={`/topics/${topicId}/dump`} className={buttonVariants()}>
                <PenLine className="size-4" /> Start brain dump
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : phase === "reading" ? (
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-8">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Part {index + 1} of {chunks.length}
              </span>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{chunk.title}</h2>
            </div>
            <SelectionSaver onSave={save} disabled={saving}>
              <ChunkBody key={index} content={chunk.content} terms={terms} onSave={save} />
            </SelectionSaver>
          </CardContent>
          <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-5 py-4 sm:px-8">
            <Button variant="ghost" disabled={index === 0} onClick={() => show(index - 1)}>
              Back
            </Button>
            {passed.has(index) ? (
              <Button size="lg" className="h-10 px-4" onClick={moveOn}>
                {nextLabel}
              </Button>
            ) : (
              <Button size="lg" className="h-10 px-4" onClick={() => show(index, "recall")}>
                Ready for next <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      ) : phase === "recall" ? (
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-8">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Part {index + 1} of {chunks.length} · Before you move on
              </span>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                What was &ldquo;{chunk.title}&rdquo; about?
              </h2>
              <p className="text-muted-foreground">
                Without looking back, write its main idea in a sentence or a few. Rough is fine.
              </p>
            </div>
            <Textarea
              value={drafts[index] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [index]: e.target.value }))}
              maxLength={MAX_CHUNK_RECALL_CHARS}
              rows={4}
              autoFocus
              disabled={checking}
              placeholder="The main idea is…"
              aria-label="The main idea of this part"
              className="min-h-28 bg-background px-3 py-2.5 md:text-base"
            />
            {error && (
              <p className="text-sm text-coral-foreground" role="alert">
                {error}
              </p>
            )}
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/50 px-5 py-4 sm:px-8">
            <div className="flex gap-1">
              <Button variant="ghost" disabled={checking} onClick={() => show(index)}>
                <Eye className="size-4" /> Show me again
              </Button>
              <Button variant="ghost" disabled={checking} onClick={moveOn} className="text-muted-foreground">
                Skip
              </Button>
            </div>
            <Button
              size="lg"
              className="h-10 px-4"
              disabled={checking || (drafts[index] ?? "").trim().length < MIN_DUMP_CHARS}
              onClick={check}
            >
              {checking ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  Check <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        recall && (
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-col gap-4 p-5 sm:p-8">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Part {index + 1} of {chunks.length} · {chunk.title}
              </span>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-sm font-medium",
                    verdicts[recall.feedback.verdict].className,
                  )}
                >
                  {verdicts[recall.feedback.verdict].label}
                </span>
                <p className="pt-0.5 leading-6">{recall.feedback.feedback}</p>
              </div>
              {recall.feedback.missed.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-sunflower-foreground">Also in this part</span>
                  <ul className="flex flex-col gap-1 pl-5">
                    {recall.feedback.missed.map((m) => (
                      <li key={m} className="list-disc leading-6 marker:text-sunflower-foreground">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-1 rounded-xl border-l-4 border-primary bg-muted/50 px-4 py-3">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Main idea</span>
                <p className="leading-6 font-medium">{recall.feedback.main_idea}</p>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground">
                  What you wrote
                </summary>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{recall.text}</p>
              </details>
            </CardContent>
            <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-5 py-4 sm:px-8">
              <Button variant="ghost" onClick={() => show(index)}>
                Read it again
              </Button>
              <Button size="lg" className="h-10 px-4" onClick={moveOn} autoFocus>
                {nextLabel}
              </Button>
            </div>
          </Card>
        )
      )}
      {toast}
    </div>
  );
}
