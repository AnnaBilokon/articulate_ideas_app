import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reviewOverview } from "@/lib/reviews";
import { MAX_USER_QUESTIONS, isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { NewTopicForm, type NewTopicInitial } from "./new-topic-form";

export default async function NewTopicPage({ searchParams }: PageProps<"/topics/new">) {
  await connection(); // Read fresh data on every visit, not once at build.
  // Existing tags first, so "psych" doesn't sneak in next to "psychology".
  const [{ data: tags }, review] = await Promise.all([db().from("tags").select("name").order("name"), reviewOverview()]);

  // A Discover suggestion or a saved question opens the form filled in.
  const { title, level, q, tags: initialTags, saved } = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const initialLevel = first(level);
  const initial = {
    title: first(title).slice(0, 200),
    level: isTopicLevel(initialLevel) ? initialLevel : "beginner",
    questions: (Array.isArray(q) ? q : q ? [q] : []).slice(0, MAX_USER_QUESTIONS).join("\n"),
    tags: first(initialTags),
    savedQuestionId: /^[0-9a-f-]{36}$/i.test(first(saved)) ? first(saved) : null,
  } satisfies NewTopicInitial;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="New topic"
        description="Name it, ask what you're curious about, and set your level."
        back={{ href: "/", label: "Today" }}
      />
      {/* Reviews are piling up: a nudge, not a block. */}
      {review.overflow > 0 && (
        <Card className="bg-sunflower-soft/70 ring-sunflower/50">
          <CardContent className="flex flex-col gap-3">
            <p>
              <span className="font-medium">
                {review.overflow} review {review.overflow === 1 ? "question is" : "questions are"} already waiting
                past today&apos;s limit of {review.cap}.
              </span>{" "}
              <span className="text-muted-foreground">
                A new topic adds 3 to 8 more tomorrow. You can still start it, or catch up first.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {review.today.length > 0 && (
                <Link href="/review" className={buttonVariants({ size: "sm" })}>
                  Review {review.today.length} now
                </Link>
              )}
              <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Change the daily limit
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      <NewTopicForm existingTags={(tags ?? []).map((t) => t.name)} initial={initial} />
    </main>
  );
}
