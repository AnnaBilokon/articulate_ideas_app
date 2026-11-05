"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { zonedMinutes } from "@/lib/schedule";
import {
  DAY_MINUTES,
  SNAP_MINUTES,
  addDays,
  formatMinutes,
  goalColorStyle,
  layoutDay,
  type CalendarEvent,
  type EventWhen,
  type GoalColor,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { moveEvent, setEventDone } from "./actions";
import { EventEditor, type EditorTarget } from "./event-editor";

// A week or day calendar like Google's: hours down the side. Drag on empty
// time to block it (or click for an hour), drag a block to move it, drag its
// bottom edge to resize, click it to change it. To-dos with no time sit above
// the hours. On a touch screen, tap instead of drag, so the page still scrolls.

const HOUR_PX = 48;
const MIN_BLOCK_PX = 22;
const FIRST_HOUR = 7; // Scrolled to on open.
const MOVE_THRESHOLD_PX = 5;

type View = "week" | "day";
type Timed = CalendarEvent & { when: Extract<EventWhen, { allDay: false }> };

type Drag =
  | { kind: "create"; day: number; anchor: number; current: number; x: number; y: number; moved: boolean; touch: boolean }
  | { kind: "move"; event: Timed; offset: number; day: number; start: number; x: number; y: number; moved: boolean; touch: boolean }
  | { kind: "resize"; event: Timed; end: number; moved: boolean };

const snap = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isTimed = (e: CalendarEvent): e is Timed => !e.when.allDay;

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
const longDayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

function rangeLabel(days: string[]): string {
  if (days.length === 1) return longDayFormat.format(asDate(days[0]));
  const [first, last] = [asDate(days[0]), asDate(days.at(-1)!)];
  const sameMonth = first.getUTCMonth() === last.getUTCMonth();
  return sameMonth
    ? `${dayOnly.format(first)} – ${dayOnly.format(last)} ${monthFormat.format(last)}`
    : `${dayOnly.format(first)} ${monthFormat.format(first).split(" ")[0]} – ${dayOnly.format(last)} ${monthFormat.format(last)}`;
}

export function CalendarView({
  week,
  date,
  today,
  view: initialView,
  events: initialEvents,
}: {
  // Monday of the week shown, the day picked, and today (YYYY-MM-DD).
  week: string;
  date: string;
  today: string;
  view: View | null;
  events: CalendarEvent[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const view: View = initialView ?? "week";
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [lastColor, setLastColor] = useState<GoalColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const days = view === "week" ? weekDays : [date];

  // The current time, for the line across today; updated every minute.
  useEffect(() => {
    const tick = () => setNow(zonedMinutes(new Date()));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const first = days.includes(today) && now !== null ? Math.max(0, now / 60 - 1.5) : FIRST_HOUR;
    // A little less, so the first hour's label shows below the pinned day names.
    scrollRef.current?.scrollTo({ top: Math.max(0, first * HOUR_PX - 12) });
    // Only when the days shown change, not every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date, week]);

  const go = (nextDate: string, nextView: View = view) => router.push(`/growth/calendar?date=${nextDate}&view=${nextView}`);
  const step = view === "week" ? 7 : 1;

  // On a phone, open on the day unless a view was picked.
  useEffect(() => {
    if (!initialView && window.matchMedia("(max-width: 639px)").matches) {
      router.replace(`/growth/calendar?date=${date}&view=day`);
    }
  }, [initialView, date, router]);

  // --- Pointer position to day and time ------------------------------------
  function pointAt(clientX: number, clientY: number) {
    const rect = gridRef.current!.getBoundingClientRect();
    const day = clamp(Math.floor(((clientX - rect.left) / rect.width) * days.length), 0, days.length - 1);
    const minutes = clamp(((clientY - rect.top) / HOUR_PX) * 60, 0, DAY_MINUTES);
    return { day, minutes };
  }

  function startCreate(e: ReactPointerEvent<HTMLDivElement>, day: number) {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const touch = e.pointerType === "touch";
    if (!touch) e.currentTarget.setPointerCapture(e.pointerId);
    const minutes = Math.floor(pointAt(e.clientX, e.clientY).minutes / SNAP_MINUTES) * SNAP_MINUTES;
    setDrag({ kind: "create", day, anchor: minutes, current: minutes, x: e.clientX, y: e.clientY, moved: false, touch });
  }

  function startMove(e: ReactPointerEvent<HTMLElement>, event: Timed) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const touch = e.pointerType === "touch";
    if (!touch) e.currentTarget.setPointerCapture(e.pointerId);
    const at = pointAt(e.clientX, e.clientY);
    setDrag({
      kind: "move",
      event,
      offset: at.minutes - event.when.start,
      day: days.indexOf(event.when.date),
      start: event.when.start,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      touch,
    });
  }

  function startResize(e: ReactPointerEvent<HTMLElement>, event: Timed) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind: "resize", event, end: event.when.end, moved: false });
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const far = "x" in drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > MOVE_THRESHOLD_PX;
    // A finger moving is the page scrolling: drop the gesture.
    if ("touch" in drag && drag.touch) {
      if (far) setDrag(null);
      return;
    }
    const at = pointAt(e.clientX, e.clientY);
    if (drag.kind === "create") {
      setDrag({ ...drag, current: snap(at.minutes), moved: drag.moved || far });
    } else if (drag.kind === "move") {
      const length = drag.event.when.end - drag.event.when.start;
      const start = clamp(snap(at.minutes - drag.offset), 0, DAY_MINUTES - length);
      setDrag({ ...drag, day: at.day, start, moved: drag.moved || far });
    } else {
      setDrag({ ...drag, end: clamp(snap(at.minutes), drag.event.when.start + SNAP_MINUTES, DAY_MINUTES), moved: true });
    }
  }

  function onPointerUp() {
    if (!drag) return;
    setDrag(null);
    if (drag.kind === "create") {
      const [from, to] = drag.moved
        ? [Math.min(drag.anchor, drag.current), Math.max(drag.anchor, drag.current)]
        : [drag.anchor, drag.anchor + 60];
      const start = clamp(from, 0, DAY_MINUTES - SNAP_MINUTES);
      const end = clamp(Math.max(to, start + SNAP_MINUTES), start + SNAP_MINUTES, DAY_MINUTES);
      setEditor({ draft: { allDay: false, date: days[drag.day], start, end } });
    } else if (!drag.moved) {
      setEditor({ event: drag.event });
    } else if (drag.kind === "move") {
      const { start, end } = drag.event.when;
      commitMove(drag.event, { allDay: false, date: days[drag.day], start: drag.start, end: drag.start + (end - start) });
    } else {
      commitMove(drag.event, { ...drag.event.when, end: drag.end });
    }
  }

  // Shown at once; put back if saving fails.
  async function commitMove(event: CalendarEvent, when: EventWhen) {
    const before = events;
    setEvents(events.map((e) => (e.id === event.id ? { ...e, when } : e)));
    const result = await moveEvent(event.id, when);
    setError(result.error);
    if (result.error) setEvents(before);
  }

  async function toggleDone(event: CalendarEvent) {
    const before = events;
    setEvents(events.map((e) => (e.id === event.id ? { ...e, done: !e.done } : e)));
    const result = await setEventDone(event.id, !event.done);
    setError(result.error);
    if (result.error) setEvents(before);
  }

  function saved(event: CalendarEvent) {
    setEditor(null);
    setLastColor(event.color);
    // Moved to another week: it's there when you go to that week.
    const inWeek = weekDays.includes(event.when.date);
    setEvents((all) => {
      const others = all.filter((e) => e.id !== event.id);
      return inWeek ? [...others, event] : others;
    });
  }

  // --- What to draw -------------------------------------------------------
  const timedFor = (day: string) => {
    const blocks = events.filter(isTimed).flatMap((e) => {
      // The block being dragged is drawn where it's going.
      if (drag?.kind === "move" && drag.moved && drag.event.id === e.id) {
        const length = e.when.end - e.when.start;
        return days[drag.day] === day ? [{ event: e, start: drag.start, end: drag.start + length }] : [];
      }
      if (drag?.kind === "resize" && drag.event.id === e.id) return e.when.date === day ? [{ event: e, start: e.when.start, end: drag.end }] : [];
      return e.when.date === day ? [{ event: e, start: e.when.start, end: e.when.end }] : [];
    });
    return layoutDay(blocks);
  };
  const toDos = (day: string) => events.filter((e) => e.when.allDay && e.when.date === day);
  const creating = drag?.kind === "create" && drag.moved ? drag : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(today)}>
          Today
        </Button>
        <Button variant="ghost" size="icon" aria-label={view === "week" ? "Previous week" : "Previous day"} onClick={() => go(addDays(date, -step))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={view === "week" ? "Next week" : "Next day"} onClick={() => go(addDays(date, step))}>
          <ChevronRight className="size-4" />
        </Button>
        <h2 className="mr-auto text-lg font-semibold tracking-tight text-heading">{rangeLabel(days)}</h2>
        <div className="flex rounded-full bg-muted p-0.5 text-sm" role="tablist" aria-label="View">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => go(date, v)}
              className={cn("rounded-full px-3 py-1 font-medium capitalize", view === v ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {v}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setEditor({ draft: { allDay: false, date: days.includes(today) ? today : days[0], start: 9 * 60, end: 10 * 60 } })}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {/* One scroll area for the day names and the hours, so the scrollbar
            takes the same width from both and their columns line up. */}
        <div ref={scrollRef} className="h-[65vh] min-h-96 overflow-y-auto">
          {/* Day names and to-dos with no time, pinned above the hours */}
          <div
            className="sticky top-0 z-30 grid border-b bg-card"
            style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div />
            {days.map((day) => (
              <div key={day} className="flex min-w-0 flex-col gap-1 border-l px-1 pt-2 pb-1.5">
                <button
                  type="button"
                  onClick={() => (view === "week" ? go(day, "day") : undefined)}
                  className={cn(
                    "mx-auto rounded-full px-2 py-0.5 text-xs font-medium",
                    day === today ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    view === "week" && day !== today && "hover:bg-muted",
                  )}
                >
                  {dayFormat.format(asDate(day))}
                </button>
                {toDos(day).map((e) => (
                  <div key={e.id} className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs" style={goalColorStyle(e.color)}>
                    <input
                      type="checkbox"
                      checked={e.done}
                      onChange={() => toggleDone(e)}
                      aria-label={`Done: ${e.title}`}
                      className="size-3 shrink-0 accent-primary"
                    />
                    <button type="button" onClick={() => setEditor({ event: e })} className={cn("min-w-0 flex-1 truncate text-left", e.done && "line-through opacity-60")}>
                      {e.title}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditor({ draft: { allDay: true, date: day } })}
                  aria-label={`Add a to-do on ${longDayFormat.format(asDate(day))}`}
                  className="flex h-5 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Hours */}
          <div className="grid" style={{ gridTemplateColumns: `3.25rem minmax(0, 1fr)` }}>
            <div className="relative" style={{ height: 24 * HOUR_PX }}>
              {Array.from({ length: 23 }, (_, i) => (
                <span key={i} className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-muted-foreground tabular-nums" style={{ top: (i + 1) * HOUR_PX }}>
                  {formatMinutes((i + 1) * 60)}
                </span>
              ))}
            </div>
            <div
              ref={gridRef}
              className="relative grid select-none"
              style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height: 24 * HOUR_PX }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              {days.map((day, dayIndex) => (
                <div
                  key={day}
                  className="relative border-l"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--border) ${HOUR_PX - 1}px, var(--border) ${HOUR_PX}px)`,
                  }}
                  onPointerDown={(e) => startCreate(e, dayIndex)}
                >
                  {creating && creating.day === dayIndex && (
                    <div
                      className="pointer-events-none absolute inset-x-1 rounded-md bg-primary/20 ring-1 ring-primary/50"
                      style={{
                        top: (Math.min(creating.anchor, creating.current) / 60) * HOUR_PX,
                        height: Math.max(((Math.abs(creating.current - creating.anchor) || SNAP_MINUTES) / 60) * HOUR_PX, 6),
                      }}
                    />
                  )}
                  {timedFor(day).map(({ event: e, start, end, column, columns }) => {
                    const height = Math.max(((end - start) / 60) * HOUR_PX, MIN_BLOCK_PX);
                    const dragging = drag && drag.kind !== "create" && drag.moved && drag.event.id === e.id;
                    return (
                      <div
                        key={e.id}
                        onPointerDown={(ev) => startMove(ev, e)}
                        className={cn(
                          "absolute flex cursor-pointer flex-col overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-xs shadow-sm",
                          e.done && "opacity-60",
                          dragging && "z-10 cursor-grabbing shadow-lg",
                        )}
                        style={{
                          ...goalColorStyle(e.color),
                          borderLeftColor: `var(--goal-${e.color}-bar)`,
                          top: (start / 60) * HOUR_PX + 1,
                          height: height - 2,
                          left: `calc(${(column / columns) * 100}% + 2px)`,
                          width: `calc(${100 / columns}% - 4px)`,
                        }}
                      >
                        <div className="flex items-start gap-1">
                          <span className={cn("min-w-0 flex-1 truncate font-medium", e.done && "line-through")}>{e.title}</span>
                          <button
                            type="button"
                            onPointerDown={(ev) => ev.stopPropagation()}
                            onClick={() => toggleDone(e)}
                            aria-label={e.done ? `Not done: ${e.title}` : `Done: ${e.title}`}
                            className={cn(
                              "mt-px flex size-3.5 shrink-0 items-center justify-center rounded-full ring-1 ring-current/50",
                              e.done && "bg-current/20",
                            )}
                          >
                            {e.done && <Check className="size-2.5" />}
                          </button>
                        </div>
                        {height >= 36 && (
                          <span className="truncate opacity-80 tabular-nums">
                            {formatMinutes(start)}–{formatMinutes(end)}
                          </span>
                        )}
                        <span
                          onPointerDown={(ev) => startResize(ev, e)}
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
                          aria-hidden
                        />
                      </div>
                    );
                  })}
                  {day === today && now !== null && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (now / 60) * HOUR_PX }}>
                      <span className="-ml-1 size-2 rounded-full bg-coral" />
                      <span className="h-0.5 flex-1 bg-coral" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag on empty time to block it, or click for an hour. Drag a block to move it, or its bottom edge to change the length.
      </p>

      {editor && (
        <EventEditor
          key={"event" in editor ? editor.event.id : "new"}
          target={editor}
          defaultColor={lastColor}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onDeleted={(id) => {
            setEditor(null);
            setEvents((all) => all.filter((e) => e.id !== id));
          }}
        />
      )}
    </div>
  );
}
