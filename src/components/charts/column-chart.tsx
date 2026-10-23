"use client";

import { useState } from "react";
import { ChartFrame, Legend, Tooltip, axisText, gridStroke, niceTicks, useWidth, formatters, axisLabel, type TooltipState, type Unit } from "./chart-frame";
import type { ChartData } from "./series";

// Columns over time: grouped (series side by side) or stacked (parts of a
// whole). Thin columns, 4px rounded data ends, a 2px surface gap between
// touching marks, hairline grid. Hover or focus a month for every value.

const PLOT_HEIGHT = 200;
// Room above the plot for the top tick and a value on the tallest mark.
const TOP = 18;
const AXIS_BAND = 28;
const LEFT = 44;
const MAX_BAR = 24;
const GAP = 2;

/** A column with a 4px rounded data end, square at the baseline. */
function columnPath(x: number, w: number, yTop: number, yBottom: number, roundTop: boolean): string {
  const h = yBottom - yTop;
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  if (!roundTop) return `M${x},${yBottom}V${yTop}H${x + w}V${yBottom}Z`;
  return `M${x},${yBottom}V${yTop + r}Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}V${yBottom}Z`;
}

/** The same for a column below zero: rounded at the bottom. */
function negativePath(x: number, w: number, yTop: number, yBottom: number): string {
  const h = yBottom - yTop;
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${yTop}V${yBottom - r}Q${x},${yBottom} ${x + r},${yBottom}H${x + w - r}Q${x + w},${yBottom} ${x + w},${yBottom - r}V${yTop}Z`;
}

export function ColumnChart({
  title,
  description,
  data,
  unit = "kr",
  stacked = false,
}: {
  title: string;
  description?: string;
  data: ChartData;
  unit?: Unit;
  stacked?: boolean;
}) {
  const { value: format, tick: formatTick } = formatters[unit];
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState>(null);
  const n = data.labels.length;

  const values = data.series.flatMap((s) => s.values.map((v) => v ?? 0));
  const stackTotals = data.labels.map((_, i) => data.series.reduce((t, s) => t + Math.max(0, s.values[i] ?? 0), 0));
  const ticks = stacked ? niceTicks(0, Math.max(...stackTotals, 0)) : niceTicks(Math.min(...values, 0), Math.max(...values, 0));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const innerW = Math.max(width - LEFT, 0);
  const band = n > 0 ? innerW / n : 0;
  const y = (v: number) => TOP + PLOT_HEIGHT - ((v - lo) / (hi - lo || 1)) * PLOT_HEIGHT;
  const zero = y(0);

  const k = stacked ? 1 : data.series.length;
  const barW = Math.max(Math.min(MAX_BAR, (band * 0.7 - GAP * (k - 1)) / k), 3);
  const groupW = barW * k + GAP * (k - 1);

  // Label the latest column's value on its cap: one label, not one per column.
  const last = n - 1;

  return (
    <ChartFrame title={title} description={description} data={data} format={format} legend={<Legend series={data.series} shape="rect" />} total={stacked}>
      <div ref={ref} className="relative w-full" onPointerLeave={() => setTip(null)}>
        {width > 0 && n > 0 && (
          <svg width={width} height={TOP + PLOT_HEIGHT + AXIS_BAND} role="img" aria-label={`${title}. The table view lists every value.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={width} y1={y(t)} y2={y(t)} stroke={gridStroke} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end" className={axisText} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTick(t)}
                </text>
              </g>
            ))}

            {data.labels.map((label, i) => {
              const x0 = LEFT + band * i + (band - groupW) / 2;
              const active = tip?.index === i;
              let stackTop = 0;
              const stackParts = data.series.map((s) => Math.max(0, s.values[i] ?? 0));
              const topIndex = stackParts.findLastIndex((v) => v > 0);
              return (
                <g key={label} opacity={tip && !active ? 0.55 : 1} className="transition-opacity">
                  {data.series.map((s, si) => {
                    const v = s.values[i];
                    if (v === null || v === 0) return null;
                    if (stacked) {
                      if (v < 0) return null;
                      const yBottom = y(stackTop) - (stackTop > 0 ? GAP : 0);
                      stackTop += v;
                      const yTop = y(stackTop);
                      return <path key={s.key} d={columnPath(x0, barW, yTop, yBottom, si === topIndex)} fill={s.color} />;
                    }
                    const x = x0 + si * (barW + GAP);
                    return v >= 0 ? (
                      <path key={s.key} d={columnPath(x, barW, y(v), zero, true)} fill={s.color} />
                    ) : (
                      <path key={s.key} d={negativePath(x, barW, zero, y(v))} fill={s.color} />
                    );
                  })}
                  <text x={LEFT + band * i + band / 2} y={TOP + PLOT_HEIGHT + 18} textAnchor="middle" className={axisText}>
                    {axisLabel(label, band, i)}
                  </text>
                  {i === last && (stacked || data.series.length === 1) && (
                    <text
                      x={LEFT + band * i + band / 2}
                      y={y(stacked ? stackTotals[i] : Math.max(0, data.series[0].values[i] ?? 0)) - 6}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-medium"
                    >
                      {format(stacked ? stackTotals[i] : (data.series[0].values[i] ?? 0))}
                    </text>
                  )}
                  {/* The month is the hit target: bigger than any column. */}
                  <rect
                    x={LEFT + band * i}
                    y={0}
                    width={band}
                    height={TOP + PLOT_HEIGHT + AXIS_BAND}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${label}: ${data.series.map((s) => `${s.name} ${s.values[i] === null ? "none" : format(s.values[i] ?? 0)}`).join(", ")}`}
                    className="outline-none focus-visible:fill-foreground/5"
                    onPointerMove={(e) => {
                      const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                      setTip({ x: e.clientX - box.left, y: e.clientY - box.top, index: i });
                    }}
                    onFocus={() => setTip({ x: LEFT + band * i + band / 2, y: 20, index: i })}
                    onBlur={() => setTip(null)}
                  />
                </g>
              );
            })}
            <line x1={LEFT} x2={width} y1={zero} y2={zero} stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeWidth={1} shapeRendering="crispEdges" />
          </svg>
        )}
        <Tooltip state={tip} data={data} format={format} width={width} total={stacked} />
      </div>
    </ChartFrame>
  );
}
