"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { SpendIconBadge } from "@/components/spend-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKr, type SpendCategory } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { addPurchase } from "./actions";

/** "129", "1 299,50", "-45" (a refund) → a number; anything else → NaN. */
export function parseKr(text: string): number {
  const t = text.replace(/\s/g, "").replace(/kr$/i, "").replace(",", ".").replace("−", "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

/** Category chips to pick one, icons first. */
export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: SpendCategory[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Category">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl p-2 text-center text-xs transition-colors",
            value === c.id ? "bg-accent ring-2 ring-primary" : "hover:bg-muted",
          )}
        >
          <SpendIconBadge icon={c.icon} color={c.color} />
          <span className="line-clamp-2 leading-tight">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

// Logging a purchase: amount, category, date (today unless changed), note.
// The category and date stay for the next one.
export function AddPurchase({ categories, today }: { categories: SpendCategory[]; today: string }) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const value = parseKr(amount);
  const bad = amount.trim() !== "" && (Number.isNaN(value) || value === 0);

  const add = () =>
    start(async () => {
      if (!categoryId) return setError("Pick a category.");
      const result = await addPurchase({ categoryId, spentOn, amount: value, note });
      setError(result.error);
      if (!result.error) {
        const name = categories.find((c) => c.id === categoryId)?.name ?? "";
        setAdded(`${formatKr(value)} to ${name}`);
        setAmount("");
        setNote("");
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading">Add a purchase</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Amount"
            aria-invalid={bad || undefined}
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAdded(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !bad && amount.trim() && categoryId) add();
            }}
            placeholder="0"
            className="h-12 bg-background text-right text-2xl font-semibold tabular-nums md:text-2xl"
          />
          <span className="text-lg text-muted-foreground">kr</span>
        </div>
        <CategoryChips categories={categories} value={categoryId} onChange={setCategoryId} />
        <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Input
            type="date"
            aria-label="Date"
            value={spentOn}
            max={today}
            onChange={(e) => setSpentOn(e.target.value)}
            className="h-10 bg-background"
          />
          <Input
            aria-label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Note (optional)"
            className="h-10 bg-background"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={add} disabled={pending || bad || !amount.trim() || !categoryId || !spentOn}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
          </Button>
          <span className={cn("flex items-center gap-1 text-sm", error ? "text-coral-foreground" : "text-success-foreground")} role="status">
            {error ?? (added && (
              <>
                <Check className="size-4" /> Added {added}
              </>
            ))}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">A refund? Enter it with a minus: −120.</p>
      </CardContent>
    </Card>
  );
}
