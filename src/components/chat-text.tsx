import { cn } from "@/lib/utils";

// Claude's chat text: paragraphs split by blank lines, and lines starting
// with "- " as a list.
export function ChatText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className={cn("flex flex-col gap-3 leading-7", className)}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const items = lines.filter((l) => /^\s*[-•*]\s+/.test(l));
        if (items.length > 0 && items.length === lines.length) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
              {items.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        // A lead-in line, then a list.
        if (items.length > 0) {
          const lead = lines.filter((l) => !/^\s*[-•*]\s+/.test(l));
          return (
            <div key={i} className="flex flex-col gap-1">
              <p>{lead.join(" ")}</p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {items.map((l, j) => (
                  <li key={j}>{l.replace(/^\s*[-•*]\s+/, "")}</li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
