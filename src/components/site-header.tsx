"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Today" },
  { href: "/vocabulary", label: "Vocabulary" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sprout className="size-4.5" />
      </span>
      {/* Compact: icon only on phones, so the header stays on one line. */}
      <span className={cn(compact && "max-sm:sr-only")}>Learning Coach</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Learning Coach home">
          <Logo compact />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(pathname, item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/topics/new"
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full bg-primary whitespace-nowrap px-3.5 py-1.5 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
              pathname === "/topics/new" && "ring-2 ring-ring/40",
            )}
          >
            <Plus className="size-4" />
            New topic
          </Link>
        </nav>
      </div>
    </header>
  );
}
