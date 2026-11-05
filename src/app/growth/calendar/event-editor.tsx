"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DAY_MINUTES, SNAP_MINUTES, formatMinutes, goalColorNames, goalColors, type CalendarEvent, type GoalColor } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { createEvent, deleteEvent, setEventDone, updateEvent } from "./actions";

// Times to pick from, every 15 minutes, written the 24-hour way whatever the
// computer's clock setting (a time input would show "01:00 PM" on some).
const TIMES = Array.from({ length: DAY_MINUTES / SNAP_MINUTES + 1 }, (_, i) => i * SNAP_MINUTES);

function TimeSelect({ value, onChange, times, label }: { value: number; onChange: (minutes: number) => void; times: number[]; label: string }) {
  // A time off the 15-minute marks (saved before) is kept in the list.
  const options = times.includes(value) ? times : [...times, value].sort((a, b) => a - b);
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="h-9 rounded-lg border border-input bg-background px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((t) => (
        <option key={t} value={t}>
          {t === DAY_MINUTES ? "24:00" : formatMinutes(t)}
        </option>
      ))}
    </select>
  );
}

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

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
  const [start, setStart] = useState(when.allDay ? 9 * 60 : when.start);
  const [end, setEnd] = useState(when.allDay ? 10 * 60 : when.end);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateInput = useRef<HTMLInputElement>(null);

  const run = (action: () => Promise<{ error: string | null; event?: CalendarEvent }>, after: (event?: CalendarEvent) => void) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) after(result.event);
    });

  function save() {
    const input = {
      title,
      notes,
      color,
      when: allDay ? { allDay: true as const, date } : { allDay: false as const, date, start, end },
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
            {/* The day written "Thu 5 Nov 2026"; a date input would show the computer's
                format (11/05/2026 on some). It opens the browser's date picker. */}
            <span className="relative">
              <button
                type="button"
                onClick={() => (dateInput.current?.showPicker ? dateInput.current.showPicker() : dateInput.current?.focus())}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {dayLabel.format(new Date(`${date}T00:00:00Z`))}
              </button>
              <input
                ref={dateInput}
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                tabIndex={-1}
                aria-label="Day"
                className="pointer-events-none absolute inset-0 opacity-0"
              />
            </span>
            {!allDay && (
              <span className="flex items-center gap-1.5">
                <TimeSelect
                  label="Starts"
                  value={start}
                  times={TIMES.filter((t) => t < DAY_MINUTES)}
                  // Moving the start keeps the length, as far as midnight.
                  onChange={(next) => {
                    setEnd(Math.min(DAY_MINUTES, next + (end - start)));
                    setStart(next);
                  }}
                />
                <span className="text-muted-foreground">–</span>
                <TimeSelect label="Ends" value={end} times={TIMES.filter((t) => t > start)} onChange={setEnd} />
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
