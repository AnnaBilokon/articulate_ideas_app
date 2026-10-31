"use client";

import { useState, useTransition } from "react";
import { EyeOff, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { SpendIconBadge, spendIconComponents } from "@/components/spend-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { spendColors, spendIcons, starterCategories, type SpendCategory, type SpendColor, type SpendIcon } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { deleteSpendCategory, saveSpendCategory, setPayday, setSpendCategoryArchived } from "./actions";

// Spending categories: a name, an icon and a colour each, and optionally a
// Money pot that purchases in it can be taken from.

export type PotOption = { id: string; name: string };

const potNamed = (pots: PotOption[], name: string) => pots.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())?.id ?? null;

function CategoryForm({
  id,
  initial,
  pots,
  onDone,
}: {
  id: string | null;
  initial: { name: string; icon: SpendIcon; color: SpendColor; potCategoryId: string | null };
  pots: PotOption[];
  onDone: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState<SpendIcon>(initial.icon);
  const [color, setColor] = useState<SpendColor>(initial.color);
  const [potId, setPotId] = useState<string | null>(initial.potCategoryId);
  // A new category picks the pot with its name until a pot is chosen by hand.
  const [potChosen, setPotChosen] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const key = id ?? "new";

  const save = () =>
    start(async () => {
      const result = await saveSpendCategory(id, { name, icon, color, potCategoryId: potId });
      setError(result.error);
      if (!result.error) onDone();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <SpendIconBadge icon={icon} color={color} size="lg" />
        <Input
          aria-label="Category name"
          id={`spend-name-${key}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!potChosen) setPotId(potNamed(pots, e.target.value));
          }}
          maxLength={40}
          placeholder="e.g. Groceries"
          className="h-10 bg-background md:text-base"
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
        {spendColors.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn("size-8 rounded-full ring-offset-2 ring-offset-card transition", color === c ? "ring-2 ring-foreground" : "hover:scale-110")}
            style={{ background: `var(--spend-${c})` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10" role="radiogroup" aria-label="Icon">
        {spendIcons.map((i) => {
          const Icon = spendIconComponents[i];
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={icon === i}
              aria-label={i}
              onClick={() => setIcon(i)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg transition-colors",
                icon === i ? "ring-2 ring-primary" : "hover:bg-muted",
              )}
              style={icon === i ? { background: `var(--spend-${color})`, color: `var(--spend-${color}-foreground)` } : undefined}
            >
              <Icon className="size-4.5" />
            </button>
          );
        })}
      </div>
      {pots.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span>Takes from pot</span>
          <select
            value={potId ?? ""}
            onChange={(e) => {
              setPotId(e.target.value || null);
              setPotChosen(true);
            }}
            className="h-9 rounded-lg border border-input bg-background px-2.5"
          >
            <option value="">None</option>
            {pots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">You&apos;ll be asked each time whether to take a purchase from it.</span>
        </label>
      )}
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || !name.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" />} {id ? "Save" : "Add category"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function NewSpendCategory({ pots }: { pots: PotOption[] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New category
      </Button>
    );
  }
  return (
    <Card>
      <CardContent>
        <CategoryForm id={null} initial={{ name: "", icon: "cart", color: "blue", potCategoryId: null }} pots={pots} onDone={() => setOpen(false)} />
      </CardContent>
    </Card>
  );
}

/** One tap adds a suggested category. */
export function StarterCategories({ existing, pots = [] }: { existing: string[]; pots?: PotOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const left = starterCategories.filter((s) => !existing.some((e) => e.toLowerCase() === s.name.toLowerCase()));
  if (left.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">Tap to add:</span>
      <div className="flex flex-wrap gap-2">
        {left.map((s) => (
          <button
            key={s.name}
            type="button"
            disabled={pending}
            onClick={() => {
              setBusy(s.name);
              start(async () => {
                setError((await saveSpendCategory(null, { ...s, potCategoryId: potNamed(pots, s.name) })).error);
                setBusy(null);
              });
            }}
            className="flex items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy === s.name ? <Loader2 className="m-1.5 size-4 animate-spin" /> : <SpendIconBadge icon={s.icon} color={s.color} size="sm" />}
            {s.name}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-coral-foreground">{error}</p>}
    </div>
  );
}

export function SpendCategoryRow({ category: c, purchases, pots }: { category: SpendCategory; purchases: number; pots: PotOption[] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ error: string | null }>) => start(async () => setError((await action()).error));

  if (editing) {
    return (
      <Card size="sm">
        <CardContent>
          <CategoryForm
            id={c.id}
            initial={{ name: c.name, icon: c.icon, color: c.color, potCategoryId: c.potCategoryId }}
            pots={pots}
            onDone={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }
  const icon = "rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <SpendIconBadge icon={c.icon} color={c.color} />
        <span className={cn("flex min-w-0 flex-1 flex-col", c.archived && "text-muted-foreground")}>
          <span className="truncate font-medium">{c.name}</span>
          <span className="text-xs text-muted-foreground">
            {purchases === 0 ? "No purchases yet" : `${purchases} ${purchases === 1 ? "purchase" : "purchases"}`}
            {c.potCategoryId && ` · from the ${pots.find((p) => p.id === c.potCategoryId)?.name ?? ""} pot`}
            {c.archived && " · hidden"}
          </span>
        </span>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <button type="button" className={icon} aria-label={`Edit ${c.name}`} onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className={icon}
          aria-label={c.archived ? `Bring back ${c.name}` : `Hide ${c.name}`}
          title={c.archived ? "Bring back" : "Hide from adding purchases; its purchases stay"}
          disabled={pending}
          onClick={() => run(() => setSpendCategoryArchived(c.id, !c.archived))}
        >
          {c.archived ? <RotateCcw className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
        {purchases === 0 && (
          <button type="button" className={icon} aria-label={`Delete ${c.name}`} disabled={pending} onClick={() => run(() => deleteSpendCategory(c.id))}>
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </div>
  );
}

/** The day pay arrives: each month runs from it to the day before the next one. */
export function PaydayPicker({ payday }: { payday: number }) {
  const [day, setDay] = useState(payday);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="payday">Payday</label>
      <select
        id="payday"
        value={day}
        onChange={(e) => {
          setDay(Number(e.target.value));
          setSaved(false);
        }}
        className="h-9 rounded-lg border border-input bg-background px-2.5"
      >
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || day === payday}
        onClick={() =>
          start(async () => {
            const result = await setPayday(day);
            setError(result.error);
            setSaved(!result.error);
          })
        }
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />} Save
      </Button>
      {(error || saved) && <span className={cn(error ? "text-coral-foreground" : "text-muted-foreground")}>{error ?? "Saved."}</span>}
    </div>
  );
}
