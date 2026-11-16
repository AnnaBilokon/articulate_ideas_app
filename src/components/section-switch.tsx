import Link from "next/link";
import { cn } from "@/lib/utils";

// Two pages under one tab (Stats: Trends and Savings; Wins: Achievements and
// Strengths), with a switch at the top to go between them.

export function SectionSwitch({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Section" className="flex w-fit gap-1 rounded-full bg-muted p-1 text-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            item.href === current ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export const STATS_SECTIONS = [
  { href: "/money/trends", label: "Trends" },
  { href: "/money/savings", label: "Savings" },
];

export const WINS_SECTIONS = [
  { href: "/growth/achievements", label: "Achievements" },
  { href: "/growth/strengths", label: "Strengths" },
];
