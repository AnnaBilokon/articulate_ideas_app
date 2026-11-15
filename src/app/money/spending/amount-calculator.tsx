"use client";

import { Delete } from "lucide-react";
import { formatPrice } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Adding a few amounts to one category: the amount can be a sum
// ("45 + 120 + 30"), with − for a discount and × or ÷ for "3 × 25". A keypad
// brings the + that a phone's number keyboard doesn't have.

/** "129", "1 299,50", "-45" (a refund) → a number; anything else → NaN. */
export function parseKr(text: string): number {
  const t = text.replace(/\s/g, "").replace(/kr$/i, "").replace(",", ".").replace("−", "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

const OPERATOR = /([+\-−×x*÷/])/;
const normal = (op: string) => (op === "−" ? "-" : op === "×" || op === "x" ? "*" : op === "÷" ? "/" : op);

/**
 * An amount, or a sum of them: "45 + 120 + 30" → 195, "3 × 25" → 75,
 * "−45" → −45 (a refund). × and ÷ go before + and −. NaN if it isn't one.
 */
export function parseAmount(text: string): number {
  const t = text.replace(/kr/gi, "").trim();
  if (!t) return NaN;
  const parts = t.split(OPERATOR).map((p) => p.trim());
  const tokens: (number | string)[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      tokens.push(normal(parts[i]));
      continue;
    }
    // A minus in front is a refund: 0 − 45.
    if (parts[i] === "" && i === 0 && normal(parts[1] ?? "") === "-") {
      tokens.push(0);
      continue;
    }
    const n = parseKr(parts[i]);
    if (Number.isNaN(n)) return NaN;
    tokens.push(n);
  }
  // × and ÷ first, then + and −, left to right.
  const terms: (number | string)[] = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as string;
    const n = tokens[i + 1] as number;
    if (op === "*" || op === "/") {
      const left = terms.pop() as number;
      if (op === "/" && n === 0) return NaN;
      terms.push(op === "*" ? left * n : left / n);
    } else terms.push(op, n);
  }
  let total = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) total = terms[i] === "+" ? total + (terms[i + 1] as number) : total - (terms[i + 1] as number);
  return Math.round(total * 100) / 100;
}

/** Whether it's a sum to work out, not just one amount (a leading minus is a refund). */
export const isSum = (text: string) => OPERATOR.test(text.trim().replace(/^[-−]/, ""));

/** "= 195 kr" under the field while it's a sum. */
export function SumPreview({ text }: { text: string }) {
  if (!isSum(text)) return null;
  const value = parseAmount(text);
  return (
    <p className={cn("text-right text-sm tabular-nums", Number.isNaN(value) ? "text-muted-foreground" : "font-medium text-heading")} aria-live="polite">
      {Number.isNaN(value) ? "Keep going…" : `= ${formatPrice(value)}`}
    </p>
  );
}

const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "back", "+"] as const;

/** A keypad for the amount, with the operators a phone keyboard leaves out. */
export function AmountKeypad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const press = (key: (typeof KEYS)[number]) => {
    if (key === "back") return onChange(value.trimEnd().slice(0, -1).trimEnd());
    if ("+−×÷".includes(key)) {
      // One operator at a time: a second press replaces the first.
      const base = value.trimEnd().replace(/[+\-−×÷]$/, "").trimEnd();
      if (!base && key !== "−") return;
      return onChange(base ? `${base} ${key} ` : "−");
    }
    onChange(value + key);
  };
  const result = parseAmount(value);

  return (
    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Calculator">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === "back" ? "Delete" : key === "−" ? "Minus" : key === "×" ? "Times" : key === "÷" ? "Divide" : key === "+" ? "Plus" : key}
          className={cn(
            "flex h-11 items-center justify-center rounded-xl text-lg font-semibold tabular-nums transition-colors active:scale-95",
            "+−×÷".includes(key) ? "bg-accent text-accent-foreground hover:bg-highlight" : "bg-muted hover:bg-muted/70",
          )}
        >
          {key === "back" ? <Delete className="size-5" /> : key}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange("")}
        className="col-span-2 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/70"
      >
        Clear
      </button>
      <button
        type="button"
        disabled={!isSum(value) || Number.isNaN(result)}
        onClick={() => onChange(String(result).replace(".", ","))}
        className="col-span-2 h-11 rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-40"
        aria-label="Work it out"
      >
        =
      </button>
    </div>
  );
}
