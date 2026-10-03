import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { LessonReader } from "./lesson-reader";

export default async function LessonPage({ params }: PageProps<"/topics/[id]/lesson">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, lesson_chunks(title, content, position)")
    .eq("id", id)
    .order("position", { referencedTable: "lesson_chunks" })
    .maybeSingle();
  if (!topic) notFound();
  if (topic.lesson_chunks.length === 0) redirect(`/topics/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }} />
      <LessonReader topicId={id} chunks={topic.lesson_chunks.map(({ title, content }) => ({ title, content }))} />
    </main>
  );
}
