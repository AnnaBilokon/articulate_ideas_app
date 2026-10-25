import Link from "next/link";
import { connection } from "next/server";
import { Tags } from "lucide-react";
import { ColumnChart } from "@/components/charts/column-chart";
import { seriesColor } from "@/components/charts/series";
import { PageHeader } from "@/components/page-header";
import { SpendIconBadge } from "@/components/spend-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDate } from "@/lib/schedule";
import { formatDay, formatPrice, monthSlug, ordinal, payPeriodOf, payPeriodRange, spendMonthLabel, spendMonthShort } from "@/lib/schemas";
import { loadSpending } from "@/lib/spending";
import { cn } from "@/lib/utils";
import { StatTile } from "../money-bits";
import { AddPurchase } from "./add-purchase";
import { StarterCategories } from "./category-editor";
import { PurchaseList } from "./purchase-list";

// The spending tracker: log purchases by category, see where this month's
// money went and how months compare. Separate from the budget, pots and savings.
export default async function SpendingPage({ searchParams }: PageProps<"/money/spending">) {
  await connection();
  const { month: slug } = await searchParams;
  const { categories, purchases, payday } = await loadSpending();
  const today = localDate();
  const current = payPeriodOf(today, payday);

  if (categories.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
        <PageHeader title="Spending" description="Log what you spend, by category, and see where the money goes. Separate from your budget, pots and savings." />
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">Start with a few categories. You can change their icons and colours any time.</p>
            <StarterCategories existing={[]} />
            <Link href="/money/spending/categories" className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Or make your own
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Months with purchases, and this one, newest first.
  const months = [...new Set([current, ...purchases.map((p) => payPeriodOf(p.spentOn, payday))])].sort().reverse();
  const month = typeof slug === "string" && months.some((m) => monthSlug(m) === slug) ? `${slug}-01` : current;
  const range = payPeriodRange(month, payday);
  const inMonth = (m: string) => purchases.filter((p) => payPeriodOf(p.spentOn, payday) === m);
  const these = inMonth(month);
  const total = these.reduce((t, p) => t + p.amount, 0);
  const before = months.find((m) => m < month);
  const previousTotal = before ? inMonth(before).reduce((t, p) => t + p.amount, 0) : null;

  const byCategory = categories
    .map((c) => ({ c, total: these.filter((p) => p.categoryId === c.id).reduce((t, p) => t + p.amount, 0), count: these.filter((p) => p.categoryId === c.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.total - a.total);
  const top = Math.max(1, ...byCategory.map((x) => x.total));

  // The last six months, oldest first, for the trend.
  const trendMonths = [...months].reverse().filter((m) => m <= current).slice(-6);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="money-hero flex flex-col gap-5 rounded-2xl p-4 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader title="Spending" description={`${spendMonthLabel(month, payday)}: ${formatDay(range.from)} to ${formatDay(range.to)}`} />
          <Link href="/money/spending/categories" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Tags className="size-4" /> Categories and payday
          </Link>
        </div>
        <nav aria-label="Month" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {months.map((m) => (
            <Link
              key={m}
              href={`/money/spending?month=${monthSlug(m)}`}
              aria-current={m === month ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                m === month ? "bg-highlight font-medium text-highlight-foreground" : "bg-card/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {spendMonthShort(m, payday)}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="group" aria-label="This month">
          <StatTile
            label="Spent"
            value={total}
            previous={before && previousTotal !== null ? { value: previousTotal, label: spendMonthShort(before, payday) } : null}
            upIsGood={false}
            precise
          />
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Purchases</span>
              <span className="text-xl font-semibold text-heading sm:text-2xl">{these.length}</span>
              <span className="text-xs text-muted-foreground">{byCategory.length} {byCategory.length === 1 ? "category" : "categories"}</span>
            </CardContent>
          </Card>
          {byCategory[0] && (
            <Card size="sm" className="col-span-2 lg:col-span-1">
              <CardContent className="flex items-center gap-3">
                <SpendIconBadge icon={byCategory[0].c.icon} color={byCategory[0].c.color} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Most went to</span>
                  <span className="truncate font-semibold text-heading">{byCategory[0].c.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPrice(byCategory[0].total)}</span>
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          {month === current && <AddPurchase categories={categories.filter((c) => !c.archived)} today={today} />}
          {categories.length < 5 && (
            <Card size="sm">
              <CardContent>
                <StarterCategories existing={categories.map((c) => c.name)} />
              </CardContent>
            </Card>
          )}
          <PurchaseList purchases={these} categories={categories} today={today} />
          {month !== current && (
            <Link href="/money/spending" className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Add a purchase in {spendMonthShort(current, payday)}
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading">By category</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged in {spendMonthShort(month, payday)} yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {byCategory.map(({ c, total: sum, count }) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <SpendIconBadge icon={c.icon} color={c.color} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate">
                            {c.name} <span className="text-xs text-muted-foreground">· {count}</span>
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatPrice(sum)}
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{total > 0 ? Math.round((sum / total) * 100) : 0}%</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted" aria-hidden>
                          {sum > 0 && <div className="h-full rounded-full" style={{ width: `${(sum / top) * 100}%`, background: `var(--spend-${c.color})` }} />}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {trendMonths.length > 1 && (
            <ColumnChart
              title="Month by month"
              description={`Everything logged, per pay period from the ${ordinal(payday)}.`}
              data={{
                labels: trendMonths.map((m) => spendMonthShort(m, payday)),
                series: [{ key: "spent", name: "Spent", color: seriesColor(0), values: trendMonths.map((m) => inMonth(m).reduce((t, p) => t + p.amount, 0)) }],
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
