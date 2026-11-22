"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookmarkCheck, Check, GraduationCap, Lightbulb, Loader2, RefreshCw, Repeat, Trash2 } from "lucide-react";
import { ChatText } from "@/components/chat-text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_EXPLORE_CHARS, MAX_EXPLORE_TURNS, type ExploreMessage, type Exploration } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// An Explore chat: you ask, Claude explains, with follow-ups to tap. Now and
// then Claude offers a question to check yourself, which you can skip.
// "Save to my knowledge" writes a note; you pick which review questions to keep.

async function send<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data;
}

type Busy = "send" | "save" | "reviews" | "delete" | null;

export function ExploreChat({ initial }: { initial: Exploration }) {
  const router = useRouter();
  const [exploration, setExploration] = useState(initial);
  const [text, setText] = useState("");
  // Answering the check question offered in the last reply.
  const [answering, setAnswering] = useState(false);
  // The check question was skipped.
  const [skipped, setSkipped] = useState(false);
  const [pending, setPending] = useState<ExploreMessage | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const noteRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, note } = exploration;
  const last = messages.at(-1);
  const lastReply = last?.role === "claude" ? last : null;
  const yourCount = messages.filter((m) => m.role === "you").length;
  const full = yourCount >= MAX_EXPLORE_TURNS;
  const offeredCheck = lastReply?.check && !skipped ? lastReply.check : null;

  useEffect(() => {
    if (pending) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pending]);

  async function run(key: Busy, task: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const sendMessage = (message: string, kind: "ask" | "check" = answering ? "check" : "ask") => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setPending({ role: "you", kind, text: trimmed });
    setText("");
    void run("send", async () => {
      try {
        const { exploration: next } = await send<{ exploration: Exploration }>(`/api/explore/${exploration.id}`, {
          kind,
          text: trimmed,
        });
        setExploration(next);
        setAnswering(false);
        setSkipped(false);
      } catch (e) {
        setText(trimmed);
        throw e;
      } finally {
        setPending(null);
      }
    });
  };

  const save = () =>
    run("save", async () => {
      const { exploration: next } = await send<{ exploration: Exploration }>(`/api/explore/${exploration.id}/save`);
      setExploration(next);
      // Every new question ticked, so adding them is one tap; untick what you don't want.
      setPicks(new Set(next.reviewDrafts.flatMap((d, i) => (d.inReviews ? [] : [i]))));
      requestAnimationFrame(() => noteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });

  const addReviews = () =>
    run("reviews", async () => {
      const { exploration: next } = await send<{ exploration: Exploration }>(`/api/explore/${exploration.id}/reviews`, {
        picks: [...picks],
      });
      setExploration(next);
      setPicks(new Set());
    });

  const remove = () => {
    if (!window.confirm("Delete this chat, its note and its review questions?")) return;
    void run("delete", async () => {
      await send(`/api/explore/${exploration.id}`, undefined, "DELETE");
      router.push("/library/explore");
      router.refresh();
    });
  };

  const learnHref = `/topics/new?${new URLSearchParams({ title: exploration.title, q: exploration.question })}`;
  const shown = pending ? [...messages, pending] : messages;
  const fresh = exploration.reviewDrafts.filter((d) => !d.inReviews).length;

  const saveButton =
    !note || exploration.noteBehind ? (
      <Button onClick={save} disabled={busy !== null || yourCount === 0} variant={note ? "outline" : "default"}>
        {busy === "save" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : note ? (
          <RefreshCw className="size-4" />
        ) : (
          <BookmarkCheck className="size-4" />
        )}
        {busy === "save" ? "Writing your note…" : note ? "Update my note" : "Save to my knowledge"}
      </Button>
    ) : (
      <span className="flex items-center gap-1.5 text-sm text-success-foreground">
        <Check className="size-4" /> Saved to your knowledge
      </span>
    );

  const errorLine = error && (
    <p className="text-sm text-coral-foreground" role="alert">
      {error}
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{exploration.area}</Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {saveButton}
        </div>
      </div>

      {note && (
        <div ref={noteRef} className="scroll-mt-24">
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-col gap-5 border-l-4 border-primary p-5 sm:p-7">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-semibold tracking-tight text-heading">Your note</h2>
                <p className="leading-7">{note.summary}</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Key ideas</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-7">
                  {note.key_ideas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
              {note.examples.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Examples</h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-7">
                    {note.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
              {exploration.reviewDrafts.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-4">
                  <h3 className="flex items-center gap-1.5 font-medium">
                    <Repeat className="size-4 text-primary" /> Want to remember it?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Pick the questions you&apos;d like to come back in your reviews, from tomorrow. Or none.
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {exploration.reviewDrafts.map((d, i) => (
                      <li key={d.text}>
                        {d.inReviews ? (
                          <span className="flex items-start gap-2.5 px-1 py-1 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                            <span>
                              {d.text} <span className="text-success-foreground">· In your reviews</span>
                            </span>
                          </span>
                        ) : (
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-background/60">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 shrink-0 accent-primary"
                              checked={picks.has(i)}
                              onChange={(e) => {
                                const next = new Set(picks);
                                if (e.target.checked) next.add(i);
                                else next.delete(i);
                                setPicks(next);
                              }}
                            />
                            <span>{d.text}</span>
                          </label>
                        )}
                      </li>
                    ))}
                  </ul>
                  {fresh > 0 && (
                    <Button className="w-fit" variant="outline" onClick={addReviews} disabled={busy !== null || picks.size === 0}>
                      {busy === "reviews" ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
                      {picks.size === 0 ? "Add to my reviews" : `Add ${picks.size} to my reviews`}
                    </Button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Link href={learnHref} className={buttonVariants({ variant: "ghost" })}>
                  <GraduationCap className="size-4" /> Learn it as a full topic
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ol className="flex flex-col gap-4" aria-label="Chat">
        {shown.map((m, i) =>
          m.role === "claude" ? (
            <li key={i} className="flex flex-col gap-2">
              <div className="rounded-2xl rounded-tl-sm bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                <ChatText text={m.text} />
              </div>
            </li>
          ) : (
            <li key={i} className="flex flex-col items-end gap-1">
              {m.kind === "check" && <span className="text-xs text-muted-foreground">Your answer</span>}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 leading-7 whitespace-pre-wrap text-accent-foreground",
                  m === pending && "opacity-80",
                )}
              >
                {m.text}
              </div>
            </li>
          ),
        )}
        {pending && (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </li>
        )}
      </ol>

      {!pending && offeredCheck && !answering && (
        <div className="flex flex-col gap-3 rounded-xl bg-sunflower-soft/70 p-4 ring-1 ring-sunflower/40">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Lightbulb className="size-4" /> Want to check yourself? Totally optional.
          </span>
          <p className="font-medium">{offeredCheck}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setAnswering(true);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              Answer it
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSkipped(true)}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {!pending && !answering && lastReply && lastReply.suggestions.length > 0 && !full && (
        <div className="flex flex-wrap gap-2">
          {lastReply.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s, "ask")}
              disabled={busy !== null}
              className="rounded-full bg-muted px-3.5 py-1.5 text-left text-sm font-medium transition-colors hover:bg-highlight hover:text-highlight-foreground disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {full ? (
        <p className="text-sm text-muted-foreground">
          This chat is long enough to save. Start a new one from Today to keep exploring.
        </p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(text);
          }}
        >
          {answering && offeredCheck && (
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span>
                <span className="text-muted-foreground">Answering: </span>
                <span className="font-medium">{offeredCheck}</span>
              </span>
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setAnswering(false)}
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(text);
                }
              }}
              ref={inputRef}
              rows={2}
              maxLength={MAX_EXPLORE_CHARS}
              placeholder={answering ? "In your own words, a sentence or two…" : "Ask anything about it…"}
              aria-label={answering ? "Your answer" : "Your question"}
              className="min-h-12 flex-1 bg-background px-3 py-2.5 md:text-base"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={busy !== null || !text.trim()} aria-label="Send">
              {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-5" />}
            </Button>
          </div>
        </form>
      )}
      {errorLine}

      <div ref={endRef} className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {saveButton}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={remove} disabled={busy !== null}>
          {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete chat
        </Button>
      </div>
    </div>
  );
}
