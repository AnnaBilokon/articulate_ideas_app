"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  carriedBalance,
  cellStyle,
  formatKr,
  moneyKindInfo,
  periodTotals,
  type MoneyCategory,
  type MoneyColor,
  type MoneyColors,
  type MoneyField,
  type MoneyKind,
  type MoneyPeriod,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { deletePeriod, savePeriod } from "../actions";
import { CellColorPicker } from "../cell-color";

// Filling in a month: actual and expected per category, one-offs, pots
// (transferred, spent, balance) and savings (transferred, balance), with
// the totals updating as you type. Blank means not entered. Any amount can
// be given a colour, like highlighting a cell. Pots and savings can start
// fresh: what's really there at the start of the month replaces what was
// carried over. Each pot says in words what happened to it, and warns when
// numbers don't add up.

type Row = { amount: string; planned: string; spent: string; balance: string; opening: string; note: string; colors: MoneyColors };

const toText = (v: number | null) => (v === null ? "" : String(v));

/** "1 234,50" → 1234.5; blank → null; anything else → NaN. */
function parseAmount(text: string): number | null {
  const t = text.replace(/\s/g, "").replace(/kr$/i, "").replace(",", ".").replace("−", "-");
  if (t === "") return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

function AmountInput({
  label,
  value,
  onChange,
  placeholder,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** The field's colour and how to change it; the dot sits inside the field. */
  color?: { value: MoneyColor | null; onChange: (c: MoneyColor | null) => void; labels: Record<MoneyColor, string> };
}) {
  const bad = Number.isNaN(parseAmount(value));
  return (
    <div className="relative min-w-0">
      <Input
        aria-label={label}
        aria-invalid={bad || undefined}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        title={color?.value ? color.labels[color.value] : undefined}
        style={cellStyle(color?.value)}
        className={cn(
          "h-9 w-full min-w-0 bg-background text-right tabular-nums",
          color && "pl-7",
          // On a coloured cell, hints like a carried-over balance use its text colour, softened.
          color?.value && "placeholder:text-current placeholder:opacity-80",
        )}
      />
      {color && (
        <CellColorPicker
          value={color.value}
          onChange={color.onChange}
          labels={color.labels}
          label={label}
          className="absolute top-1/2 left-1.5 -translate-y-1/2"
        />
      )}
    </div>
  );
}

const columns: Record<MoneyKind, { key: keyof Row; label: string }[]> = {
  income: [
    { key: "amount", label: "Actual" },
    { key: "planned", label: "Expected" },
  ],
  expense: [
    { key: "amount", label: "Actual" },
    { key: "planned", label: "Expected" },
  ],
  pot: [
    { key: "amount", label: "In" },
    { key: "spent", label: "Spent" },
    { key: "balance", label: "Left" },
  ],
  saving: [
    { key: "amount", label: "In" },
    { key: "balance", label: "Balance" },
  ],
};

export function MonthEditor({
  period,
  categories,
  balancesBefore,
  colorLabels,
}: {
  period: MoneyPeriod;
  categories: MoneyCategory[];
  colorLabels: Record<MoneyColor, string>;
  /** Pot and saving balances at the end of the month before. */
  balancesBefore: Record<string, number>;
}) {
  const router = useRouter();
  const entries = new Map(period.entries.map((e) => [e.categoryId, e]));
  // Active categories, plus archived ones this month already has.
  const shown = categories.filter((c) => !c.archived || entries.has(c.id));
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      shown.map((c) => {
        const e = entries.get(c.id);
        return [
          c.id,
          {
            amount: toText(e?.amount ?? null),
            planned: toText(e?.planned ?? null),
            spent: toText(e?.spent ?? null),
            balance: toText(e?.balance ?? null),
            opening: toText(e?.opening ?? null),
            note: e?.note ?? "",
            colors: e?.colors ?? {},
          },
        ];
      }),
    ),
  );
  const [oneOffs, setOneOffs] = useState(
    period.oneOffs.map((o) => ({ title: o.title, amount: String(o.amount), color: o.color as MoneyColor | null })),
  );
  const [note, setNote] = useState(period.note ?? "");
  // "Started with" shows once asked for, or when this month already starts fresh.
  const startsFresh = (kind: MoneyKind) => shown.some((c) => c.kind === kind && entries.get(c.id)?.opening != null);
  const [fresh, setFresh] = useState({ pot: startsFresh("pot"), saving: startsFresh("saving") });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  // The totals bar covers the bottom of the screen: bring the question into view.
  useEffect(() => {
    if (confirmDelete) confirmRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [confirmDelete]);

  const set = (id: string, key: Exclude<keyof Row, "colors">, value: string) => {
    setRows((r) => ({ ...r, [id]: { ...r[id], [key]: value } }));
    setDirty(true);
    setSaved(false);
  };

  /** An amount field of a category, with its colour. */
  const field = (c: MoneyCategory, key: MoneyField, label: string, placeholder?: string) => (
    <AmountInput
      label={`${c.name}: ${label}`}
      value={rows[c.id][key]}
      onChange={(v) => set(c.id, key, v)}
      placeholder={placeholder}
      color={{
        value: rows[c.id].colors[key] ?? null,
        labels: colorLabels,
        onChange: (color) => {
          setRows((r) => {
            const colors = { ...r[c.id].colors };
            if (color) colors[key] = color;
            else delete colors[key];
            return { ...r, [c.id]: { ...r[c.id], colors } };
          });
          setDirty(true);
          setSaved(false);
        },
      }}
    />
  );

  const num = (text: string) => {
    const v = parseAmount(text);
    return v === null || Number.isNaN(v) ? null : v;
  };

  const draft: MoneyPeriod = {
    ...period,
    entries: shown.map((c) => ({
      categoryId: c.id,
      amount: num(rows[c.id].amount),
      planned: num(rows[c.id].planned),
      spent: num(rows[c.id].spent),
      balance: num(rows[c.id].balance),
      opening: c.kind === "pot" || c.kind === "saving" ? num(rows[c.id].opening) : null,
      note: rows[c.id].note.trim() || null,
      colors: rows[c.id].colors,
    })),
    oneOffs: oneOffs.flatMap((o, i) => {
      const v = num(o.amount);
      return o.title.trim() && v !== null ? [{ id: String(i), title: o.title.trim(), amount: v, color: o.color }] : [];
    }),
  };
  const totals = periodTotals(draft, categories);
  const invalid =
    Object.values(rows).some((r) => [r.amount, r.planned, r.spent, r.balance, r.opening].some((t) => Number.isNaN(parseAmount(t)))) ||
    oneOffs.some((o) => Number.isNaN(parseAmount(o.amount)) || (o.amount.trim() !== "" && !o.title.trim()));

  const save = () =>
    start(async () => {
      const result = await savePeriod(period.id, {
        entries: draft.entries,
        oneOffs: draft.oneOffs.map(({ title, amount, color }) => ({ title, amount, color })),
        note: note.trim() || null,
      });
      setError(result.error);
      if (!result.error) {
        setDirty(false);
        setSaved(true);
        router.refresh();
      }
    });

  /** What a pot or saving would hold without an entered balance. */
  const computed = (c: MoneyCategory) => {
    const r = rows[c.id];
    const tracked = c.kind === "pot" ? (period.potSpending?.[c.id] ?? 0) : 0;
    return carriedBalance(c.kind, { amount: num(r.amount), spent: num(r.spent), opening: num(r.opening) }, balancesBefore[c.id], tracked);
  };

  /**
   * A pot's month in words: where it started, what went in and out, and
   * what's left, whether less or more was spent than put in, what took from
   * it in Spending, and warnings when the numbers don't add up. Savings get
   * the warning only.
   */
  const story = (c: MoneyCategory) => {
    const r = rows[c.id];
    const opening = num(r.opening);
    const start = opening ?? balancesBefore[c.id] ?? 0;
    const into = num(r.amount);
    const typedSpent = c.kind === "pot" ? (num(r.spent) ?? 0) : 0;
    const tracked = c.kind === "pot" ? (period.potSpending?.[c.id] ?? 0) : 0;
    const spent = typedSpent + tracked;
    const calc = computed(c);
    const typed = num(r.balance);
    const lines: { text: string; warn?: boolean }[] = [];
    if (c.kind === "pot") {
      if (start || into || spent) {
        lines.push({
          text: `${formatKr(start)} ${opening !== null ? "to start" : "from last month"} + ${formatKr(into ?? 0)} in − ${formatKr(spent)} spent = ${formatKr(calc)} left.`,
        });
      }
      if (into) {
        const diff = into - spent;
        lines.push({
          text:
            Math.abs(diff) < 1
              ? "You spent what you put in."
              : diff > 0
                ? `You spent ${formatKr(diff)} less than you put in: it stays in the pot for next month.`
                : `You spent ${formatKr(-diff)} more than you put in this month.`,
        });
      }
      const from = Object.entries(period.potSpendingFrom?.[c.id] ?? {});
      if (from.length > 0) lines.push({ text: `From Spending: ${from.map(([name, sum]) => `${name} ${formatKr(sum)}`).join(", ")}.` });
      // With a Spent box filled in, those purchases may well be in it.
      const notFrom = period.notFromPot?.[c.id] ?? 0;
      if (notFrom && !typedSpent) {
        lines.push({ text: `Spending has another ${formatKr(notFrom)} in this pot's category that wasn't taken from it. Edit those purchases there if it should be.` });
      }
      if (typedSpent && tracked) {
        lines.push({
          warn: true,
          text: `Both the Spent box (${formatKr(typedSpent)}) and Spending (${formatKr(tracked)}) come off. If the box already has those purchases, they count twice.`,
        });
      }
    }
    if (typed !== null && Math.abs(typed - calc) >= 1) {
      const diff = typed - calc;
      lines.push({
        warn: c.kind === "pot",
        text:
          c.kind === "pot"
            ? `You typed ${formatKr(typed)} left; by the numbers it's ${formatKr(calc)}. What you typed carries over, ${formatKr(Math.abs(diff))} ${diff > 0 ? "more" : "less"}. Clear it to use the numbers, or start fresh with what's really there.`
            : into !== null
              ? `The balance is ${formatKr(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than ${opening !== null ? "the start" : "last month's"} plus In: interest, a withdrawal, or a transfer not entered?`
              : "",
      });
    }
    const shownLines = lines.filter((l) => l.text);
    if (shownLines.length === 0) return null;
    return (
      <span className="flex flex-col gap-0.5 text-xs">
        {shownLines.map((l, i) => (
          <span key={i} className={l.warn ? "text-coral-foreground" : "text-muted-foreground"}>
            {l.text}
          </span>
        ))}
      </span>
    );
  };

  /** Turns "Started with" on for a section, or off (clearing what was typed there: back to carrying over). */
  const toggleFresh = (kind: "pot" | "saving") => {
    if (fresh[kind]) {
      setRows((r) => Object.fromEntries(Object.entries(r).map(([id, row]) => [id, shown.find((c) => c.id === id)?.kind === kind ? { ...row, opening: "" } : row])));
      setDirty(true);
      setSaved(false);
    }
    setFresh({ ...fresh, [kind]: !fresh[kind] });
  };

  /**
   * A pot or saving with nothing in "In" yet: offers to fill it in, from the
   * balance if it went up on last month, else from what was expected. Only
   * "In" counts as moved (and, for savings, as saved).
   */
  const inHint = (c: MoneyCategory) => {
    const r = rows[c.id];
    if (r.amount.trim() !== "") return null;
    const planned = num(r.planned);
    const balance = num(r.balance);
    const before = num(r.opening) ?? balancesBefore[c.id];
    // In = balance - last month's + what went out of it this month.
    const out = c.kind === "pot" ? (num(r.spent) ?? 0) + (period.potSpending?.[c.id] ?? 0) : 0;
    const rise = balance !== null && before !== undefined ? Math.round((balance - before + out) * 100) / 100 : null;
    const offer =
      rise !== null && rise > 0
        ? {
            amount: rise,
            text: `Going by the ${c.kind === "pot" ? "amount left" : "balance"}, ${formatKr(rise)} went in${rise === planned ? ", as expected" : ""}.`,
            button: `Count ${formatKr(rise)} as in`,
          }
        : planned
          ? { amount: planned, text: `${formatKr(planned)} expected, not counted until it's in.`, button: "Moved it" }
          : null;
    if (!offer) return null;
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:justify-end">
        {offer.text}
        <Button size="xs" variant="secondary" onClick={() => set(c.id, "amount", String(offer.amount))}>
          <Check /> {offer.button}
        </Button>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5 pb-32">
      {(["income", "expense"] as const).map((kind) => (
        <Section
          key={kind}
          kind={kind}
          list={shown.filter((c) => c.kind === kind)}
          inputs={(c) => (
            <>
              {field(c, "amount", "actual")}
              {field(c, "planned", "expected")}
            </>
          )}
          note={
            kind === "expense"
              ? (c) => (
                  <Input
                    aria-label={`${c.name}: note`}
                    value={rows[c.id].note}
                    onChange={(e) => set(c.id, "note", e.target.value)}
                    maxLength={500}
                    placeholder="Note"
                    className="h-8 bg-background text-xs sm:h-9"
                  />
                )
              : undefined
          }
        />
      ))}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-heading">One-offs</CardTitle>
          <p className="text-sm text-muted-foreground">Spending that happens once, like a bike or a birthday.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {oneOffs.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label="One-off"
                value={o.title}
                onChange={(e) => {
                  setOneOffs(oneOffs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)));
                  setDirty(true);
                }}
                maxLength={120}
                placeholder="What"
                className="h-9 flex-1 bg-background"
              />
              <div className="w-32 shrink-0">
                <AmountInput
                  label="One-off amount"
                  value={o.amount}
                  onChange={(v) => {
                    setOneOffs(oneOffs.map((x, j) => (j === i ? { ...x, amount: v } : x)));
                    setDirty(true);
                  }}
                  color={{
                    value: o.color,
                    labels: colorLabels,
                    onChange: (color) => {
                      setOneOffs(oneOffs.map((x, j) => (j === i ? { ...x, color } : x)));
                      setDirty(true);
                    },
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="Remove one-off"
                onClick={() => {
                  setOneOffs(oneOffs.filter((_, j) => j !== i));
                  setDirty(true);
                }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="secondary" size="sm" className="w-fit" onClick={() => setOneOffs([...oneOffs, { title: "", amount: "", color: null }])}>
            <Plus className="size-3.5" /> Add a one-off
          </Button>
        </CardContent>
      </Card>

      {(["pot", "saving"] as const).map((kind) => (
        <Section
          key={kind}
          kind={kind}
          list={shown.filter((c) => c.kind === kind)}
          fresh={fresh[kind]}
          action={
            <Button size="sm" variant={fresh[kind] ? "ghost" : "secondary"} className="w-fit" onClick={() => toggleFresh(kind)}>
              {fresh[kind] ? "Carry over instead" : "Start fresh from this month"}
            </Button>
          }
          extra={(c) => {
            const hint = inHint(c);
            const words = story(c);
            return hint || words ? (
              <span className="flex flex-col gap-1">
                {hint}
                {words}
              </span>
            ) : null;
          }}
          inputs={(c) => (
            <>
              {fresh[kind] && field(c, "opening", "started with", String(Math.round(balancesBefore[c.id] ?? 0)))}
              {field(c, "amount", "in")}
              {kind === "pot" && field(c, "spent", "spent")}
              {field(c, "balance", kind === "pot" ? "left" : "balance", String(Math.round(computed(c))))}
            </>
          )}
        />
      ))}

      <Card size="sm">
        <CardContent className="flex flex-col gap-2">
          <label htmlFor="month-note" className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id="month-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
            rows={2}
            maxLength={2000}
            placeholder="Optional. Anything to remember about this month."
            className="bg-background"
          />
        </CardContent>
      </Card>

      <div className="border-t pt-6">
        {!confirmDelete ? (
          <Button variant="ghost" className="text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete this month
          </Button>
        ) : (
          <div ref={confirmRef} className="flex flex-col gap-3 rounded-xl bg-coral-soft p-4 ring-1 ring-coral/30" role="alertdialog" aria-label="Delete this month?">
            <p className="font-medium text-coral-foreground">Delete this month and everything entered in it?</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() =>
                  start(async () => {
                    // Only returns on failure; success goes to Months.
                    setError((await deletePeriod(period.id)).error);
                  })
                }
              >
                Delete for good
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            {[
              ["Income", totals.income],
              ["Spent", totals.spending],
              ["Saved", totals.saved],
              ["Free cash", totals.freeCash],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-1">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{formatKr(value as number)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center gap-3">
            <span className={cn("text-sm", error ? "text-coral-foreground" : "text-muted-foreground")} role="status">
              {error ?? (invalid ? "Check the amounts marked in red." : saved ? "Saved." : dirty ? "Unsaved changes" : "")}
            </span>
            <Button onClick={save} disabled={saving || invalid || !dirty}>
              {saving && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop: one row per category. Phones: the name on its own line, the
// amounts in columns below it, and the note under those.
const rowTemplate: Record<MoneyKind, string> = {
  income: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]",
  expense: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_minmax(0,9rem)]",
  pot: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem]",
  saving: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]",
};
// With "Started with" in front.
const freshTemplate: Partial<Record<MoneyKind, string>> = {
  pot: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem]",
  saving: "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem]",
};
const phoneGrid: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

function Section({
  kind,
  list,
  inputs,
  note,
  extra,
  fresh = false,
  action,
}: {
  kind: MoneyKind;
  list: MoneyCategory[];
  inputs: (c: MoneyCategory) => React.ReactNode;
  note?: (c: MoneyCategory) => React.ReactNode;
  /** A line under a row, across it. */
  extra?: (c: MoneyCategory) => React.ReactNode;
  /** Pots and savings: a "Started with" column first. */
  fresh?: boolean;
  /** A button under the title. */
  action?: React.ReactNode;
}) {
  if (list.length === 0) return null;
  const cols = fresh ? [{ key: "opening" as const, label: "Started with" }, ...columns[kind]] : columns[kind];
  const phoneCols = phoneGrid[cols.length] ?? "grid-cols-2";
  const template = (fresh && freshTemplate[kind]) || rowTemplate[kind];
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-heading">{moneyKindInfo[kind].plural}</CardTitle>
        {fresh ? (
          <p className="text-sm text-muted-foreground">
            Type what&apos;s really in each one at the start of this month. This month and the ones after count from there; earlier months stay as they
            were. Leave one blank to carry it over.
          </p>
        ) : (
          <>
            {kind === "pot" && <p className="text-sm text-muted-foreground">Leave &ldquo;Left&rdquo; blank to carry over: last month&apos;s, plus in, minus spent.</p>}
            {kind === "saving" && <p className="text-sm text-muted-foreground">Leave the balance blank to add this month&apos;s transfer to last month&apos;s.</p>}
          </>
        )}
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:gap-2">
        <div className={cn("grid gap-2", phoneCols, template)}>
          <span className="hidden sm:block" />
          {cols.map((col) => (
            <span key={col.key} className="text-right text-xs font-medium text-muted-foreground">
              {col.label}
            </span>
          ))}
          {note && <span className="hidden text-xs font-medium text-muted-foreground sm:block">Note</span>}
        </div>
        {list.map((c) => {
          const below = extra?.(c);
          return (
            <div key={c.id} className={cn("grid items-center gap-x-2 gap-y-1.5", template)}>
              <span className={cn("min-w-0 truncate text-sm", c.archived && "text-muted-foreground")}>{c.name}</span>
              <div className={cn("grid gap-2 sm:contents", phoneCols)}>{inputs(c)}</div>
              {note?.(c)}
              {below && <div className="col-span-full sm:text-right">{below}</div>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
