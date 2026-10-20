import Link from "next/link";
import { cn } from "@/lib/utils";

// The Library's two lists: topics studied, and questions saved to learn later.
export function LibraryTabs({ current, savedCount }: { current: "topics" | "questions"; savedCount: number }) {
  const tabs = [
    { key: "topics", href: "/library", label: "Topics" },
    { key: "questions", href: "/library/questions", label: savedCount > 0 ? `Saved questions (${savedCount})` : "Saved questions" },
  ] as const;
  return (
    <nav aria-label="Library" className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current === tab.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            current === tab.key
              ? "border-primary text-heading"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
