"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, Loader2, PenLine, RotateCcw, Sparkles } from "lucide-react";
import type { ResearchStreamEvent } from "@/app/api/topics/[id]/research/route";
import { Button } from "@/components/ui/button";

type Status = "idle" | "running" | "error";

/** Runs the research (or material) lesson build and tracks its streamed progress. */
export function useResearch(topicId: string, onDone: () => void) {
  const [status, setStatus] = useState<Status>("idle");
  const [searches, setSearches] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStatus("running");
    setSearches([]);
    setWriting(false);
    setError(null);

    try {
      const response = await fetch(`/api/topics/${topicId}/research`, { method: "POST" });
      if (!response.ok || !response.body) throw new Error("Could not start building the lesson. Try again.");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ResearchStreamEvent;
          if (event.type === "search") setSearches((s) => [...s, event.query]);
          if (event.type === "writing") setWriting(true);
          if (event.type === "retry") setWriting(false);
          if (event.type === "error") throw new Error(event.message);
          if (event.type === "done") {
            onDone();
            return;
          }
        }
      }
      throw new Error("The connection closed early. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return { status, searches, writing, error, start };
}

export function ResearchProgress({
  research,
  fromMaterial,
}: {
  research: ReturnType<typeof useResearch>;
  fromMaterial: boolean;
}) {
  const { status, searches, writing, error, start } = research;
  const FirstIcon = fromMaterial ? FileText : Globe;

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <FirstIcon className="size-4 text-info" />
          <span className="font-medium">{fromMaterial ? "Reading your material" : "Researching"}</span>
          {status === "running" && !writing && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </li>
        {searches.map((query, i) => (
          <li key={i} className="ml-6 text-muted-foreground">
            Searching: “{query}”
          </li>
        ))}
        {writing && (
          <li className="flex items-center gap-2">
            <PenLine className="size-4 text-sunflower-foreground" />
            <span className="font-medium">Writing the lesson</span>
            {status === "running" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </li>
        )}
      </ul>

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-coral-soft p-3">
          <p className="text-sm text-coral-foreground">{error}</p>
          <Button variant="outline" onClick={start}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function ResearchPanel({ topicId, fromMaterial }: { topicId: string; fromMaterial: boolean }) {
  const router = useRouter();
  const research = useResearch(topicId, () => router.refresh());

  if (research.status === "idle") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">
          {fromMaterial
            ? "Claude organizes your material into a lesson in short chunks, answers your questions from it, and flags anything that looks doubtful. It takes about a minute."
            : "Claude searches the web, then writes a lesson in short chunks that answers your questions first. It takes a minute or two."}
        </p>
        <Button size="lg" className="h-10 px-4" onClick={research.start}>
          <Sparkles className="size-4" />
          Build my lesson
        </Button>
      </div>
    );
  }

  return <ResearchProgress research={research} fromMaterial={fromMaterial} />;
}
