"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AskPanel } from "@/components/ask-panel";
import type { AskThread } from "@/lib/schemas";

// Every question asked about the topic, from the lesson or here, and a box to
// ask a new one. Adding one to the reviews refreshes the card's question list.
export function YourQuestions({
  topicId,
  asks,
  partTitles,
}: {
  topicId: string;
  asks: AskThread[];
  partTitles: Record<string, string>;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(asks);

  return (
    <AskPanel
      topicId={topicId}
      chunkId={null}
      threads={threads}
      partTitles={partTitles}
      onThread={(thread) => {
        const before = threads.find((t) => t.id === thread.id);
        setThreads(before ? threads.map((t) => (t.id === thread.id ? thread : t)) : [...threads, thread]);
        if (thread.inReviews && !before?.inReviews) router.refresh();
      }}
    />
  );
}
