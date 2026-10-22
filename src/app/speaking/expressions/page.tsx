import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { savedSpeakingExpressions } from "@/lib/speaking";
import { RemoveExpression } from "./remove-expression";

// Expressions saved from the coach's feedback, to look through any time.
// They stay here, apart from Vocabulary; exercises bring them back.
export default async function SpeakingExpressionsPage() {
  await connection();
  const saved = await savedSpeakingExpressions();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Your expressions"
        description="Saved from your feedback. New exercises bring back the ones you've used least."
        back={{ href: "/speaking", label: "Speaking coach" }}
      />
      {saved.length === 0 ? (
        <p className="text-muted-foreground">Nothing saved yet. After an exercise, save the expressions you want to keep.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {saved.map((s) => (
            <li key={s.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-heading">{s.expression}</span>
                    <RemoveExpression id={s.id} />
                  </div>
                  <span className="text-sm text-muted-foreground">{s.meaning}</span>
                  <span className="text-sm italic">&ldquo;{s.example}&rdquo;</span>
                  <span className="text-xs text-muted-foreground">
                    {s.timesUsed === 0 ? "Not used again yet" : `Used again ${s.timesUsed === 1 ? "once" : `${s.timesUsed} times`}`}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
