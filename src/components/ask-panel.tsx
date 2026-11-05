"use client";

import { useState } from "react";
import { BookmarkPlus, Check, CornerDownRight, Loader2, MessageCircleQuestion, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ASK_CHARS, MAX_ASK_TURNS, type AskKind, type AskThread } from "@/lib/schemas";

// Ask a question while learning, or have a lesson part explained differently.
// Each question is a thread with follow-ups; a thread can be added to the
// reviews, or saved as an idea when it opens a subject of its own.

async function post(url: string, body: unknown): Promise<AskThread> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as {
    thread?: AskThread;
    error?: string;
  } | null;
  if (!response.ok || !data?.thread) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data.thread;
}

const explainKinds: { kind: Exclude<AskKind, "question">; label: string }[] = [
  { kind: "simpler", label: "Simpler" },
  { kind: "example", label: "An example" },
  { kind: "analogy", label: "An analogy" },
];

export function AskPanel({
  topicId,
  chunkId,
  threads,
  onThread,
  partTitles,
  explain = false,
}: {
  topicId: string;
  // The lesson part new questions are asked under; null on the card.
  chunkId: string | null;
  threads: AskThread[];
  // A thread was added or changed.
  onThread: (thread: AskThread) => void;
  // On the card: which part each thread was asked under.
  partTitles?: Record<string, string>;
  // Offer "explain it differently" (lesson parts only).
  explain?: boolean;
}) {
  const [open, setOpen] = useState(!explain);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<AskKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(kind: AskKind) {
    setBusy(kind);
    setError(null);
    try {
      onThread(
        await post(`/api/topics/${topicId}/ask`, {
          kind,
          question: kind === "question" ? question : undefined,
          chunkId,
          askId: null,
        }),
      );
      if (kind === "question") setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.map((t) => (
        <ThreadView
          key={t.id}
          topicId={topicId}
          thread={t}
          onThread={onThread}
          partTitle={t.chunkId ? partTitles?.[t.chunkId] : undefined}
        />
      ))}

      {explain && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={open ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setOpen(!open)}
            disabled={busy !== null}
          >
            <MessageCircleQuestion className="size-4" /> Ask a question
          </Button>
          <span className="pl-1 text-sm text-muted-foreground">Explain it:</span>
          {explainKinds.map(({ kind, label }) => (
            <Button key={kind} variant="ghost" size="sm" onClick={() => ask(kind)} disabled={busy !== null}>
              {busy === kind && <Loader2 className="size-3.5 animate-spin" />} {label}
            </Button>
          ))}
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && question.trim() && !busy) {
                e.preventDefault();
                ask("question");
              }
            }}
            rows={2}
            maxLength={MAX_ASK_CHARS}
            autoFocus={explain}
            disabled={busy !== null}
            placeholder={
              chunkId ? "What would you like to know about this part?" : "What would you like to know about this topic?"
            }
            aria-label="Your question"
            className="bg-background"
          />
          <Button className="w-fit" onClick={() => ask("question")} disabled={!question.trim() || busy !== null}>
            {busy === "question" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircleQuestion className="size-4" />
            )}
            {busy === "question" ? "Thinking…" : "Ask"}
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ThreadView({
  topicId,
  thread,
  onThread,
  partTitle,
}: {
  topicId: string;
  thread: AskThread;
  onThread: (thread: AskThread) => void;
  partTitle?: string;
}) {
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [busy, setBusy] = useState<"follow" | "review" | "idea" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "follow" | "review" | "idea", call: () => Promise<AskThread>) {
    setBusy(kind);
    setError(null);
    try {
      onThread(await call());
      if (kind === "follow") setFollowUp(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }
  const sendFollowUp = () =>
    followUp?.trim() &&
    run("follow", () =>
      post(`/api/topics/${topicId}/ask`, {
        kind: "question",
        question: followUp,
        chunkId: thread.chunkId,
        askId: thread.id,
      }),
    );

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
      {partTitle && (
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{partTitle}</span>
      )}
      {thread.turns.map((turn, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <p className="flex items-start gap-2 text-sm font-medium">
            {i > 0 && <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
            {turn.question}
          </p>
          <p className="leading-7 whitespace-pre-wrap">{turn.answer}</p>
          {turn.beyond_lesson && (
            <Badge variant="secondary" className="w-fit">
              Beyond the lesson
            </Badge>
          )}
        </div>
      ))}

      {followUp !== null && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !busy) {
                e.preventDefault();
                sendFollowUp();
              }
            }}
            rows={2}
            maxLength={MAX_ASK_CHARS}
            autoFocus
            disabled={busy !== null}
            placeholder="Your follow-up question"
            aria-label="Your follow-up question"
            className="bg-background"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={sendFollowUp} disabled={!followUp.trim() || busy !== null}>
              {busy === "follow" && <Loader2 className="size-3.5 animate-spin" />}{" "}
              {busy === "follow" ? "Thinking…" : "Ask"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFollowUp(null)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {followUp === null && thread.turns.length < MAX_ASK_TURNS && (
          <Button size="sm" variant="ghost" onClick={() => setFollowUp("")} disabled={busy !== null}>
            <CornerDownRight className="size-3.5" /> Follow up
          </Button>
        )}
        {thread.inReviews ? (
          <span className="flex items-center gap-1 px-2 text-sm text-success-foreground">
            <Check className="size-3.5" /> In your reviews
          </span>
        ) : (
          thread.canReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("review", () => post(`/api/asks/${thread.id}`, { action: "review" }))}
              disabled={busy !== null}
            >
              {busy === "review" ? <Loader2 className="size-3.5 animate-spin" /> : <Repeat className="size-3.5" />} Add
              to my reviews
            </Button>
          )
        )}
        {thread.savedAsIdea ? (
          <span className="flex items-center gap-1 px-2 text-sm text-success-foreground">
            <Check className="size-3.5" /> Saved as an idea
          </span>
        ) : (
          thread.newTopic && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run("idea", () => post(`/api/asks/${thread.id}`, { action: "idea" }))}
              disabled={busy !== null}
            >
              {busy === "idea" ? <Loader2 className="size-3.5 animate-spin" /> : <BookmarkPlus className="size-3.5" />}{" "}
              Save “{thread.newTopic}” to learn later
            </Button>
          )
        )}
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
