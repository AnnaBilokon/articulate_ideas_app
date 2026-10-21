"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Lightbulb, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TUTOR_MESSAGE_CHARS, type TutorMessage, type TutorSession } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Turn = { kind: "answer"; text: string } | { kind: "hint" } | { kind: "finish" };

export function TutorChat({
  topicId,
  initial,
  finishedBefore,
}: {
  topicId: string;
  initial: TutorSession | null;
  finishedBefore: number;
}) {
  const [session, setSession] = useState<TutorSession | null>(initial);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const messageCount = session?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, pending]);

  async function call(url: string, body?: Turn) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await response.json().catch(() => null)) as { session?: TutorSession; error?: string } | null;
      if (!response.ok || !json?.session) throw new Error(json?.error ?? "Something went wrong. Try again.");
      setSession(json.session);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  const start = () => call(`/api/topics/${topicId}/tutor`);

  async function send(body: Turn) {
    if (!session) return;
    // Show the learner's turn right away; the tutor's reply follows.
    const optimistic: TutorMessage = { role: "learner", kind: body.kind, text: body.kind === "answer" ? body.text : "" };
    const before = session;
    setSession({ ...session, messages: [...session.messages, optimistic] });
    const ok = await call(`/api/tutor/${session.id}`, body);
    if (!ok) setSession(before);
    else if (body.kind === "answer") setDraft("");
  }

  if (!session || (session.done && pending)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            <MessageCircle className="size-6" />
          </span>
          <p className="max-w-md text-muted-foreground">
            About 5 to 10 minutes. The tutor starts from something you know and builds toward the key ideas. There are
            no wrong answers here: thinking out loud is the point.
          </p>
          <StartButton pending={pending} onClick={start} label="Start talking" />
          {error && <ErrorLine error={error} />}
        </CardContent>
      </Card>
    );
  }

  const last = session.messages.at(-1);
  const waiting = pending && last?.role === "learner";

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3" aria-live="polite">
        {session.messages.map((m, i) => (
          <li key={i} className={cn("flex", m.role === "learner" ? "justify-end" : "justify-start")}>
            {m.role === "tutor" ? (
              <div className="flex max-w-[85%] flex-col gap-1.5 rounded-2xl rounded-tl-sm bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
                <p className="leading-6">{m.reply}</p>
                {m.question && <p className="leading-6 font-semibold text-heading">{m.question}</p>}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
                {m.kind === "answer" ? (
                  <p className="leading-6 whitespace-pre-wrap">{m.text}</p>
                ) : (
                  <p className="italic opacity-90">{m.kind === "hint" ? "Can I have a hint?" : "Let's finish here."}</p>
                )}
              </div>
            )}
          </li>
        ))}
        {waiting && (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> The tutor is thinking…
          </li>
        )}
      </ol>

      {session.done ? (
        <Card className="bg-success-soft/60 ring-success/25">
          <CardContent className="flex flex-col gap-3">
            <span className="font-medium text-success-foreground">What you worked out</span>
            {session.summary && session.summary.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {session.summary.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              {finishedBefore + 1 > 1 ? `That's ${finishedBefore + 1} conversations on this topic. ` : ""}
              Another one takes a different path through the ideas.
            </p>
            <StartButton pending={pending} onClick={start} label="Start a new conversation" variant="outline" />
            {error && <ErrorLine error={error} />}
          </CardContent>
        </Card>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void send({ kind: "answer", text: draft.trim() });
          }}
          className="flex flex-col gap-2"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (draft.trim() && !pending) void send({ kind: "answer", text: draft.trim() });
              }
            }}
            rows={3}
            maxLength={MAX_TUTOR_MESSAGE_CHARS}
            placeholder="Your answer. Rough thinking is welcome."
            aria-label="Your answer"
            disabled={pending}
            className="bg-card md:text-base"
          />
          {error && <ErrorLine error={error} />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void send({ kind: "hint" })}>
                <Lightbulb className="size-3.5" /> Hint
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void send({ kind: "finish" })}>
                <Flag className="size-3.5" /> Finish
              </Button>
            </div>
            <Button type="submit" disabled={pending || !draft.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Enter sends; Shift+Enter starts a new line.</p>
        </form>
      )}
      <div ref={end} />
    </div>
  );
}

function StartButton({
  pending,
  onClick,
  label,
  variant = "default",
}: {
  pending: boolean;
  onClick: () => void;
  label: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button onClick={onClick} disabled={pending} variant={variant} className="w-fit">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {pending ? "The tutor is getting ready…" : label}
    </Button>
  );
}

function ErrorLine({ error }: { error: string }) {
  return (
    <p className="text-sm text-coral-foreground" role="alert">
      {error}
    </p>
  );
}
