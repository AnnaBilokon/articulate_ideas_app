import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { MAX_USER_QUESTIONS, isTopicLevel } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { NewTopicForm, type NewTopicInitial } from "./new-topic-form";

export default async function NewTopicPage({ searchParams }: PageProps<"/topics/new">) {
  await connection(); // Read fresh data on every visit, not once at build.
  // Existing tags first, so "psych" doesn't sneak in next to "psychology".
  const { data: tags } = await db().from("tags").select("name").order("name");

  // A suggestion from Discover opens the form filled in.
  const { title, level, q, tags: initialTags } = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const initialLevel = first(level);
  const initial = {
    title: first(title).slice(0, 200),
    level: isTopicLevel(initialLevel) ? initialLevel : "beginner",
    questions: (Array.isArray(q) ? q : q ? [q] : []).slice(0, MAX_USER_QUESTIONS).join("\n"),
    tags: first(initialTags),
  } satisfies NewTopicInitial;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="New topic"
        description="Name it, ask what you're curious about, and set your level."
        back={{ href: "/", label: "Today" }}
      />
      <NewTopicForm existingTags={(tags ?? []).map((t) => t.name)} initial={initial} />
    </main>
  );
}
