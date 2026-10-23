"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
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
// be given a colour, like highlighting a cell.

type Row = { amount: string; planned: string; spent: string; balance: string; note: string; colors: MoneyColors };

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
        className={cn("h-9 w-full min-w-0 bg-background text-right tabular-nums", color && "pl-7")}
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
    Object.values(rows).some((r) => [r.amount, r.planned, r.spent, r.balance].some((t) => Number.isNaN(parseAmount(t)))) ||
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
    return (balancesBefore[c.id] ?? 0) + (num(r.amount) ?? 0) - (c.kind === "pot" ? (num(r.spent) ?? 0) : 0);
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
          inputs={(c) => (
            <>
              {field(c, "amount", "in", toText(entries.get(c.id)?.planned ?? null))}
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
              ["Saved", totals.savingTransfers],
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

function Section({
  kind,
  list,
  inputs,
  note,
}: {
  kind: MoneyKind;
  list: MoneyCategory[];
  inputs: (c: MoneyCategory) => React.ReactNode;
  note?: (c: MoneyCategory) => React.ReactNode;
}) {
  if (list.length === 0) return null;
  const cols = columns[kind];
  const phoneCols = cols.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-heading">{moneyKindInfo[kind].plural}</CardTitle>
        {kind === "pot" && <p className="text-sm text-muted-foreground">Leave &ldquo;Left&rdquo; blank to carry over: last month&apos;s, plus in, minus spent.</p>}
        {kind === "saving" && <p className="text-sm text-muted-foreground">Leave the balance blank to add this month&apos;s transfer to last month&apos;s.</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:gap-2">
        <div className={cn("grid gap-2", phoneCols, rowTemplate[kind])}>
          <span className="hidden sm:block" />
          {cols.map((col) => (
            <span key={col.key} className="text-right text-xs font-medium text-muted-foreground">
              {col.label}
            </span>
          ))}
          {note && <span className="hidden text-xs font-medium text-muted-foreground sm:block">Note</span>}
        </div>
        {list.map((c) => (
          <div key={c.id} className={cn("grid items-center gap-x-2 gap-y-1.5", rowTemplate[kind])}>
            <span className={cn("min-w-0 truncate text-sm", c.archived && "text-muted-foreground")}>{c.name}</span>
            <div className={cn("grid gap-2 sm:contents", phoneCols)}>{inputs(c)}</div>
            {note?.(c)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
