import { connection } from "next/server";
import { Gem } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listStrengths } from "@/lib/beliefs";
import { listAchievements } from "@/lib/goals";
import { AddStrength, StrengthCard } from "./strength-parts";

// Strong sides, each with the achievements that show it.
export default async function StrengthsPage() {
  await connection();
  const [strengths, achievements] = await Promise.all([listStrengths(), listAchievements()]);
  const options = achievements.map((a) => ({ id: a.id, title: a.title, achievedOn: a.achievedOn }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Strengths" description="What you're good at, with the proof. Come back here on the days you doubt it.">
        <AddStrength first={strengths.length === 0} />
      </PageHeader>

      {strengths.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-sunflower-soft text-sunflower-foreground">
              <Gem className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Name a strong side, even if it feels like bragging. Then link the achievements that show it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {strengths.map((s) => (
            <li key={s.id}>
              <StrengthCard strength={s} achievements={options} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
