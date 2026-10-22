import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { loadMoney } from "@/lib/money";
import { monthFromSlug, monthSlug, periodLabel, runningBalances } from "@/lib/schemas";
import { MonthEditor } from "../month-editor";

// Filling in one pay period.
export default async function MonthPage({ params }: PageProps<"/money/months/[month]">) {
  await connection();
  const { month: slug } = await params;
  const month = monthFromSlug(slug);
  if (!month) notFound();
  const { categories, periods } = await loadMoney();
  const index = periods.findIndex((p) => p.month === month);
  if (index < 0) notFound();
  const period = periods[index];
  const before = index > 0 ? runningBalances(periods, categories).get(periods[index - 1].id) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title={periodLabel(period.month)}
        description="Fill in the totals for this pay period. Blank means not entered yet."
        back={{ href: "/money/months", label: "Months" }}
      >
        <Link href={`/money?month=${monthSlug(period.month)}`} className="w-fit text-sm text-muted-foreground hover:text-foreground">
          See this month&apos;s overview
        </Link>
      </PageHeader>
      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          Add your categories first: <Link href="/money/categories" className="underline underline-offset-4">Categories</Link>.
        </p>
      ) : (
        <MonthEditor key={period.id} period={period} categories={categories} balancesBefore={Object.fromEntries(before ?? [])} />
      )}
    </main>
  );
}
