import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, Eye, SearchCheck } from "lucide-react";
import { NewChallengeButton } from "@/app/challenges/new-challenge-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreTone } from "@/lib/knowledge";
import { challengeInfo, challengeKinds, type ChallengeKind } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const icons: Record<ChallengeKind, typeof Eye> = { spot_mistake: SearchCheck, two_truths: Eye };
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

// A topic's challenges: make a new one of each kind, or replay one (free).
export default async function TopicChallengesPage({ params }: PageProps<"/topics/[id]/challenges">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, lesson_chunks(id), challenges(id, kind, created_at, challenge_attempts(score, created_at))")
    .eq("id", id)
    .order("created_at", { referencedTable: "challenges", ascending: false })
    .maybeSingle();
  if (!topic) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Challenges"
        description="Practice that makes you judge claims, not just remember them. A new challenge costs about a cent; replaying one is free."
        back={{ href: `/topics/${id}`, label: topic.title }}
      />
      {topic.lesson_chunks.length === 0 ? (
        <p className="text-muted-foreground">Read the lesson first: challenges are made from it.</p>
      ) : (
        challengeKinds.map((kind) => {
          const Icon = icons[kind];
          const played = topic.challenges.filter((c) => c.kind === kind);
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="size-4 text-primary" /> {challengeInfo[kind].name}
                </CardTitle>
                <CardDescription>{challengeInfo[kind].blurb}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <NewChallengeButton topicId={id} kind={kind} label={played.length > 0 ? "New challenge" : "Start"} />
                {played.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {played.map((c, i) => {
                      const scores = [...c.challenge_attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
                      const last = scores.at(-1);
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/challenges/${c.id}`}
                            className="group flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm transition-colors hover:bg-muted"
                          >
                            <span className="flex-1">
                              Challenge {played.length - i} · {dateFormat.format(new Date(c.created_at))}
                              {scores.length > 0 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · played {scores.length} {scores.length === 1 ? "time" : "times"}
                                </span>
                              )}
                            </span>
                            {last && (
                              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", scoreTone(last.score))}>
                                {last.score} / 5
                              </span>
                            )}
                            <span className="text-muted-foreground">{scores.length > 0 ? "Play again" : "Play"}</span>
                            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </main>
  );
}
