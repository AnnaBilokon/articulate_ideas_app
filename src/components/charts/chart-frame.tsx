"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { formatCompactKr, formatKr } from "@/lib/schemas";
import type { ChartData, Series } from "./series";

// Shared pieces for the charts: width measuring, nice ticks, the legend,
// the tooltip, and the frame with its table view (every chart has one, so
// no value depends on hovering or on telling colours apart).

/** How values read: kronor, or a 0-1 share shown as a percent. */
export type Unit = "kr" | "percent";

export const formatters: Record<Unit, { value: (v: number) => string; tick: (v: number) => string }> = {
  kr: { value: formatKr, tick: formatCompactKr },
  percent: { value: (v) => `${Math.round(v * 100)}%`, tick: (v) => `${Math.round(v * 100)}%` },
};


export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** About `count` round tick values covering min..max, always including 0. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0, 1];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function Legend({ series, shape }: { series: Series[]; shape: "rect" | "line" }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {shape === "rect" ? (
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          ) : (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} aria-hidden />
          )}
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export type TooltipState = { x: number; y: number; index: number } | null;

/** One tooltip, every series: values lead, names follow, line keys. */
export function Tooltip({
  state,
  data,
  format,
  width,
  total,
}: {
  state: TooltipState;
  data: ChartData;
  format: (v: number) => string;
  width: number;
  total?: boolean;
}) {
  if (!state) return null;
  const rows = data.series.filter((s) => s.values[state.index] !== null);
  const sum = rows.reduce((t, s) => t + (s.values[state.index] ?? 0), 0);
  const left = Math.min(Math.max(state.x + 12, 0), Math.max(width - 190, 0));
  return (
    <div
      className="pointer-events-none absolute z-10 w-[180px] rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{ left, top: Math.max(state.y - 10, 0) }}
      role="status"
    >
      <div className="mb-1.5 font-medium text-muted-foreground">{data.labels[state.index]}</div>
      <ul className="flex flex-col gap-1">
        {[...rows].reverse().map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="font-semibold tabular-nums">{format(s.values[state.index] ?? 0)}</span>
            <span className="truncate text-muted-foreground">{s.name}</span>
          </li>
        ))}
      </ul>
      {total && rows.length > 1 && (
        <div className="mt-1.5 flex justify-between border-t pt-1.5">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">{format(sum)}</span>
        </div>
      )}
    </div>
  );
}

export function ChartFrame({
  title,
  description,
  data,
  format,
  legend,
  children,
  total,
}: {
  title: string;
  description?: string;
  data: ChartData;
  format: (v: number) => string;
  legend: React.ReactNode;
  children: React.ReactNode;
  total?: boolean;
}) {
  const [table, setTable] = useState(false);
  return (
    <figure className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <figcaption className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-heading">{title}</span>
          {description && <span className="text-sm text-muted-foreground">{description}</span>}
        </span>
        <button
          type="button"
          onClick={() => setTable(!table)}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-pressed={table}
        >
          {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </figcaption>
      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium" />
                {data.series.map((s) => (
                  <th key={s.key} className="px-2 py-1.5 text-right font-medium">
                    {s.name}
                  </th>
                ))}
                {total && data.series.length > 1 && <th className="py-1.5 pl-2 text-right font-medium">Total</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.labels.map((label, i) => (
                <tr key={label} className="border-t border-border/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{label}</td>
                  {data.series.map((s) => (
                    <td key={s.key} className="px-2 py-1.5 text-right whitespace-nowrap">
                      {s.values[i] === null ? "–" : format(s.values[i] ?? 0)}
                    </td>
                  ))}
                  {total && data.series.length > 1 && (
                    <td className="py-1.5 pl-2 text-right font-medium whitespace-nowrap">
                      {format(data.series.reduce((t, s) => t + (s.values[i] ?? 0), 0))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {legend}
          {children}
        </>
      )}
    </figure>
  );
}

export const axisText = "fill-muted-foreground text-[11px]";

/**
 * An x-axis label that fits its slot: "Feb–Mar" when there's room, "Feb"
 * when it's narrow, and only every other one when it's very narrow.
 */
export function axisLabel(label: string, slot: number, index: number): string {
  if (slot >= 52) return label;
  if (slot < 26 && index % 2 === 1) return "";
  return label.split("–")[0];
}
export const gridStroke = "var(--border)";
