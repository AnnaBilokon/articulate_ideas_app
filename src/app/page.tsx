import Link from "next/link";
import { connection } from "next/server";
import { BookOpen, CheckCircle2, ChevronRight, GraduationCap, Repeat, Sprout } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TagBadge, tagColorClass } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTopicLevel, topicLevelLabels } from "@/lib/schemas/topic";
import { db } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default async function Home() {
  await connection(); // Read fresh data on every visit, not once at build.
  const supabase = db();
  const [{ data: learning }, { count: learnedCount }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, level, topic_tags(tags(name))")
      .eq("status", "learning")
      .order("created_at", { ascending: false }),
    supabase.from("topics").select("id", { count: "exact", head: true }).eq("status", "learned"),
  ]);
  const topics = learning ?? [];

  const stats = [
    { label: "Due today", value: 0, icon: Repeat, tone: "bg-sunflower-soft text-sunflower-foreground" },
    { label: "In progress", value: topics.length, icon: BookOpen, tone: "bg-info-soft text-info-foreground" },
    { label: "Learned", value: learnedCount ?? 0, icon: GraduationCap, tone: "bg-success-soft text-success-foreground" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Today" description="Recall what's due, then keep learning." />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-success-soft/60 ring-success/25">
        <CardContent className="flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <div className="font-medium">All caught up</div>
            <div className="text-muted-foreground">Nothing to review today.</div>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Continue learning</h2>
        {topics.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {topics.map((topic) => {
              const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));
              return (
                <li key={topic.id}>
                  <Link href={`/topics/${topic.id}`} className="group block">
                    <Card size="sm" className="transition-shadow group-hover:shadow-md group-hover:ring-primary/30">
                      <CardContent className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                            tagColorClass(tags[0] ?? topic.title),
                          )}
                          aria-hidden
                        >
                          {topic.title.trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="truncate font-medium">{topic.title}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {isTopicLevel(topic.level) && (
                              <Badge variant="secondary">{topicLevelLabels[topic.level]}</Badge>
                            )}
                            {tags.map((tag) => (
                              <TagBadge key={tag} name={tag} />
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <span className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <Sprout className="size-6" />
              </span>
              <CardTitle>Start your first topic</CardTitle>
              <CardDescription>
                Pick something you want to understand deeply. You&apos;ll learn it in short chunks, then recall it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/topics/new" className={buttonVariants({ size: "lg" })}>
                New topic
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
