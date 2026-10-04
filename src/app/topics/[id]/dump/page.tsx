import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { gradeDumpSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { DumpSession } from "./dump-session";

export default async function DumpPage({ params }: PageProps<"/topics/[id]/dump">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, lesson_chunks(id), dumps(text, feedback, created_at)")
    .eq("id", id)
    .order("created_at", { referencedTable: "dumps", ascending: false })
    .limit(1, { referencedTable: "dumps" })
    .maybeSingle();
  if (!topic) notFound();
  if (topic.lesson_chunks.length === 0) redirect(`/topics/${id}`);

  const latest = topic.dumps[0];
  const feedback = latest ? gradeDumpSchema.safeParse(latest.feedback) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">Brain dump · write everything you remember, without looking back.</p>
      </PageHeader>
      <DumpSession
        topicId={id}
        previous={latest && feedback?.success ? { text: latest.text, feedback: feedback.data } : null}
      />
    </main>
  );
}
