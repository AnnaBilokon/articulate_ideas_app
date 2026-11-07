"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addMotivation, deleteMotivation, updateMotivation } from "../actions";

// Notes to yourself at the top of Goals, there every time you open it: why
// you started, a line that keeps you going. Add, change or remove them here.
export function MotivationNotes({ notes }: { notes: { id: string; body: string }[] }) {
  // "new" while adding, a note's id while changing it.
  const [editing, setEditing] = useState<string | null>(notes.length === 0 ? "new" : null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = (id: string, body: string) => {
    setEditing(id);
    setText(body);
    setError(null);
  };
  const close = () => {
    setEditing(notes.length === 0 ? "new" : null);
    setText("");
  };
  const save = () =>
    start(async () => {
      const result = editing === "new" ? await addMotivation(text) : await updateMotivation(editing!, text);
      setError(result.error);
      if (!result.error) {
        setEditing(null);
        setText("");
      }
    });

  const editor = (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && text.trim()) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape" && notes.length > 0) close();
        }}
        rows={2}
        maxLength={500}
        autoFocus={notes.length > 0}
        placeholder="Why you started, or a line that keeps you going"
        aria-label="Your note"
        className="bg-background"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={!text.trim() || pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />} Save
        </Button>
        {notes.length > 0 && (
          <Button size="sm" variant="ghost" onClick={close} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-4 border-l-4 border-primary p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Heart className="size-3.5 text-primary" /> For me
          </span>
          {notes.length > 0 && editing === null && (
            <Button size="sm" variant="ghost" onClick={() => open("new", "")}>
              <Plus className="size-3.5" /> Add
            </Button>
          )}
        </div>

        {notes.length === 0 && (
          <p className="-mt-2 text-sm text-muted-foreground">Write something to read every time you open Growth.</p>
        )}

        {notes.length > 0 && (
          // Each note on its own tile, so two notes never read as one.
          <ul className="flex flex-col gap-2.5">
            {notes.map((n) =>
              editing === n.id ? (
                <li key={n.id}>{editor}</li>
              ) : (
                <li key={n.id} className="group flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3">
                  <p className="flex-1 text-base leading-7 font-medium text-pretty sm:text-lg whitespace-pre-wrap text-heading">{n.body}</p>
                  <span className="flex shrink-0 gap-0.5 pt-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => open(n.id, n.body)}
                      aria-label="Change this note"
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => start(async () => setError((await deleteMotivation(n.id)).error))}
                      disabled={pending}
                      aria-label="Remove this note"
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {editing === "new" && editor}
        {error && (
          <p className="text-sm text-coral-foreground" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
