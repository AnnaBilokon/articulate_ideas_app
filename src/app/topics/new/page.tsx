import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { NewTopicForm } from "./new-topic-form";

export default async function NewTopicPage() {
  await connection(); // Read fresh data on every visit, not once at build.
  // Existing tags first, so "psych" doesn't sneak in next to "psychology".
  const { data: tags } = await db().from("tags").select("name").order("name");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Today
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New topic</h1>
      </div>
      <NewTopicForm existingTags={(tags ?? []).map((t) => t.name)} />
    </main>
  );
}
