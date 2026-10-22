"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HeartHandshake, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { BeliefInput, ReframeHelp } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { createBelief, updateBelief } from "./actions";

// The guided reframe: the belief and how true it feels, where it comes
// from, the evidence against it, and a kinder, truer belief. "Help me
// reframe" asks Claude for questions and suggestions, only when pressed.

function Rating({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "size-8 rounded-full border text-sm tabular-nums transition-colors",
              value === n ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </fieldset>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3 sm:gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-semibold text-highlight-foreground">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-semibold text-heading">{title}</h2>
        <p className="-mt-1 text-sm text-muted-foreground">{hint}</p>
        {children}
      </div>
    </section>
  );
}

export function BeliefEditor({ beliefId, initial }: { beliefId?: string; initial?: BeliefInput }) {
  const router = useRouter();
  const [belief, setBelief] = useState(initial?.belief ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [evidenceAgainst, setEvidenceAgainst] = useState(initial?.evidenceAgainst ?? "");
  const [reframe, setReframe] = useState(initial?.reframe ?? "");
  const [strengthStart, setStrengthStart] = useState<number | null>(initial?.strengthStart ?? null);
  const [strengthNow, setStrengthNow] = useState<number | null>(initial?.strengthNow ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();

  const [help, setHelp] = useState<ReframeHelp | null>(null);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [helping, setHelping] = useState(false);

  async function askForHelp() {
    setHelping(true);
    setHelpError(null);
    try {
      const response = await fetch("/api/beliefs/reframe-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ belief, origin, evidenceAgainst, reframe }),
      });
      const body = (await response.json().catch(() => null)) as { help?: ReframeHelp; error?: string } | null;
      if (!response.ok || !body?.help) throw new Error(body?.error ?? "Something went wrong. Try again.");
      setHelp(body.help);
    } catch (e) {
      setHelpError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setHelping(false);
    }
  }

  const save = () =>
    startSaving(async () => {
      const input: BeliefInput = { belief, origin, evidenceAgainst, reframe, strengthStart, strengthNow };
      if (beliefId) {
        const result = await updateBelief(beliefId, input);
        setError(result.error);
        setSaved(!result.error);
      } else {
        const result = await createBelief(input);
        if (result.error || !result.id) setError(result.error);
        else {
          router.push(`/growth/beliefs/${result.id}`);
          router.refresh();
        }
      }
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-8 p-4 sm:p-6">
        <Step n={1} title="The belief" hint="What do you tell yourself? Write it the way it sounds in your head.">
          <Textarea
            aria-label="The belief"
            value={belief}
            onChange={(e) => {
              setBelief(e.target.value);
              setSaved(false);
            }}
            rows={2}
            maxLength={500}
            placeholder="e.g. I'm not good enough to speak up in meetings."
            className="bg-background md:text-base"
          />
          {beliefId ? (
            <div className="flex flex-col gap-3 pt-1">
              {strengthStart !== null && (
                <p className="text-sm text-muted-foreground">When you wrote it down, it felt {strengthStart} out of 10 true.</p>
              )}
              <Rating
                label="How true does it feel now?"
                hint="0 is not at all, 10 is completely. Come back and update it as things change."
                value={strengthNow}
                onChange={(v) => {
                  setStrengthNow(v);
                  setSaved(false);
                }}
              />
            </div>
          ) : (
            <Rating
              label="How true does it feel right now?"
              hint="0 is not at all, 10 is completely. Optional; it shows how it changes over time."
              value={strengthStart}
              onChange={setStrengthStart}
            />
          )}
        </Step>

        <Step n={2} title="Where it comes from" hint="Optional. A moment, a person, an old rule. Naming it loosens it.">
          <Textarea
            aria-label="Where it comes from"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setSaved(false);
            }}
            rows={2}
            maxLength={2000}
            className="bg-background"
          />
        </Step>

        <Step n={3} title="Evidence against it" hint="Times it wasn't true, things you've done, what a friend would say.">
          <Textarea
            aria-label="Evidence against it"
            value={evidenceAgainst}
            onChange={(e) => {
              setEvidenceAgainst(e.target.value);
              setSaved(false);
            }}
            rows={4}
            maxLength={4000}
            placeholder="e.g. My manager asked me to present the pipeline work. People asked follow-up questions because it was useful."
            className="bg-background"
          />
        </Step>

        <Step n={4} title="A kinder, truer belief" hint="Something you can honestly believe today. Realistic beats perfect.">
          <Textarea
            aria-label="A kinder, truer belief"
            value={reframe}
            onChange={(e) => {
              setReframe(e.target.value);
              setSaved(false);
            }}
            rows={2}
            maxLength={500}
            placeholder="e.g. My ideas are worth hearing, even when I'm still finding the words."
            className="bg-background md:text-base"
          />
        </Step>

        <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={askForHelp} disabled={helping || !belief.trim()}>
              {helping ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {helping ? "Thinking…" : help ? "Ask again" : "Help me reframe"}
            </Button>
            <span className="text-xs text-muted-foreground">Questions and suggestions from Claude, from what you&apos;ve written.</span>
          </div>
          {helpError && (
            <p className="text-sm text-coral-foreground" role="alert">
              {helpError}
            </p>
          )}
          {help && (
            <div className="flex flex-col gap-4">
              {help.support_note && (
                <p className="flex gap-2 rounded-lg bg-info-soft p-3 text-sm text-info-foreground">
                  <HeartHandshake className="mt-0.5 size-4 shrink-0" />
                  <span>{help.support_note}</span>
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Questions to sit with</span>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                  {help.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ways to put it</span>
                <ul className="flex flex-col gap-2">
                  {help.reframes.map((r) => (
                    <li key={r} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10">
                      <span className="min-w-0 flex-1">{r}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReframe(r);
                          setSaved(false);
                        }}
                      >
                        Use this
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-4 sm:px-6">
        <p className={cn("text-sm", error ? "text-coral-foreground" : "text-success-foreground")} role="status">
          {error ?? (saved ? "Saved." : "")}
        </p>
        <Button size="lg" className="h-10 px-4" onClick={save} disabled={saving || !belief.trim()}>
          {saving ? "Saving…" : beliefId ? "Save" : "Save belief"}
        </Button>
      </div>
    </Card>
  );
}
