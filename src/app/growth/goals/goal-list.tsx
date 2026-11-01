"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronRight, GripVertical } from "lucide-react";
import type { GoalSummary } from "@/lib/goals";
import { localDate } from "@/lib/schedule";
import { describeTargetYear, formatDay, goalColorStyle, goalStatusLabels } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { reorderGoals } from "../actions";
import { ProgressBar, progressText } from "./goal-bits";

// Only up and down: the list is one column.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

// One group of goals (Working on, Paused, …) as coloured cards in your order.
// Drag a card by its handle, or focus the handle and use Space and the arrow
// keys, to move the priority ones to the top.
export function GoalList({ goals, today, group }: { goals: GoalSummary[]; today: string; group: string }) {
  // The order you just dragged to, shown while it saves; the page's order after.
  const [order, setOrder] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(goals.map((g) => [g.id, g]));
  const ids = order
    ? [...order.filter((id) => byId.has(id)), ...goals.map((g) => g.id).filter((id) => !order.includes(id))]
    : goals.map((g) => g.id);
  const shown = ids.map((id) => byId.get(id)!);
  const titleOf = (id: string | number) => byId.get(String(id))?.title ?? "the goal";

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    setError(null);
    startSaving(async () => {
      const result = await reorderGoals(next);
      if (result.error) {
        setOrder(null);
        setError(result.error);
      }
    });
  }

  if (shown.length < 2) {
    return (
      <ul className="flex flex-col gap-2">
        {shown.map((goal) => (
          <li key={goal.id}>
            <GoalCard goal={goal} today={today} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <DndContext
        id={`goals-${group}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: "To move a goal, press Space, then the up and down arrows. Press Space again to drop it, or Escape to cancel.",
          },
          announcements: {
            onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
            onDragOver: ({ active, over }) =>
              over ? `${titleOf(active.id)} is now at place ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : undefined,
            onDragEnd: ({ active, over }) =>
              over ? `${titleOf(active.id)} dropped at place ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : undefined,
            onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
          },
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {shown.map((goal) => (
              <SortableGoal key={goal.id} goal={goal} today={today} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {error && (
        <p className="text-sm text-coral-foreground" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function SortableGoal({ goal, today }: { goal: GoalSummary; today: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <GoalCard
        goal={goal}
        today={today}
        dragging={isDragging}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Move ${goal.title}`}
            className="flex shrink-0 cursor-grab touch-none items-center self-stretch rounded-l-xl pr-1 pl-2.5 opacity-60 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current active:cursor-grabbing"
          >
            <GripVertical className="size-4.5" />
          </button>
        }
      />
    </li>
  );
}

function GoalCard({
  goal,
  today,
  handle,
  dragging = false,
}: {
  goal: GoalSummary;
  today: string;
  handle?: ReactNode;
  dragging?: boolean;
}) {
  const text = progressText(goal);
  const muted = goal.status === "paused" || goal.status === "let_go";
  return (
    <div
      style={goalColorStyle(goal.color)}
      className={cn(
        "flex rounded-xl ring-1 ring-foreground/10 transition-shadow",
        muted && "opacity-75",
        dragging && "shadow-lg ring-foreground/25",
      )}
    >
      {handle}
      <Link
        href={`/growth/goals/${goal.id}`}
        className={cn(
          "group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-4 transition-[filter] hover:brightness-[0.97] dark:hover:brightness-110",
          handle && "rounded-l-none pl-1.5",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="font-medium">{goal.title}</span>
          {goal.progress !== null && goal.status !== "achieved" && (
            <div className="flex items-center gap-3">
              <ProgressBar value={goal.progress} label={`${goal.title}: ${text}`} color={goal.color} className="flex-1" />
              <span className="shrink-0 text-xs tabular-nums opacity-85">{text}</span>
            </div>
          )}
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-85 empty:hidden">
            {goal.status === "achieved" && goal.achievedAt ? (
              <span>Achieved {formatDay(localDate(new Date(goal.achievedAt)))}</span>
            ) : (
              goal.targetYear &&
              goal.status === "active" && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" /> {describeTargetYear(goal.targetYear, Number(today.slice(0, 4)))}
                </span>
              )
            )}
            {goal.status !== "active" && goal.status !== "achieved" && <span>{goalStatusLabels[goal.status]}</span>}
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
