import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { moneyKindInfo, moneyKinds } from "@/lib/schemas";
import { AddCategory, CategoryRow, ColorNames } from "./category-parts";

// Categories by kind: add, rename, reorder, and hide from new months.
export default async function CategoriesPage() {
  await connection();
  const { categories, colorLabels } = await loadMoney();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Categories and colours"
        description="What each month is made of, and what your colours mean. Hiding a category keeps it in past months but leaves it out of new ones."
        back={{ href: "/money/months", label: "Months" }}
      />
      <ColorNames labels={colorLabels} />
      <div className="grid gap-4 sm:grid-cols-2">
        {moneyKinds.map((kind) => {
          const active = categories.filter((c) => c.kind === kind && !c.archived);
          const hidden = categories.filter((c) => c.kind === kind && c.archived);
          return (
            <Card key={kind} size="sm">
              <CardHeader>
                <CardTitle className="text-heading">{moneyKindInfo[kind].plural}</CardTitle>
                <p className="text-sm text-muted-foreground">{moneyKindInfo[kind].hint}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {active.length > 0 && (
                  <ul className="flex flex-col divide-y divide-border/60">
                    {active.map((c, i) => (
                      <CategoryRow key={c.id} category={c} first={i === 0} last={i === active.length - 1} />
                    ))}
                  </ul>
                )}
                <AddCategory kind={kind} />
                {hidden.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Hidden ({hidden.length})</summary>
                    <ul className="mt-1 flex flex-col">
                      {hidden.map((c) => (
                        <CategoryRow key={c.id} category={c} first last />
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
