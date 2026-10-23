"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, EyeOff, Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moneyColorNames, moneyColors, moneyKindInfo, type MoneyCategory, type MoneyColor, type MoneyKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addCategory, moveCategory, renameCategory, saveColorLabels, setCategoryArchived } from "../actions";

export function AddCategory({ kind }: { kind: MoneyKind }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      const result = await addCategory({ name, kind });
      setError(result.error);
      if (!result.error) setName("");
    });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          aria-label={`New ${moneyKindInfo[kind].label.toLowerCase()} category`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              e.preventDefault();
              add();
            }
          }}
          maxLength={60}
          placeholder={`Add ${moneyKindInfo[kind].label.toLowerCase()}`}
          className="h-9 bg-background"
        />
        <Button variant="secondary" className="h-9" onClick={add} disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </div>
  );
}

export function CategoryRow({ category: c, first, last }: { category: MoneyCategory; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ error: string | null }>, after?: () => void) =>
    start(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) after?.();
    });

  const icon = "rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30";
  return (
    <li className="flex flex-col gap-1 py-1.5">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="h-8 flex-1 bg-background"
              autoFocus
            />
            <button type="button" aria-label="Save name" className={icon} disabled={pending || !name.trim()} onClick={() => run(() => renameCategory(c.id, name), () => setEditing(false))}>
              <Check className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              className={icon}
              onClick={() => {
                setName(c.name);
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <span className={cn("min-w-0 flex-1 truncate text-sm", c.archived && "text-muted-foreground line-through")}>{c.name}</span>
            {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            {!c.archived && (
              <>
                <button type="button" aria-label={`Move ${c.name} up`} className={icon} disabled={first || pending} onClick={() => run(() => moveCategory(c.id, -1))}>
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" aria-label={`Move ${c.name} down`} className={icon} disabled={last || pending} onClick={() => run(() => moveCategory(c.id, 1))}>
                  <ArrowDown className="size-3.5" />
                </button>
                <button type="button" aria-label={`Rename ${c.name}`} className={icon} onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={c.archived ? `Bring back ${c.name}` : `Hide ${c.name} from new months`}
              title={c.archived ? "Bring back" : "Hide from new months; past months keep it"}
              className={icon}
              disabled={pending}
              onClick={() => run(() => setCategoryArchived(c.id, !c.archived))}
            >
              {c.archived ? <RotateCcw className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
          </>
        )}
      </div>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </li>
  );
}

// What each colour means: "to check", "paused", "one-time"... Blank goes
// back to the colour's own name.
export function ColorNames({ labels }: { labels: Record<MoneyColor, string> }) {
  const [names, setNames] = useState(labels);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = moneyColors.some((c) => names[c] !== labels[c]);

  return (
    <Card size="sm" id="colours">
      <CardHeader>
        <CardTitle className="text-heading">Colours</CardTitle>
        <p className="text-sm text-muted-foreground">
          Colour any amount in a month with the dot in its field. Name the colours so you remember what they mean.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {moneyColors.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <span className="size-8 shrink-0 rounded-lg ring-1 ring-foreground/20" style={{ background: `var(--cell-${c})` }} aria-hidden />
              <Input
                aria-label={`What ${moneyColorNames[c].toLowerCase()} means`}
                value={names[c]}
                onChange={(e) => {
                  setNames({ ...names, [c]: e.target.value });
                  setSaved(false);
                }}
                maxLength={30}
                placeholder={moneyColorNames[c]}
                className="h-9 bg-background"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const result = await saveColorLabels(names);
                setError(result.error);
                setSaved(!result.error);
              })
            }
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />} Save names
          </Button>
          {(error || saved) && (
            <span className={cn("text-sm", error ? "text-coral-foreground" : "text-muted-foreground")} role="status">
              {error ?? "Saved."}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
