import { connection } from "next/server";
import { ColumnChart } from "@/components/charts/column-chart";
import { seriesColor, type Series } from "@/components/charts/series";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMoney } from "@/lib/money";
import { cellStyle, formatKr, periodShort, periodTotals, type MoneyColor } from "@/lib/schemas";
import { ColorKey, NoMonths } from "../money-bits";

// Spending trends over the months that have been filled in: income, spending
// and savings side by side; where the money goes, by category; free cash;
// and every category month by month.
export default async function TrendsPage() {
  await connection();
  const { categories, periods, colorLabels } = await loadMoney();
  const filled = periods.filter((p) => periodTotals(p, categories).billsEntered);

  if (filled.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader title="Trends" description="Where the money goes, month by month." />
        {periods.length === 0 ? <NoMonths /> : <p className="text-muted-foreground">Fill in a month to see trends here.</p>}
      </main>
    );
  }

  const labels = filled.map((p) => periodShort(p.month));
  const totals = filled.map((p) => periodTotals(p, categories));
  const amount = (categoryId: string) =>
    filled.map((p) => p.entries.find((e) => e.categoryId === categoryId)?.amount ?? null);
  const colorOf = (categoryId: string, i: number) => filled[i].entries.find((e) => e.categoryId === categoryId)?.colors.amount;

  // Spending by category: the three biggest bills by total, then pots, one-offs, and the rest.
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const byTotal = expenseCats
    .map((c) => ({ c, values: amount(c.id), total: amount(c.id).reduce<number>((t, v) => t + (v ?? 0), 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const top = byTotal.slice(0, 3);
  const rest = byTotal.slice(3);
  const spendingSeries: Series[] = [
    ...top.map((x, i) => ({ key: x.c.id, name: x.c.name, color: seriesColor(i), values: x.values })),
    { key: "pots", name: "From pots", color: seriesColor(3), values: totals.map((t) => t.potSpent) },
    { key: "one-offs", name: "One-offs", color: seriesColor(4), values: totals.map((t) => t.oneOffs) },
    {
      key: "rest",
      name: "Other bills",
      color: "var(--series-other)",
      values: filled.map((_, i) => rest.reduce((t, x) => t + (x.values[i] ?? 0), 0)),
    },
  ];

  const average = (values: (number | null)[]) => {
    const known = values.filter((v): v is number => v !== null);
    return known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Trends"
        description={`${filled.length} ${filled.length === 1 ? "month" : "months"}, ${labels[0]} to ${labels[labels.length - 1]}. Hover or tap a month for its numbers.`}
      />

      <ColumnChart
        title="Income, spending and savings"
        description="Spending counts bills, one-offs, and what was spent from pots."
        data={{
          labels,
          series: [
            { key: "income", name: "Income", color: seriesColor(0), values: totals.map((t) => t.income) },
            { key: "spending", name: "Spent", color: seriesColor(1), values: totals.map((t) => t.spending) },
            { key: "saved", name: "Saved", color: seriesColor(2), values: totals.map((t) => t.savingTransfers) },
          ],
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ColumnChart title="Where the money goes" description="Your three biggest bills, pots, one-offs, and the rest." data={{ labels, series: spendingSeries }} stacked />
        <ColumnChart
          title="Free cash"
          description="Left after bills, one-offs, pots and savings. Below zero means it came from savings or the buffer."
          data={{ labels, series: [{ key: "free", name: "Free cash", color: seriesColor(0), values: totals.map((t) => t.freeCash) }] }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading">Every bill, month by month</CardTitle>
          <ColorKey
            used={new Set(byTotal.flatMap(({ c }) => filled.map((_, i) => colorOf(c.id, i)).filter((x): x is MoneyColor => !!x)))}
            labels={colorLabels}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 text-left font-medium">Category</th>
                {labels.map((l) => (
                  <th key={l} className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                    {l}
                  </th>
                ))}
                <th className="py-1.5 pl-2 text-right font-medium">Average</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {byTotal.map(({ c, values }) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.name}</td>
                  {values.map((v, i) => {
                    const color = colorOf(c.id, i);
                    return (
                      <td
                        key={labels[i]}
                        className="px-2 py-1.5 text-right whitespace-nowrap"
                        style={cellStyle(color)}
                        title={color ? colorLabels[color] : undefined}
                      >
                        {v === null ? "–" : formatKr(v).replace(" kr", "")}
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-2 text-right font-medium whitespace-nowrap">{formatKr(average(values)).replace(" kr", "")}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-medium">
                <td className="py-1.5 pr-3">All bills</td>
                {totals.map((t, i) => (
                  <td key={labels[i]} className="px-2 py-1.5 text-right whitespace-nowrap">
                    {formatKr(t.expenses).replace(" kr", "")}
                  </td>
                ))}
                <td className="py-1.5 pl-2 text-right whitespace-nowrap">{formatKr(average(totals.map((t) => t.expenses))).replace(" kr", "")}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Amounts in kr.</p>
        </CardContent>
      </Card>
    </main>
  );
}
