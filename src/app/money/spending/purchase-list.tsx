"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { SpendIconBadge } from "@/components/spend-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKr, type SpendCategory, type SpendPurchase } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { deletePurchase, updatePurchase } from "./actions";
import { CategoryChips, parseKr } from "./add-purchase";

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// The month's purchases by day, filtered by category; tap one to edit or delete it.
export function PurchaseList({
  purchases,
  categories,
  today,
}: {
  purchases: SpendPurchase[];
  categories: SpendCategory[];
  today: string;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const used = categories.filter((c) => purchases.some((p) => p.categoryId === c.id));
  const shown = filter ? purchases.filter((p) => p.categoryId === filter) : purchases;
  const days = [...new Set(shown.map((p) => p.spentOn))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading">Purchases</CardTitle>
        {used.length > 1 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pt-1 pb-1" role="group" aria-label="Show category">
            {[{ id: null, name: "All" }, ...used].map((c) => (
              <button
                key={c.id ?? "all"}
                type="button"
                aria-pressed={filter === c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
                  filter === c.id ? "bg-highlight font-medium text-highlight-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases this month yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {days.map((day) => {
              const list = shown.filter((p) => p.spentOn === day);
              return (
                <section key={day} className="flex flex-col gap-1">
                  <h3 className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>{dayFormat.format(new Date(`${day}T00:00:00Z`))}</span>
                    <span className="tabular-nums">{formatKr(list.reduce((t, p) => t + p.amount, 0))}</span>
                  </h3>
                  <ul className="flex flex-col">
                    {list.map((p) => {
                      const c = byId.get(p.categoryId);
                      return (
                        <li key={p.id}>
                          {editing === p.id ? (
                            <EditPurchase purchase={p} categories={categories} today={today} onDone={() => setEditing(null)} />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditing(p.id)}
                              className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-muted/70"
                              aria-label={`${c?.name ?? "Purchase"} ${formatKr(p.amount)}${p.note ? `, ${p.note}` : ""}. Edit`}
                            >
                              {c && <SpendIconBadge icon={c.icon} color={c.color} size="sm" />}
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm">{c?.name}</span>
                                {p.note && <span className="truncate text-xs text-muted-foreground">{p.note}</span>}
                              </span>
                              <span className={cn("shrink-0 text-sm font-medium tabular-nums", p.amount < 0 && "text-success-foreground")}>
                                {formatKr(p.amount)}
                              </span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditPurchase({
  purchase,
  categories,
  today,
  onDone,
}: {
  purchase: SpendPurchase;
  categories: SpendCategory[];
  today: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(purchase.amount));
  const [categoryId, setCategoryId] = useState(purchase.categoryId);
  const [spentOn, setSpentOn] = useState(purchase.spentOn);
  const [note, setNote] = useState(purchase.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const value = parseKr(amount);
  // Its own category stays pickable even if hidden since.
  const choices = categories.filter((c) => !c.archived || c.id === purchase.categoryId);

  const run = (action: () => Promise<{ error: string | null }>) =>
    start(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) onDone();
    });

  return (
    <div className="my-1 flex flex-col gap-3 rounded-xl bg-muted/50 p-3">
      <div className="grid gap-2 sm:grid-cols-[8rem_10rem_minmax(0,1fr)]">
        <Input aria-label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 bg-background text-right tabular-nums" />
        <Input type="date" aria-label="Date" value={spentOn} max={today} onChange={(e) => setSpentOn(e.target.value)} className="h-9 bg-background" />
        <Input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note" className="h-9 bg-background" />
      </div>
      <CategoryChips categories={choices} value={categoryId} onChange={setCategoryId} />
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || Number.isNaN(value) || value === 0} onClick={() => run(() => updatePurchase(purchase.id, { categoryId, spentOn, amount: value, note }))}>
          {pending && <Loader2 className="size-3.5 animate-spin" />} Save
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-coral-foreground" disabled={pending} onClick={() => run(() => deletePurchase(purchase.id))}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
