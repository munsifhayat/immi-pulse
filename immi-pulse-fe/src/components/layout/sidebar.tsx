"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronsUpDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { preCasesApi } from "@/lib/api/services";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Counters = { inbox: number; precases: number };

const navigation = [
  { num: "01", name: "Overview", href: "/dashboard", badgeKey: null as keyof Counters | null },
  { num: "02", name: "Inbox", href: "/dashboard/inbox", badgeKey: "inbox" as const },
  { num: "03", name: "Pre-cases", href: "/dashboard/precases", badgeKey: "precases" as const },
  { num: "04", name: "Clients", href: "/dashboard/clients", badgeKey: null as keyof Counters | null },
  { num: "05", name: "Cases", href: "/dashboard/cases", badgeKey: null as keyof Counters | null },
  { num: "06", name: "Forms", href: "/dashboard/questionnaires", badgeKey: null as keyof Counters | null },
  { num: "07", name: "Settings", href: "/dashboard/settings", badgeKey: null as keyof Counters | null },
];

const INBOX_STATUSES = new Set(["pending", "in_review"]);
const PRECASE_STATUSES = new Set(["qualified", "letter_sent", "letter_signed", "paid"]);

export function Sidebar() {
  const pathname = usePathname();
  const { user, org, logout, isAuthenticated } = useAuth();
  const [counters, setCounters] = useState<Counters>({ inbox: 0, precases: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const load = async () => {
      try {
        const items = await preCasesApi.list();
        if (!mounted) return;
        const inbox = items.filter((p) => INBOX_STATUSES.has(p.status) && p.read_at === null).length;
        const precases = items.filter((p) => PRECASE_STATUSES.has(p.status)).length;
        setCounters({ inbox, precases });
      } catch {
        // Silent — sidebar shouldn't error on bg fetch
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isAuthenticated, pathname]);

  const userInitials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || user.email[0].toUpperCase()
    : "U";

  return (
    <aside className="relative flex h-full w-[244px] flex-col border-r border-border/70 bg-sidebar">
      {/* Brand block — folio header */}
      <div className="relative border-b border-border/70 px-5 pb-5 pt-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <span className="block h-2 w-2 rotate-45 bg-[color:var(--purple)] transition-transform duration-500 group-hover:rotate-[225deg]" />
          <div className="flex min-w-0 flex-col">
            <span className="font-mono-d text-[11px] font-medium uppercase leading-none tracking-[0.22em] text-foreground">
              IMMI-PULSE
            </span>
            <span className="font-mono-d mt-1.5 truncate text-[9.5px] uppercase leading-none tracking-[0.22em] text-muted-foreground/80">
              {org?.name || "—"}
            </span>
          </div>
        </Link>
      </div>

      {/* Editorial section label */}
      <div className="px-5 pb-3 pt-5">
        <p className="font-mono-d text-[9.5px] uppercase tracking-[0.28em] text-muted-foreground/65">
          ◆ Manifest
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-px">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const badge = item.badgeKey ? counters[item.badgeKey] : 0;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 px-2.5 py-2.5 text-sm transition-all",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* Left active rail */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-1.5 left-0 w-px transition-all",
                      isActive
                        ? "bg-[color:var(--purple)]"
                        : "bg-transparent group-hover:bg-foreground/20",
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono-d w-7 text-[10px] tracking-[0.16em] transition-colors",
                      isActive
                        ? "text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {item.num}
                  </span>
                  <span
                    className={cn(
                      "flex-1 truncate text-[13px] tracking-[0.01em]",
                      isActive ? "font-medium" : "font-normal",
                    )}
                  >
                    {item.name}
                  </span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "font-mono-d flex h-[18px] min-w-[22px] items-center justify-center px-1.5 text-[9.5px] tabular-nums tracking-[0.05em] transition-colors",
                        isActive
                          ? "bg-[color:var(--purple)] text-white"
                          : "bg-foreground/8 text-foreground/70 group-hover:bg-foreground/12",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Folio seal — bottom decorative meta */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between font-mono-d text-[9px] uppercase tracking-[0.24em] text-muted-foreground/50">
          <span>Folio Nº 001</span>
          <span>EST · 2026</span>
        </div>
      </div>

      {/* User menu */}
      <div className="border-t border-border/70 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 px-2 py-2 text-left transition-colors hover:bg-foreground/5">
            <Avatar className="h-8 w-8 rounded-none bg-foreground text-background">
              <AvatarFallback className="font-mono-d rounded-none bg-foreground text-[10px] uppercase tracking-[0.1em] text-background">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="font-mono-d truncate text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
                {user?.email}
              </p>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Team & settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
