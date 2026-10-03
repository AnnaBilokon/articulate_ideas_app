import { cn } from "@/lib/utils";

// Full class names (not built from strings) so Tailwind can find them.
const tagClasses = [
  "bg-tag-1 text-tag-1-foreground",
  "bg-tag-2 text-tag-2-foreground",
  "bg-tag-3 text-tag-3-foreground",
  "bg-tag-4 text-tag-4-foreground",
  "bg-tag-5 text-tag-5-foreground",
  "bg-tag-6 text-tag-6-foreground",
];

// The same tag always gets the same color, on every page.
export function tagColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return tagClasses[hash % tagClasses.length];
}

export function TagBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tagColorClass(name),
        className,
      )}
    >
      {name}
    </span>
  );
}
