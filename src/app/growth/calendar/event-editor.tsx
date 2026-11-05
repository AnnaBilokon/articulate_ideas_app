"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DAY_MINUTES,
  formatMinutes,
  goalColorNames,
  goalColors,
  parseMinutes,
  type CalendarEvent,
  type GoalColor,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { createEvent, deleteEvent, setEventDone, updateEvent } from "./actions";

/** What the editor opens on: an event to change, or a new one with a time picked. */
export type EditorTarget = { event: CalendarEvent } | { draft: CalendarEvent["when"] };

// Add or change one event: its name, day, time (or the whole day), colour and
// notes; tick it off or delete it.
export function EventEditor({
  target,
  defaultColor,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: EditorTarget;
  defaultColor: GoalColor;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const existing = "event" in target ? target.event : null;
  const when = existing ? existing.when : (target as { draft: CalendarEvent["when"] }).draft;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [color, setColor] = useState<GoalColor>(existing?.color ?? defaultColor);
  const [date, setDate] = useState(when.date);
  const [allDay, setAllDay] = useState(when.allDay);
  const [start, setStart] = useState(formatMinutes(when.allDay ? 9 * 60 : when.start));
  const [end, setEnd] = useState(when.allDay ? "10:00" : when.end === DAY_MINUTES ? "24:00" : formatMinutes(when.end));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error: string | null; event?: CalendarEvent }>, after: (event?: CalendarEvent) => void) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) after(result.event);
    });

  function save() {
    const startMin = parseMinutes(start);
    // "00:00" as an end means midnight at the end of the day.
    const endParsed = parseMinutes(end);
    const endMin = endParsed === 0 ? DAY_MINUTES : endParsed;
    if (!allDay && (startMin === null || endMin === null)) return setError("Write the times like 09:30.");
    const input = {
      title,
      notes,
      color,
      when: allDay ? { allDay: true as const, date } : { allDay: false as const, date, start: startMin!, end: endMin! },
    };
    run(
      () => (existing ? updateEvent(existing.id, input) : createEvent(input)),
      (event) => event && onSaved(event),
    );
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-5 text-card-foreground shadow-xl ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="font-semibold text-heading">{existing ? "Change" : "Add to your calendar"}</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" disabled={pending} />}>
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            maxLength={200}
            autoFocus
            placeholder="What do you want to do?"
            aria-label="Name"
            className="h-10 text-base"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Day" className="h-9 w-40" />
            {!allDay && (
              <span className="flex items-center gap-1.5">
                <Input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} aria-label="Starts" className="h-9 w-28" />
                <span className="text-muted-foreground">–</span>
                <Input type="time" step={900} value={end === "24:00" ? "00:00" : end} onChange={(e) => setEnd(e.target.value)} aria-label="Ends" className="h-9 w-28" />
              </span>
            )}
          </div>
          <label className="flex w-fit items-center gap-2 text-sm">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-4 accent-primary" />
            No set time: a to-do for the day
          </label>

          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {goalColors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={goalColorNames[c]}
                title={goalColorNames[c]}
                onClick={() => setColor(c)}
                className={cn("size-7 rounded-full ring-1 ring-foreground/15", color === c && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
                style={{ background: `var(--goal-${c}-bar)` }}
              />
            ))}
          </div>

          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Notes (optional)" aria-label="Notes" />

          {error && (
            <p className="text-sm text-coral-foreground" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={pending || !title.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
            {existing && (
              <>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => setEventDone(existing.id, !existing.done), (event) => event && onSaved(event))}
                >
                  <Check className="size-4" /> {existing.done ? "Not done yet" : "Done"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => deleteEvent(existing.id), () => onDeleted(existing.id))}
                  className="ml-auto text-muted-foreground hover:text-coral-foreground"
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
