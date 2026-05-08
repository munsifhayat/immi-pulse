"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw, Sun, Moon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const segmentLabels: Record<string, string> = {
  dashboard: "Overview",
  precases: "Pre-Cases",
  cases: "Cases",
  questionnaires: "Forms",
  clients: "Clients",
  documents: "Documents",
  inbox: "Inbox",
  activity: "Activity",
  "agent-board": "Product Board",
  settings: "Settings",
  team: "Team",
  organization: "Organization",
  billing: "Plan & Billing",
  integrations: "Integrations",
  new: "New",
};

function buildCrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string; isLast: boolean }[] = [];
  let acc = "";
  parts.forEach((part, i) => {
    acc += `/${part}`;
    const looksLikeId = /^[0-9a-f-]{8,}$/i.test(part);
    const label = looksLikeId
      ? "Detail"
      : segmentLabels[part] ?? part.replace(/-/g, " ");
    crumbs.push({
      label,
      href: acc,
      isLast: i === parts.length - 1,
    });
  });
  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background/85 px-6 backdrop-blur-md">
      <nav
        aria-label="Breadcrumb"
        className="font-mono-d flex min-w-0 items-center gap-2 text-[10.5px] uppercase tracking-[0.22em]"
      >
        {crumbs.map((c, i) => (
          <div key={c.href} className="flex min-w-0 items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-foreground/20">
                /
              </span>
            )}
            {c.isLast ? (
              <span
                className={cn(
                  "truncate text-foreground",
                  i === 0 && "text-foreground",
                )}
                aria-current="page"
              >
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className="truncate text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Refresh data"
              onClick={() => queryClient.invalidateQueries()}
              className="font-mono-d inline-flex h-8 items-center gap-1.5 border border-transparent px-2.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 transition-all hover:border-foreground/15 hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh data</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative inline-flex h-8 w-8 items-center justify-center border border-transparent text-muted-foreground/80 transition-all hover:border-foreground/15 hover:text-foreground"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
