"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookmarkCheck, BookmarkPlus, Check, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SpeakingExpression } from "@/lib/schemas";
import type { SpeakingExercise } from "@/lib/speaking";
import { cn } from "@/lib/utils";
import { SpeechAnswer } from "../../speech-answer";
import { StartExercise } from "../../start-exercise";

// One exercise: the scene and question, the answer, feedback with an
// improved version and expressions to save, then a follow-up that puts the
// expressions to use.
export function ExerciseFlow({
  initial,
  technique,
  topics,
  saved,
}: {
  initial: SpeakingExercise;
  technique: string;
  topics: string[];
  /** Expressions saved already, lowercased. */
  saved: string[];
}) {
  const [exercise, setExercise] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: "answer" | "follow-up", body: object): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/speaking/exercises/${exercise.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => null)) as { exercise?: SpeakingExercise; error?: string } | null;
      if (!response.ok || !json?.exercise) throw new Error(json?.error ?? "Something went wrong. Try again.");
      setExercise(json.exercise);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  const fb = exercise.feedback;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground">{exercise.scenario}</p>
          <p className="text-lg leading-7 font-semibold text-heading sm:text-xl">&ldquo;{exercise.question}&rdquo;</p>
          {exercise.tip && (
            <p className="flex gap-2 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-sunflower-foreground" />
              <span>{exercise.tip}</span>
            </p>
          )}
          {exercise.revisit.length > 0 && !fb && (
            <p className="text-sm text-muted-foreground">
              If it fits, try one of your expressions: {exercise.revisit.map((r) => `"${r}"`).join(" or ")}
            </p>
          )}
        </CardContent>
      </Card>

      {!fb ? (
        <>
          <p className="text-sm text-muted-foreground">
            Answer as you would out loud, without preparing or translating. Short and imperfect is completely fine.
          </p>
          <SpeechAnswer
            pending={pending}
            submitLabel="Get feedback"
            placeholder="Your answer."
            onSubmit={(text, spoken) => post("answer", { text, spoken })}
          />
        </>
      ) : (
        <>
          <Card size="sm" className="bg-muted/40">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                What you {exercise.spoken ? "said" : "wrote"}
              </span>
              <p className="leading-7 whitespace-pre-wrap">{exercise.answer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <p className="flex gap-2 rounded-lg bg-success-soft p-3 text-success-foreground">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{fb.well}</span>
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ["Clarity", fb.clarity],
                    ["Structure", fb.structure],
                    ["Vocabulary", fb.vocabulary],
                    ["Grammar", fb.grammar],
                  ] as const
                ).map(([label, text]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="font-medium text-heading">{label}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
              {exercise.feedback?.used_revisit && exercise.feedback.used_revisit.length > 0 && (
                <p className="text-sm text-success-foreground">
                  You used {exercise.feedback.used_revisit.map((r) => `"${r}"`).join(" and ")} again. That&apos;s how
                  expressions become yours.
                </p>
              )}
              <div className="flex flex-col gap-1 rounded-lg bg-accent p-3 text-accent-foreground">
                <span className="text-xs font-medium tracking-wide uppercase">A natural way to say it</span>
                <p className="leading-7">{fb.improved}</p>
              </div>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold text-heading">Expressions to keep</h2>
            <ul className="flex flex-col gap-2">
              {fb.expressions.map((e) => (
                <ExpressionCard
                  key={e.expression}
                  expression={e}
                  exerciseId={exercise.id}
                  initiallySaved={saved.includes(e.expression.toLowerCase())}
                />
              ))}
            </ul>
          </section>

          <Card className="ring-primary/25">
            <CardContent className="flex flex-col gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase">Follow-up</span>
              <p className="text-lg leading-7 font-semibold text-heading">&ldquo;{fb.follow_up}&rdquo;</p>
              {!exercise.completedAt ? (
                <>
                  <p className="text-sm text-muted-foreground">Try to use one or two of the expressions above.</p>
                  <SpeechAnswer
                    pending={pending}
                    submitLabel="Send"
                    placeholder="Your answer."
                    onSubmit={(text, spoken) => post("follow-up", { text, spoken })}
                  />
                  <button
                    type="button"
                    onClick={() => void post("follow-up", { skip: true })}
                    disabled={pending}
                    className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Skip the follow-up this time
                  </button>
                </>
              ) : exercise.followUpAnswer ? (
                <div className="flex flex-col gap-3">
                  <p className="leading-7 whitespace-pre-wrap text-muted-foreground">{exercise.followUpAnswer}</p>
                  {exercise.followUpFeedback && (
                    <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                      {exercise.followUpFeedback.used.length > 0 && (
                        <span className="font-medium text-success-foreground">
                          You used: {exercise.followUpFeedback.used.map((u) => `"${u}"`).join(", ")}
                        </span>
                      )}
                      <p>{exercise.followUpFeedback.note}</p>
                      {exercise.followUpFeedback.improved && (
                        <p className="text-accent-foreground">
                          <span className="font-medium">Naturally: </span>
                          {exercise.followUpFeedback.improved}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Skipped this time.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      {pending && fb && !exercise.completedAt && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Your coach is reading…
        </p>
      )}

      {exercise.completedAt && (
        <Card className="bg-success-soft/50 ring-success/25">
          <CardContent className="flex flex-col gap-3">
            <span className="flex items-center gap-2 font-medium text-success-foreground">
              <Sparkles className="size-4" /> Done. Every scene like this makes the next real one easier.
            </span>
            <p className="text-sm text-muted-foreground">Today&apos;s technique: {technique}</p>
            <div className="flex flex-wrap items-end gap-3">
              <StartExercise topics={[exercise.topic, ...topics.filter((t) => t !== exercise.topic)]} />
              <Link href="/speaking" className={cn(buttonVariants({ variant: "ghost" }), "h-10")}>
                Back to the coach <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// An expression with Save: it goes to your expressions on the Speaking tab,
// and later exercises bring it back.
function ExpressionCard({
  expression,
  exerciseId,
  initiallySaved,
}: {
  expression: SpeakingExpression;
  exerciseId: string;
  initiallySaved: boolean;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(initiallySaved ? "saved" : "idle");
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setMessage(null);
    const response = await fetch("/api/speaking/expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expression, exerciseId }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.ok || response.status === 409) {
      setState("saved");
      if (response.status === 409) setMessage("Already in your expressions.");
    } else {
      setState("error");
      setMessage(body?.error ?? "Couldn't save it. Try again.");
    }
  }

  return (
    <li>
      <Card size="sm">
        <CardContent className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold text-heading">{expression.expression}</span>
            <Button
              variant={state === "saved" ? "ghost" : "outline"}
              size="sm"
              onClick={save}
              disabled={state === "saving" || state === "saved"}
            >
              {state === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : state === "saved" ? (
                <BookmarkCheck className="size-3.5" />
              ) : (
                <BookmarkPlus className="size-3.5" />
              )}
              {state === "saved" ? "Saved" : "Save"}
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">{expression.meaning}</span>
          <span className="text-sm italic">&ldquo;{expression.example}&rdquo;</span>
          {message && <span className={cn("text-xs", state === "error" ? "text-coral-foreground" : "text-muted-foreground")}>{message}</span>}
        </CardContent>
      </Card>
    </li>
  );
}
