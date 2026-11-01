"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, type WishItem, type WishList } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  addWishItem,
  createWishList,
  deleteWishItem,
  deleteWishList,
  renameWishList,
  setWishItemBought,
  updateWishItem,
} from "./actions";
import { PhotoPicker } from "./photo-picker";

// The wishlist: your lists as tabs, things to buy as cards with their photo,
// and what you've bought, kept below.

const priceText = (v: string) => {
  const t = v.replace(/\s/g, "").replace(/kr$/i, "").replace(",", ".");
  if (t === "") return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};

function ItemForm({
  item,
  lists,
  defaultListId,
  onDone,
}: {
  item: WishItem | null;
  lists: WishList[];
  defaultListId: string | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [price, setPrice] = useState(item?.price === null || item?.price === undefined ? "" : String(item.price));
  const [url, setUrl] = useState(item?.url ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [listId, setListId] = useState<string | null>(item ? item.listId : defaultListId);
  const [photo, setPhoto] = useState<{ path: string | null; url: string | null }>({ path: item?.imagePath ?? null, url: item?.imageUrl ?? null });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const amount = priceText(price);
  const key = item?.id ?? "new";

  const save = () =>
    start(async () => {
      const input = { title, listId, price: amount, url, note, imagePath: photo.path };
      const result = item ? await updateWishItem(item.id, input) : await addWishItem(input);
      setError(result.error);
      if (!result.error) onDone();
    });

  return (
    <div className="flex flex-col gap-3">
      <PhotoPicker path={photo.path} url={photo.url} onChange={setPhoto} />
      <Input
        aria-label="What is it"
        id={`wish-title-${key}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="What is it? e.g. Linen shirt"
        className="h-10 bg-background md:text-base"
        autoFocus={!item}
      />
      <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="flex items-center gap-1.5">
          <Input
            aria-label="Price"
            aria-invalid={Number.isNaN(amount) || undefined}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="h-10 bg-background text-right tabular-nums"
          />
          <span className="text-sm text-muted-foreground">kr</span>
        </div>
        <Input
          aria-label="Link"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2000}
          placeholder="Link to the shop (optional)"
          className="h-10 bg-background"
        />
      </div>
      {lists.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <span>List</span>
          <select
            aria-label="List"
            value={listId ?? ""}
            onChange={(e) => setListId(e.target.value || null)}
            className="h-9 rounded-lg border border-input bg-background px-2.5"
          >
            <option value="">No list</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Textarea
        aria-label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Note: size, colour, where you saw it (optional)"
        className="bg-background"
      />
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || !title.trim() || Number.isNaN(amount)}>
          {pending && <Loader2 className="size-4 animate-spin" />} {item ? "Save" : "Add to the list"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ItemCard({ item, lists }: { item: WishItem; lists: WishList[] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ error: string | null }>) => start(async () => setError((await action()).error));
  const list = lists.find((l) => l.id === item.listId);

  if (editing) {
    return (
      <Card size="sm" className="sm:col-span-2">
        <CardContent>
          <ItemForm item={item} lists={lists} defaultListId={item.listId} onDone={() => setEditing(false)} />
        </CardContent>
      </Card>
    );
  }
  const icon = "rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40";
  return (
    <Card size="sm" className={cn("overflow-hidden", item.boughtAt && "opacity-70")}>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a private, short-lived link, already resized
        <img src={item.imageUrl} alt="" className="-mt-3 mb-1 aspect-[4/3] w-full bg-muted object-cover" loading="lazy" />
      )}
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className={cn("min-w-0 font-medium", item.boughtAt && "line-through decoration-muted-foreground/50")}>{item.title}</span>
          {item.price !== null && <span className="shrink-0 font-semibold text-heading tabular-nums">{formatPrice(item.price)}</span>}
        </div>
        {(item.note || list) && (
          <span className="text-xs text-muted-foreground">{[list?.name, item.note].filter(Boolean).join(" · ")}</span>
        )}
        <div className="flex items-center gap-1 pt-1">
          <Button
            size="sm"
            variant={item.boughtAt ? "ghost" : "secondary"}
            disabled={pending}
            onClick={() => run(() => setWishItemBought(item.id, !item.boughtAt))}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : item.boughtAt ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            {item.boughtAt ? "Put back" : "Bought"}
          </Button>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={icon} aria-label={`Open the shop for ${item.title}`}>
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <span className="flex-1" />
          <button type="button" className={icon} aria-label={`Edit ${item.title}`} onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
          </button>
          <button type="button" className={icon} aria-label={`Delete ${item.title}`} disabled={pending} onClick={() => run(() => deleteWishItem(item.id))}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
        {error && <span className="text-xs text-coral-foreground">{error}</span>}
      </CardContent>
    </Card>
  );
}

function NewList({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const create = () =>
    start(async () => {
      const result = await createWishList(name);
      setError(result.error);
      if (result.id) {
        setName("");
        setOpen(false);
        onCreated(result.id);
      }
    });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="size-3.5" /> New list
      </button>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Input
        aria-label="New list name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) create();
          if (e.key === "Escape") setOpen(false);
        }}
        maxLength={40}
        placeholder="e.g. Clothes"
        className="h-8 w-36 bg-background"
        autoFocus
      />
      <Button size="sm" disabled={pending || !name.trim()} onClick={create}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </Button>
      <button type="button" aria-label="Cancel" onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </span>
  );
}

function ListSettings({ list, onDeleted }: { list: WishList; onDeleted: () => void }) {
  const [name, setName] = useState(list.name);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Input aria-label="List name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-8 w-44 bg-background" />
      {name.trim() !== list.name && (
        <Button size="sm" variant="secondary" disabled={pending || !name.trim()} onClick={() => start(async () => setError((await renameWishList(list.id, name)).error))}>
          Rename
        </Button>
      )}
      {confirming ? (
        <>
          <span className="text-muted-foreground">Delete the list? Its items stay, without a list.</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await deleteWishList(list.id);
                setError(result.error);
                if (!result.error) onDeleted();
              })
            }
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-coral-foreground" onClick={() => setConfirming(true)}>
          <Trash2 className="size-3.5" /> Delete list
        </Button>
      )}
      {error && <span className="text-xs text-coral-foreground">{error}</span>}
    </div>
  );
}

export function WishlistBoard({ lists, items, startAdding }: { lists: WishList[]; items: WishItem[]; startAdding: boolean }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [adding, setAdding] = useState(startAdding);
  const [managing, setManaging] = useState(false);
  const inList = (i: WishItem) => current === null || i.listId === current;
  const wanted = items.filter((i) => !i.boughtAt && inList(i));
  const bought = items.filter((i) => i.boughtAt && inList(i));
  const total = wanted.reduce((t, i) => t + (i.price ?? 0), 0);
  const currentList = lists.find((l) => l.id === current);

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Lists" className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {[{ id: null, name: "All" } as { id: string | null; name: string }, ...lists].map((l) => {
          const count = items.filter((i) => !i.boughtAt && (l.id === null || i.listId === l.id)).length;
          return (
            <button
              key={l.id ?? "all"}
              type="button"
              aria-pressed={current === l.id}
              onClick={() => {
                setCurrent(l.id);
                setManaging(false);
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                current === l.id ? "bg-highlight font-medium text-highlight-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {l.name} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
        <NewList onCreated={(id) => setCurrent(id)} />
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {wanted.length} {wanted.length === 1 ? "thing" : "things"} to buy
          {total > 0 && <> · {formatPrice(total)} in all</>}
        </span>
        <div className="flex items-center gap-2">
          {currentList && (
            <Button size="sm" variant="ghost" onClick={() => setManaging(!managing)}>
              <Pencil className="size-3.5" /> List
            </Button>
          )}
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> Add something
            </Button>
          )}
        </div>
      </div>
      {managing && currentList && (
        <ListSettings
          key={currentList.id}
          list={currentList}
          onDeleted={() => {
            setCurrent(null);
            setManaging(false);
          }}
        />
      )}

      {adding && (
        <Card>
          <CardContent>
            <ItemForm item={null} lists={lists} defaultListId={current} onDone={() => setAdding(false)} />
          </CardContent>
        </Card>
      )}

      {wanted.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          {items.length === 0 ? "Nothing here yet. Add something you'd like to buy later, with a photo or a screenshot." : "Nothing left to buy here."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wanted.map((i) => (
            <li key={i.id} className="contents">
              <ItemCard item={i} lists={lists} />
            </li>
          ))}
        </ul>
      )}

      {bought.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Bought ({bought.length})</summary>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bought.map((i) => (
              <li key={i.id} className="contents">
                <ItemCard item={i} lists={lists} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
