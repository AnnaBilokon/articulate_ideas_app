import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { explainRecordSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";
import { TeachSession } from "./teach-session";

export default async function TeachPage({ params }: PageProps<"/topics/[id]/teach">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: topic } = await db()
    .from("topics")
    .select("title, mastery_level, dumps(id), topic_cards(id), explanations(id, text, feedback, created_at)")
    .eq("id", id)
    .order("created_at", { referencedTable: "explanations", ascending: false })
    .limit(1, { referencedTable: "explanations" })
    .maybeSingle();
  if (!topic) notFound();
  if (topic.dumps.length === 0) redirect(`/topics/${id}/dump`);
  if (!topic.topic_cards) redirect(`/topics/${id}`);

  const latest = topic.explanations[0];
  const feedback = latest ? explainRecordSchema.safeParse(latest.feedback) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title={topic.title} back={{ href: `/topics/${id}`, label: "Topic" }}>
        <p className="text-sm text-muted-foreground">
          Teach-back · explain the whole topic in your own words, as if to someone new to it.
        </p>
      </PageHeader>
      <TeachSession
        topicId={id}
        mastery={topic.mastery_level}
        previous={latest && feedback?.success ? { id: latest.id, text: latest.text, feedback: feedback.data } : null}
      />
    </main>
  );
}
