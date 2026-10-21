import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scoreTone } from "@/lib/knowledge";
import type { ChallengeKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { NewChallengeButton } from "../new-challenge-button";

// The score after a challenge, with ways to go on.
export function ResultBanner({
  score,
  summary,
  topicId,
  kind,
}: {
  score: number;
  summary: string;
  topicId: string;
  kind: ChallengeKind;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4">
        <span className={cn("rounded-full px-3 py-1 text-lg font-semibold tabular-nums", scoreTone(score))}>{score} / 5</span>
        <p className="min-w-48 flex-1 font-medium">{summary}</p>
        <div className="flex flex-wrap gap-2">
          <NewChallengeButton topicId={topicId} kind={kind} label="Another one" variant="outline" />
          <Link href={`/topics/${topicId}/challenges`} className={buttonVariants({ variant: "ghost" })}>
            All challenges <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
