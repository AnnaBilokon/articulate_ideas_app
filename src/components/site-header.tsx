"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookA,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Dumbbell,
  Feather,
  Gift,
  GraduationCap,
  History,
  House,
  LayoutDashboard,
  Library,
  ListChecks,
  Mic,
  MoreHorizontal,
  PersonStanding,
  Receipt,
  Plus,
  Sprout,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppearanceMenu } from "@/components/appearance-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspacePalette } from "@/hooks/use-palette";
import { paletteWorkspaceOf } from "@/lib/palettes";
import { cn } from "@/lib/utils";

export const APP_NAME = "My Self Journey";

// A tab can be wide too (the calendar), though its workspace isn't, and can
// hold more than one page (Stats: Trends and Savings).
type NavItem = { href: string; label: string; icon: LucideIcon; wide?: boolean; also?: string[] };

// The app's workspaces, each with its own tabs. A page belongs to the
// workspace whose prefixes match its path; Learning takes the rest.
// A workspace can also be wide (dashboards) and have its own colours: its
// header and layout carry data-workspace, themed in globals.css.
const workspaces: {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  prefixes: string[];
  nav: NavItem[];
  wide?: boolean;
}[] = [
  {
    id: "learning",
    label: "Learning",
    href: "/learn",
    icon: GraduationCap,
    prefixes: [],
    nav: [
      { href: "/learn", label: "Today", icon: CalendarCheck },
      { href: "/library", label: "Library", icon: Library },
      { href: "/vocabulary", label: "Vocabulary", icon: BookA },
      { href: "/speaking", label: "Speaking", icon: Mic },
    ],
  },
  {
    id: "growth",
    label: "Growth",
    href: "/growth/goals",
    icon: Sprout,
    prefixes: ["/growth"],
    nav: [
      { href: "/growth/goals", label: "Goals", icon: Target },
      { href: "/growth/habits", label: "Habits", icon: ListChecks },
      { href: "/growth/calendar", label: "Calendar", icon: CalendarDays, wide: true },
      { href: "/growth/achievements", label: "Wins", icon: Trophy, also: ["/growth/strengths"] },
      { href: "/growth/beliefs", label: "Beliefs", icon: Feather },
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    href: "/fitness",
    icon: PersonStanding,
    prefixes: ["/fitness"],
    nav: [
      { href: "/fitness", label: "Today", icon: CalendarCheck },
      { href: "/fitness/history", label: "History", icon: History },
      { href: "/fitness/exercises", label: "Exercises", icon: Dumbbell },
    ],
  },
  {
    id: "money",
    label: "Money",
    href: "/money",
    icon: Wallet,
    prefixes: ["/money"],
    wide: true,
    nav: [
      { href: "/money", label: "Overview", icon: LayoutDashboard },
      { href: "/money/spending", label: "Spending", icon: Receipt },
      { href: "/money/wishlist", label: "Wishlist", icon: Gift },
      { href: "/money/months", label: "Months", icon: CalendarRange },
      { href: "/money/trends", label: "Stats", icon: BarChart3, also: ["/money/savings"] },
    ],
  },
];

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The tab for a page: the longest one that matches, so /money/months isn't also Overview. */
const activeTab = (pathname: string, nav: NavItem[]) =>
  nav
    .flatMap((item) => [item.href, ...(item.also ?? [])].filter((href) => matches(pathname, href)).map((href) => ({ item, href })))
    .sort((a, b) => b.href.length - a.href.length)[0]?.item.href;

function currentWorkspace(pathname: string) {
  if (pathname === "/") return null;
  return workspaces.find((w) => w.prefixes.some((p) => matches(pathname, p))) ?? workspaces[0];
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap", className)}>
      <LogoMark />
      {/* Compact: icon only on phones, so the header stays on one line. */}
      <span className={cn(compact && "max-sm:sr-only")}>{APP_NAME}</span>
    </span>
  );
}

function LogoMark() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-logo text-logo-foreground shadow-sm">
      <Sprout className="size-4.5" />
    </span>
  );
}

// The logo opens the workspace menu: Journey home and each workspace.
function WorkspaceMenu({ current }: { current: (typeof workspaces)[number] | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${current?.label ?? APP_NAME}: switch workspace`}
        className="-ml-1 flex items-center gap-1.5 rounded-xl p-1 pr-1.5 font-semibold tracking-tight whitespace-nowrap transition-colors hover:bg-accent data-popup-open:bg-accent"
      >
        <LogoMark />
        {/* On phones the tabs are in the bar at the bottom, so the name has room;
            between phone and laptop width the tabs up here need it. */}
        <span className="sm:max-md:sr-only">{current?.label ?? APP_NAME}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent data-workspace={current?.id} align="start" className="w-52">
        <DropdownMenuItem render={<Link href="/" />}>
          <House />
          Journey home
          {!current && <Check className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} render={<Link href={w.href} />}>
              <w.icon />
              {w.label}
              {current?.id === w.id && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
    active
      ? "bg-highlight text-highlight-foreground hover:bg-highlight hover:text-highlight-foreground"
      : "text-muted-foreground",
  );

export function SiteHeader() {
  const pathname = usePathname();
  useWorkspacePalette(paletteWorkspaceOf(pathname));
  if (pathname === "/login") return null;
  const current = currentWorkspace(pathname);
  // Journey home lists the workspaces; inside one, its tabs.
  const nav: NavItem[] = current?.nav ?? workspaces.map(({ href, label, icon }) => ({ href, label, icon }));
  const active = current ? activeTab(pathname, nav) : undefined;

  return (
    <header data-workspace={current?.id} className="sticky top-0 z-10 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex h-16 w-full items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6",
          current?.wide || nav.find((n) => n.href === active)?.wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <WorkspaceMenu current={current} />
        <nav className="flex items-center gap-1 text-sm max-sm:gap-0.5">
          {/* On phones the tabs are in the bar at the bottom instead. */}
          <span className="flex items-center gap-1 max-sm:hidden">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={tabClass(href === active)}>
                {label}
              </Link>
            ))}
          </span>
          {current?.id === "learning" && (
            <Link
              href="/topics/new"
              className={cn(
                "ml-1 flex items-center gap-1 rounded-full bg-primary whitespace-nowrap px-3.5 py-1.5 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 max-sm:px-2",
                pathname === "/topics/new" && "ring-2 ring-ring/40",
              )}
            >
              <Plus className="size-4" />
              {/* Icon only on phones, so the header stays on one line. */}
              <span className="max-sm:sr-only">New topic</span>
            </Link>
          )}
          <AppearanceMenu />
        </nav>
      </div>
    </header>
  );
}

// Pages with a bar of their own at the bottom (Finish, Start workout, Save):
// a focused task, so the app's bar steps aside.
const OWN_BOTTOM_BAR = [/^\/fitness\/workouts\/[^/]+$/, /^\/fitness\/routines\/[^/]+$/, /^\/money\/months\/[^/]+$/];

/** At most this many tabs side by side; past it, the rest go under More. */
const BAR_TABS = 5;

const barItem = (active: boolean) =>
  cn(
    "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.7rem] font-medium transition-colors",
    active ? "text-heading" : "text-muted-foreground hover:text-foreground",
  );

function BarIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-highlight text-highlight-foreground")}>
      <Icon className="size-5" />
    </span>
  );
}

/**
 * On phones, the tabs sit in a bar at the bottom, in reach of a thumb, like
 * an app's. Journey home's bar has the workspaces; inside one, its tabs.
 */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || OWN_BOTTOM_BAR.some((r) => r.test(pathname))) return null;
  const current = currentWorkspace(pathname);
  const nav: NavItem[] = current?.nav ?? [
    { href: "/", label: "Home", icon: House },
    ...workspaces.map(({ href, label, icon }) => ({ href, label, icon })),
  ];
  const active = current ? activeTab(pathname, nav) : pathname === "/" ? "/" : undefined;
  const shown = nav.length > BAR_TABS ? nav.slice(0, BAR_TABS - 1) : nav;
  const more = nav.length > BAR_TABS ? nav.slice(BAR_TABS - 1) : [];
  const moreActive = more.some((m) => m.href === active);

  return (
    <>
      {/* Room at the end of the page, so the bar never covers it. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 sm:hidden" />
      <nav
        data-workspace={current?.id}
        aria-label={current ? `${current.label} tabs` : "Workspaces"}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <ul className="flex px-1 pt-1">
          {shown.map(({ href, label, icon }) => (
            <li key={href} className="min-w-0 flex-1">
              <Link href={href} aria-current={href === active ? "page" : undefined} className={barItem(href === active)}>
                <BarIcon icon={icon} active={href === active} />
                <span className="max-w-full truncate px-0.5">{label}</span>
              </Link>
            </li>
          ))}
          {more.length > 0 && (
            <li className="min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(barItem(moreActive), "w-full")} aria-label="More tabs">
                  <BarIcon icon={moreActive ? more.find((m) => m.href === active)!.icon : MoreHorizontal} active={moreActive} />
                  <span className="max-w-full truncate px-0.5">{moreActive ? more.find((m) => m.href === active)!.label : "More"}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent data-workspace={current?.id} side="top" align="end" className="w-48">
                  {more.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} render={<Link href={href} />}>
                      <Icon />
                      {label}
                      {href === active && <Check className="ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
