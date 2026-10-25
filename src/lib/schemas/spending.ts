import { z } from "zod";
import { formatKr, nextMonth, periodLabel, periodShort } from "./money";

// Money: the spending tracker. Categories with an icon and a colour, and
// purchases, which count in the pay period they fall in. Separate from the
// monthly budget, pots and savings.

export const spendColors = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"] as const;
export type SpendColor = (typeof spendColors)[number];

/** Icons to pick from; the components live in src/components/spend-icon.tsx. */
export const spendIcons = [
  "cart", "basket", "utensils", "coffee", "pizza", "cookie", "wine",
  "bus", "train", "car", "fuel", "bike", "plane",
  "home", "sofa", "zap", "wifi", "smartphone", "tv",
  "shirt", "gem", "scissors", "sparkles",
  "heart-pulse", "pill", "dumbbell",
  "baby", "toy", "paw", "graduation",
  "book", "film", "music", "gamepad", "ticket", "palette",
  "gift", "party", "flower", "briefcase", "wrench", "piggy",
] as const;
export type SpendIcon = (typeof spendIcons)[number];

export type SpendCategory = { id: string; name: string; icon: SpendIcon; color: SpendColor; position: number; archived: boolean };
export type SpendPurchase = { id: string; categoryId: string; spentOn: string; amount: number; note: string | null };

/** Suggestions to start from, one tap each. */
export const starterCategories: { name: string; icon: SpendIcon; color: SpendColor }[] = [
  { name: "Groceries", icon: "cart", color: "green" },
  { name: "Eating out", icon: "utensils", color: "orange" },
  { name: "Coffee", icon: "coffee", color: "yellow" },
  { name: "Transport", icon: "bus", color: "blue" },
  { name: "Clothes", icon: "shirt", color: "purple" },
  { name: "Kids", icon: "toy", color: "pink" },
  { name: "Health", icon: "heart-pulse", color: "red" },
  { name: "Home", icon: "home", color: "teal" },
  { name: "Fun", icon: "ticket", color: "pink" },
  { name: "Gifts", icon: "gift", color: "red" },
];

export const spendCategorySchema = z.object({
  name: z.string().trim().min(1, "Name the category.").max(40, "Keep the name under 40 characters."),
  icon: z.enum(spendIcons),
  color: z.enum(spendColors),
});
export type SpendCategoryInput = z.infer<typeof spendCategorySchema>;

export const purchaseSchema = z.object({
  categoryId: z.uuid("Pick a category."),
  spentOn: z.iso.date("Pick a date."),
  amount: z
    .number("Enter an amount.")
    .refine((v) => v !== 0, "Enter an amount.")
    .refine((v) => Math.abs(v) <= 1e9, "That's a lot. Check the amount."),
  note: z.string().trim().max(200, "Keep the note under 200 characters."),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const paydaySchema = z.number().int().min(1).max(28);

/** The pay period a date falls in, as its first month: with payday 25, 26 Oct and 24 Nov are both "2026-10-01". */
export function payPeriodOf(date: string, payday: number): string {
  const [y, m, d] = date.split("-").map(Number);
  if (d >= payday) return `${y}-${String(m).padStart(2, "0")}-01`;
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

/** The first and last day of a pay period. */
export function payPeriodRange(month: string, payday: number): { from: string; to: string } {
  const start = `${month.slice(0, 8)}${String(payday).padStart(2, "0")}`;
  const next = nextMonth(month);
  const end = new Date(`${next.slice(0, 8)}${String(payday).padStart(2, "0")}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  return { from: start, to: end.toISOString().slice(0, 10) };
}

/** 1 → "1st", 22 → "22nd", 25 → "25th". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

const priceFormat = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A price as paid: "129 kr", or "129.50 kr" when there are öre. */
export const formatPrice = (value: number) =>
  Number.isInteger(value) ? formatKr(value) : `${priceFormat.format(value).replace("-", "−")} kr`;

const fullMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** A spending month's name: "Oct–Nov 2026", or "October 2026" when pay comes on the 1st. */
export const spendMonthLabel = (month: string, payday: number) =>
  payday === 1 ? fullMonth.format(new Date(`${month}T00:00:00Z`)) : periodLabel(month);

/** Short, for pills and chart axes: "Oct–Nov", or "Oct" when pay comes on the 1st. */
export const spendMonthShort = (month: string, payday: number) =>
  payday === 1 ? shortMonth.format(new Date(`${month}T00:00:00Z`)) : periodShort(month);
