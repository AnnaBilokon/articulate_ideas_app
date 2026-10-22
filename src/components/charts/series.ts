// Chart data shapes and series colours, shared by server pages and the
// client chart components.

export type Series = {
  key: string;
  name: string;
  /** A CSS colour, e.g. "var(--series-1)". */
  color: string;
  values: (number | null)[];
};

export type ChartData = { labels: string[]; series: Series[] };

/** The fixed series order: colour follows the series' position, never its rank. */
export const seriesColor = (index: number) => (index < 6 ? `var(--series-${index + 1})` : "var(--series-other)");
