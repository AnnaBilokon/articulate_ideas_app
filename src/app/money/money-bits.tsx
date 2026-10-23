import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKr, monthSlug, periodLabel, periodShort, type MoneyPeriod } from "@/lib/schemas";
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
}: {
  label: string;
  value: number;
  previous?: { value: number; label: string } | null;
  upIsGood: boolean;
  hint?: string;
}) {
  const delta = previous ? value - previous.value : 0;
  const good = delta === 0 ? null : delta > 0 === upIsGood;
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold text-heading sm:text-2xl">{formatKr(value)}</span>
        {previous && delta !== 0 ? (
          <span className={cn("flex items-center gap-0.5 text-xs", good ? "text-success-foreground" : "text-muted-foreground")}>
            {delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {formatKr(Math.abs(delta))} vs {previous.label}
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
