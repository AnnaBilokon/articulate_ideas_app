import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { NewTopicForm } from "./new-topic-form";

export default async function NewTopicPage() {
  await connection(); // Read fresh data on every visit, not once at build.
  // Existing tags first, so "psych" doesn't sneak in next to "psychology".
  const { data: tags } = await db().from("tags").select("name").order("name");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="New topic"
        description="Name it, ask what you're curious about, and set your level."
        back={{ href: "/", label: "Today" }}
      />
      <NewTopicForm existingTags={(tags ?? []).map((t) => t.name)} />
    </main>
  );
}
