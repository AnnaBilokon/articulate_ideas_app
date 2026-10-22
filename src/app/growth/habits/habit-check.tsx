"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { calendarWeeks, isPlannedOn, WEEKDAYS, type HabitRule } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { setHabitDone } from "./actions";

// Ticking habits off: today's button, and a calendar of past weeks where any
// day up to today can be ticked or unticked. Both update at once and save
// in the background.

function useHabitDay(habitId: string, day: string, done: boolean) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      setOptimistic(!optimistic);
      setError((await setHabitDone(habitId, day, !optimistic)).error);
    });
  return { done: optimistic, toggle, pending, error };
}

export function HabitToday({
  habitId,
  title,
  today,
  done,
  detail,
}: {
  habitId: string;
  title: string;
  today: string;
  done: boolean;
  detail?: string;
}) {
  const state = useHabitDay(habitId, today, done);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={state.done}
        onClick={state.toggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition-colors",
          state.done
            ? "bg-success-soft text-success-foreground ring-success/30"
            : "bg-card ring-foreground/10 hover:bg-accent/50",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            state.done ? "border-success bg-success text-white" : "border-foreground/25",
          )}
        >
          {state.done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{title}</span>
          {detail && <span className={cn("text-xs", state.done ? "opacity-80" : "text-muted-foreground")}>{detail}</span>}
        </span>
      </button>
      {state.error && (
        <span className="text-xs text-coral-foreground" role="alert">
          {state.error}
        </span>
      )}
    </div>
  );
}

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function HabitCalendar({
  habitId,
  title,
  rule,
  done,
  today,
  weeks,
}: {
  habitId: string;
  title: string;
  rule: HabitRule;
  done: string[];
  today: string;
  weeks: number;
}) {
  const doneSet = new Set(done);
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens the weeks scroll sideways: start at this week.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={scroller} className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label={`${title}: the last ${weeks} weeks`}>
        <div className="flex shrink-0 flex-col gap-1 pr-0.5 text-[10px] leading-none text-muted-foreground" aria-hidden>
          {WEEKDAYS.map((w) => (
            <span key={w.day} className="flex h-4 items-center">
              {w.day % 2 === 1 ? w.short.slice(0, 1) : ""}
            </span>
          ))}
        </div>
        {calendarWeeks(today, weeks).map((week) => (
          <div key={week[0]} className="flex shrink-0 flex-col gap-1">
            {week.map((day) => (
              <CalendarDay
                key={day}
                habitId={habitId}
                day={day}
                done={doneSet.has(day)}
                planned={isPlannedOn(rule, day)}
                future={day > today}
                isToday={day === today}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarDay({
  habitId,
  day,
  done,
  planned,
  future,
  isToday,
}: {
  habitId: string;
  day: string;
  done: boolean;
  planned: boolean;
  future: boolean;
  isToday: boolean;
}) {
  const state = useHabitDay(habitId, day, done);
  const label = `${dayLabel.format(new Date(`${day}T00:00:00Z`))}${state.done ? ": done" : ""}`;
  if (future) return <span className="size-4 rounded-[4px]" aria-hidden />;
  return (
    <button
      type="button"
      onClick={state.toggle}
      aria-label={label}
      aria-pressed={state.done}
      title={state.error ?? label}
      className={cn(
        "size-4 rounded-[4px] transition-colors",
        state.done ? "bg-success hover:bg-success/80" : planned ? "bg-muted ring-1 ring-foreground/10 hover:bg-accent" : "bg-muted/40 hover:bg-accent",
        isToday && "ring-2 ring-primary",
        state.error && "ring-2 ring-coral",
      )}
    />
  );
}
