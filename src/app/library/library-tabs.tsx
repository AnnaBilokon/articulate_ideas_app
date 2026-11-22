import Link from "next/link";
import { cn } from "@/lib/utils";

// The Library's lists: topics studied, chats explored, quick facts read, and questions saved to learn later.
export function LibraryTabs({ current, savedCount }: { current: "topics" | "explore" | "facts" | "questions"; savedCount: number }) {
  const tabs = [
    { key: "topics", href: "/library", label: "Topics" },
    { key: "explore", href: "/library/explore", label: "Chats" },
    { key: "facts", href: "/library/facts", label: "Quick facts" },
    { key: "questions", href: "/library/questions", label: savedCount > 0 ? `Saved questions (${savedCount})` : "Saved questions" },
  ] as const;
  return (
    <nav aria-label="Library" className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current === tab.key ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
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
