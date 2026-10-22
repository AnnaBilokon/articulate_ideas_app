"use client";

import { useState } from "react";
import { ChartFrame, Legend, Tooltip, axisText, gridStroke, niceTicks, useWidth, formatters, type TooltipState, type Unit } from "./chart-frame";
import type { ChartData } from "./series";

// Lines over time: 2px lines, an end dot with a surface ring, a crosshair
// that snaps to the nearest month, and one tooltip with every series. Ends
// are labelled only where labels don't collide; the legend and the table
// carry the rest. A single series gets a 10% wash under its line.

const PLOT_HEIGHT = 200;
// Room above the plot for the top tick and a value on the tallest mark.
const TOP = 18;
const AXIS_BAND = 28;
const LEFT = 44;
const RIGHT_ROOM = 64;

export function LineChart({
  title,
  description,
  data,
  unit = "kr",
}: {
  title: string;
  description?: string;
  data: ChartData;
  unit?: Unit;
}) {
  const { value: format, tick: formatTick } = formatters[unit];
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState>(null);
  const n = data.labels.length;
  const values = data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, 0));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const innerW = Math.max(width - LEFT - RIGHT_ROOM, 0);
  const x = (i: number) => LEFT + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => TOP + PLOT_HEIGHT - ((v - lo) / (hi - lo || 1)) * PLOT_HEIGHT;

  // End labels, top to bottom, skipping any closer than 14px to one already placed.
  const ends = data.series
    .map((s) => {
      const i = s.values.findLastIndex((v) => v !== null);
      return i < 0 ? null : { s, i, v: s.values[i] as number };
    })
    .filter((e) => e !== null)
    .sort((a, b) => b.v - a.v);
  const placed: number[] = [];
  const labelled = new Set<string>();
  for (const e of ends) {
    const ey = y(e.v);
    if (placed.every((p) => Math.abs(p - ey) >= 14)) {
      placed.push(ey);
      labelled.add(e.s.key);
    }
  }

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i)},${y(v)}`;
      pen = true;
    });
    return d;
  };

  const nearest = (px: number) => {
    if (n <= 1) return 0;
    return Math.max(0, Math.min(n - 1, Math.round(((px - LEFT) / innerW) * (n - 1))));
  };

  return (
    <ChartFrame title={title} description={description} data={data} format={format} legend={<Legend series={data.series} shape="line" />}>
      <div ref={ref} className="relative w-full" onPointerLeave={() => setTip(null)}>
        {width > 0 && n > 0 && (
          <svg
            width={width}
            height={TOP + PLOT_HEIGHT + AXIS_BAND}
            role="img"
            aria-label={`${title}. The table view lists every value.`}
            tabIndex={0}
            className="outline-none"
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              setTip({ x: e.clientX - box.left, y: e.clientY - box.top, index: nearest(e.clientX - box.left) });
            }}
            onFocus={() => setTip({ x: x(n - 1), y: 20, index: n - 1 })}
            onBlur={() => setTip(null)}
            onKeyDown={(e) => {
              if (!tip) return;
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const index = Math.max(0, Math.min(n - 1, tip.index + (e.key === "ArrowLeft" ? -1 : 1)));
                setTip({ x: x(index), y: 20, index });
              }
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={width - RIGHT_ROOM + 8} y1={y(t)} y2={y(t)} stroke={gridStroke} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end" className={axisText} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTick(t)}
                </text>
              </g>
            ))}
            {data.labels.map((label, i) => (
              <text key={label} x={x(i)} y={TOP + PLOT_HEIGHT + 18} textAnchor="middle" className={axisText}>
                {label}
              </text>
            ))}
            {tip && <line x1={x(tip.index)} x2={x(tip.index)} y1={TOP} y2={TOP + PLOT_HEIGHT} stroke="var(--muted-foreground)" strokeOpacity={0.6} strokeWidth={1} />}
            {data.series.length === 1 && (
              <path
                d={`${path(data.series[0].values)}L${x(data.series[0].values.findLastIndex((v) => v !== null))},${y(Math.max(lo, 0))}L${x(data.series[0].values.findIndex((v) => v !== null))},${y(Math.max(lo, 0))}Z`}
                fill={data.series[0].color}
                fillOpacity={0.1}
              />
            )}
            {data.series.map((s) => (
              <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {ends.map((e) => (
              <g key={e.s.key}>
                <circle cx={x(e.i)} cy={y(e.v)} r={4} fill={e.s.color} stroke="var(--card)" strokeWidth={2} />
                {labelled.has(e.s.key) && (
                  <text x={x(e.i) + 9} y={y(e.v)} dy="0.32em" className="fill-foreground text-[11px] font-medium">
                    {format(e.v).replace(" kr", "")}
                  </text>
                )}
              </g>
            ))}
            {tip &&
              data.series.map((s) =>
                s.values[tip.index] === null ? null : (
                  <circle key={s.key} cx={x(tip.index)} cy={y(s.values[tip.index] as number)} r={4} fill={s.color} stroke="var(--card)" strokeWidth={2} />
                ),
              )}
          </svg>
        )}
        <Tooltip state={tip} data={data} format={format} width={width} />
      </div>
    </ChartFrame>
  );
}
