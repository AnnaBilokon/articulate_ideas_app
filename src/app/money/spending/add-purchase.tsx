"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { SpendIconBadge } from "@/components/spend-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice, type SpendCategory } from "@/lib/schemas";
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
// The category and date stay for the next one. In a category linked to a
// Money pot, it asks whether to take the purchase from the pot.
export function AddPurchase({
  categories,
  today,
  potNames,
}: {
  categories: SpendCategory[];
  today: string;
  /** Money pot names by id. */
  potNames: Record<string, string>;
}) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const value = parseKr(amount);
  const bad = amount.trim() !== "" && (Number.isNaN(value) || value === 0);
  const category = categories.find((c) => c.id === categoryId);
  const pot = category?.potCategoryId ? potNames[category.potCategoryId] : undefined;

  const save = (fromPot: boolean) =>
    start(async () => {
      if (!categoryId) return setError("Pick a category.");
      const result = await addPurchase({ categoryId, spentOn, amount: value, note, fromPot });
      setError(result.error);
      setAsking(false);
      if (!result.error) {
        setAdded(`${formatPrice(value)} to ${category?.name ?? ""}${fromPot ? `, from the ${pot} pot` : ""}`);
        setAmount("");
        setNote("");
      }
    });
  // A category with a pot asks first; the others just save.
  const add = () => (pot ? setAsking(true) : save(false));

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
              setAsking(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !bad && amount.trim() && categoryId) add();
            }}
            placeholder="0"
            className="h-12 bg-background text-right text-2xl font-semibold tabular-nums md:text-2xl"
          />
          <span className="text-lg text-muted-foreground">kr</span>
        </div>
        <CategoryChips
          categories={categories}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setAsking(false);
          }}
        />
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
        {asking && pot ? (
          <div className="flex flex-col gap-3 rounded-xl bg-accent/70 p-3" role="alertdialog" aria-label="Take it from the pot?">
            <p className="text-sm font-medium">
              {value < 0 ? `Put ${formatPrice(-value)} back in your ${pot} pot?` : `Take ${formatPrice(value)} from your ${pot} pot?`}
            </p>
            <p className="-mt-2 text-xs text-muted-foreground">It then counts as spent from the pot in Money, and what&apos;s left goes down.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={() => save(true)}>
                {pending && <Loader2 className="size-3.5 animate-spin" />} {value < 0 ? "Yes, back in the pot" : "Yes, from the pot"}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => save(false)}>
                No, just log it
              </Button>
            </div>
          </div>
        ) : (
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
        )}
        <p className="text-xs text-muted-foreground">A refund? Enter it with a minus: −120.</p>
      </CardContent>
    </Card>
  );
}
