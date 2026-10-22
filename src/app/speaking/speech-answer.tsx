"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Send, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { MAX_SPEAKING_ANSWER_CHARS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const TIMER_KEY = "speaking-timer";
const GET_READY = 10;
const SPEAK_FOR = 60;

type Phase = { kind: "idle" } | { kind: "ready"; left: number } | { kind: "speaking"; left: number };

// Speak (the browser turns it into text) or type, then send. The text can be
// fixed before sending. Optional timed mode: 10 seconds to start, 60 to speak.
export function SpeechAnswer({
  onSubmit,
  pending,
  submitLabel,
  placeholder,
}: {
  onSubmit: (text: string, spoken: boolean) => Promise<boolean>;
  pending: boolean;
  submitLabel: string;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const [spoken, setSpoken] = useState(false);
  const [timed, setTimed] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const speech = useSpeechToText((final) => {
    setText((prev) => (prev ? `${prev.trimEnd()} ${final}` : final));
    setSpoken(true);
  });

  // The timer choice is a convenience kept in this browser only.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimed(localStorage.getItem(TIMER_KEY) === "on");
    } catch {}
  }, []);
  const toggleTimed = () => {
    const next = !timed;
    setTimed(next);
    try {
      localStorage.setItem(TIMER_KEY, next ? "on" : "off");
    } catch {}
  };

  // Countdown: get ready, then speak; the microphone starts and stops with it.
  useEffect(() => {
    if (phase.kind === "idle") return;
    const id = setTimeout(() => {
      if (phase.left > 1) setPhase({ ...phase, left: phase.left - 1 });
      else if (phase.kind === "ready") {
        speech.start();
        setPhase({ kind: "speaking", left: SPEAK_FOR });
      } else {
        speech.stop();
        setPhase({ kind: "idle" });
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, speech]);

  // Stopping the microphone ends a timed answer early.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!speech.listening && phase.kind === "speaking") setPhase({ kind: "idle" });
  }, [speech.listening, phase.kind]);

  const startSpeaking = () => (timed ? setPhase({ kind: "ready", left: GET_READY }) : speech.start());
  const stopSpeaking = () => {
    setPhase({ kind: "idle" });
    speech.stop();
  };

  async function submit() {
    speech.stop();
    const ok = await onSubmit(text.trim(), spoken);
    if (ok) {
      setText("");
      setSpoken(false);
    }
  }

  const busy = speech.listening || phase.kind !== "idle";

  return (
    <div className="flex flex-col gap-3">
      {phase.kind !== "idle" && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3",
            phase.kind === "ready" ? "bg-sunflower-soft text-sunflower-foreground" : "bg-accent text-accent-foreground",
          )}
          aria-live="polite"
        >
          <span className="font-medium">{phase.kind === "ready" ? "Get ready to speak…" : "Speak now"}</span>
          <span className="text-2xl font-semibold tabular-nums">{phase.left}</span>
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={MAX_SPEAKING_ANSWER_CHARS}
        placeholder={speech.supported ? `${placeholder} Speak, or type.` : `${placeholder} Type your answer.`}
        aria-label="Your answer"
        disabled={pending}
        className="bg-card md:text-base"
      />
      {speech.interim && <p className="-mt-1 text-sm text-muted-foreground italic">{speech.interim}…</p>}
      {speech.error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {speech.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {speech.supported ? (
            <>
              <Button
                type="button"
                variant={busy ? "default" : "outline"}
                onClick={busy ? stopSpeaking : startSpeaking}
                disabled={pending}
                aria-pressed={busy}
              >
                {busy ? <Square className="size-4" /> : <Mic className="size-4" />}
                {busy ? "Stop" : timed ? "Start timed answer" : "Speak"}
              </Button>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                <input type="checkbox" checked={timed} onChange={toggleTimed} disabled={busy} className="accent-primary" />
                <Timer className="size-3.5" /> Timed
              </label>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Speaking isn&apos;t available in this browser. Chrome, Edge and Safari have it.</span>
          )}
        </div>
        <Button onClick={submit} disabled={pending || busy || !text.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {pending ? "The coach is reading…" : submitLabel}
        </Button>
      </div>
      {spoken && !busy && (
        <p className="text-xs text-muted-foreground">You can fix any words the microphone got wrong before sending.</p>
      )}
    </div>
  );
}
