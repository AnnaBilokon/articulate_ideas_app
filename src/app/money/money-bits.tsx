import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKr, formatPrice, moneyColors, monthSlug, periodLabel, periodShort, type MoneyColor, type MoneyPeriod } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { StartMonth } from "./start-month";

// Pieces shared by the Money pages.

/** A stat tile: label, value, and the change from last month, coloured by whether up is good. */
export function StatTile({
  label,
  value,
  previous,
  upIsGood,
  hint,
  precise,
}: {
  label: string;
  value: number;
  previous?: { value: number; label: string } | null;
  upIsGood: boolean;
  hint?: string;
  /** Show öre, for amounts as paid. */
  precise?: boolean;
}) {
  const format = precise ? formatPrice : formatKr;
  const delta = previous ? value - previous.value : 0;
  const good = delta === 0 ? null : delta > 0 === upIsGood;
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold text-heading sm:text-2xl">{format(value)}</span>
        {previous && delta !== 0 ? (
          <span className={cn("flex items-center gap-0.5 text-xs", good ? "text-success-foreground" : "text-muted-foreground")}>
            {delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {format(Math.abs(delta))} vs {previous.label}
          </span>
        ) : (
          hint && <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </CardContent>
    </Card>
  );
}

/** The months as pills, newest first so the current one shows on phones; the chosen one highlighted. */
export function MonthPicker({ periods, current, base }: { periods: MoneyPeriod[]; current: string; base: string }) {
  return (
    <nav aria-label="Month" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {[...periods].reverse().map((p) => (
        <Link
          key={p.id}
          href={`${base}?month=${monthSlug(p.month)}`}
          aria-current={p.month === current ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
            p.month === current ? "bg-highlight font-medium text-highlight-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {periodShort(p.month)}
        </Link>
      ))}
    </nav>
  );
}

/** The month a page shows: ?month=YYYY-MM if it exists, else the latest. */
export function pickPeriod(periods: MoneyPeriod[], slug: string | string[] | undefined): MoneyPeriod | null {
  const wanted = typeof slug === "string" ? periods.find((p) => monthSlug(p.month) === slug) : undefined;
  return wanted ?? periods.at(-1) ?? null;
}

export const previousOf = (periods: MoneyPeriod[], period: MoneyPeriod) => {
  const i = periods.findIndex((p) => p.id === period.id);
  return i > 0 ? periods[i - 1] : null;
};

export function NoMonths() {
  return (
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
          <Wallet className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          No months yet. Start this month, add your categories, and fill in the totals once a month.
        </p>
        <StartMonth label="Start this month" />
      </CardContent>
    </Card>
  );
}

export const monthTitle = (p: MoneyPeriod) => periodLabel(p.month);

/** The colours used on a page and what they mean, with a link to name them. */
export function ColorKey({ used, labels }: { used: Set<MoneyColor>; labels: Record<MoneyColor, string> }) {
  if (used.size === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {moneyColors
        .filter((c) => used.has(c))
        .map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] ring-1 ring-foreground/20" style={{ background: `var(--cell-${c})` }} aria-hidden />
            {labels[c]}
          </span>
        ))}
      <Link href="/money/categories#colours" className="underline-offset-4 hover:text-foreground hover:underline">
        Name colours
      </Link>
    </div>
  );
}

/** Every colour used in these months. */
export function colorsUsed(periods: MoneyPeriod[]): Set<MoneyColor> {
  const used = new Set<MoneyColor>();
  for (const p of periods) {
    for (const e of p.entries) for (const c of Object.values(e.colors)) used.add(c);
    for (const o of p.oneOffs) if (o.color) used.add(o.color);
  }
  return used;
}
