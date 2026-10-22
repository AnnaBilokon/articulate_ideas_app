"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, EyeOff, Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moneyKindInfo, type MoneyCategory, type MoneyKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { addCategory, moveCategory, renameCategory, setCategoryArchived } from "../actions";

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
