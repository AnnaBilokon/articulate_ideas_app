import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/supabase";

export default async function Home() {
  await connection(); // Read fresh data on every visit, not once at build.
  const { data: learning } = await db()
    .from("topics")
    .select("id, title")
    .eq("status", "learning")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <Link href="/topics/new" className={buttonVariants()}>
          New topic
        </Link>
      </div>

      <p className="text-muted-foreground">Nothing due today.</p>

      {learning && learning.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Continue learning</h2>
          <ul className="flex flex-col gap-1">
            {learning.map((topic) => (
              <li key={topic.id}>
                <Link href={`/topics/${topic.id}`} className="hover:underline">
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
