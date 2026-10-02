import Link from "next/link";
import { notFound } from "next/navigation";
import { topicLevelLabels, topicLevels, type TopicLevel } from "@/lib/schemas/topic";
import { db } from "@/lib/supabase";

const isLevel = (value: string | null): value is TopicLevel =>
  topicLevels.includes(value as TopicLevel);

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, level, status, user_questions(text, position), topic_tags(tags(name))")
    .eq("id", id)
    .order("position", { referencedTable: "user_questions" })
    .maybeSingle();
  if (!topic) notFound();

  const tags = topic.topic_tags.flatMap((tt) => (tt.tags ? [tt.tags.name] : []));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Today
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{topic.title}</h1>
        <p className="text-sm text-muted-foreground">
          {isLevel(topic.level) ? topicLevelLabels[topic.level] : topic.level}
          {tags.length > 0 && <> · {tags.join(", ")}</>}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Your questions</h2>
        {topic.user_questions.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {topic.user_questions.map((q) => (
              <li key={q.position}>{q.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </section>

      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Next: pretest and lesson. Coming in the next build step.
      </p>
    </main>
  );
}
