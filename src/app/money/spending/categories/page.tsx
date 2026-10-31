import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordinal } from "@/lib/schemas";
import { loadSpending } from "@/lib/spending";
import { NewSpendCategory, PaydayPicker, SpendCategoryRow, StarterCategories } from "../category-editor";

// Spending categories (name, icon, colour) and the payday months run from.
export default async function SpendCategoriesPage() {
  await connection();
  const { categories, purchases, payday, pots } = await loadSpending();
  const count = (id: string) => purchases.filter((p) => p.categoryId === id).length;
  const active = categories.filter((c) => !c.archived);
  const hidden = categories.filter((c) => c.archived);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Spending categories"
        description="Each with an icon and a colour. Hiding one keeps its purchases."
        back={{ href: "/money/spending", label: "Spending" }}
      >
        <NewSpendCategory pots={pots} />
      </PageHeader>

      {active.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {active.map((c) => (
            <li key={c.id}>
              <SpendCategoryRow category={c} purchases={count(c.id)} pots={pots} />
            </li>
          ))}
        </ul>
      )}
      <StarterCategories existing={categories.map((c) => c.name)} pots={pots} />

      {hidden.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Hidden</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {hidden.map((c) => (
              <li key={c.id}>
                <SpendCategoryRow category={c} purchases={count(c.id)} pots={pots} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-heading">Payday</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each month runs from your payday to the day before the next one. Now: the {ordinal(payday)}.
          </p>
        </CardHeader>
        <CardContent>
          <PaydayPicker payday={payday} />
        </CardContent>
      </Card>
    </main>
  );
}
