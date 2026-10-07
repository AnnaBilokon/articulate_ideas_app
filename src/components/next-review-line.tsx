import { formatDue } from "@/lib/schedule";

/** When the next review is, or how reviews start if nothing is scheduled yet. */
export function NextReviewLine({ dueAt }: { dueAt: string | null }) {
  return (
    <div className="text-muted-foreground">
      {dueAt
        ? `Next review ${formatDue(dueAt)}.`
        : "Take a topic's quiz, and its questions will come back here on the right days."}
    </div>
  );
}
