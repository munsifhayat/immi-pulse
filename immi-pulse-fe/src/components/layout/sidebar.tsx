"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Users,
  FolderOpen,
  ClipboardList,
  Settings as SettingsIcon,
  LogOut,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { preCasesApi } from "@/lib/api/services";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PulseMark } from "@/components/brand/pulse-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Counters = { inbox: number; precases: number };

const navigation: {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeKey: keyof Counters | null;
}[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, badgeKey: null },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, badgeKey: "inbox" },
  { name: "Pre-cases", href: "/dashboard/precases", icon: Briefcase, badgeKey: "precases" },
  { name: "Clients", href: "/dashboard/clients", icon: Users, badgeKey: null },
  { name: "Cases", href: "/dashboard/cases", icon: FolderOpen, badgeKey: null },
  { name: "Forms", href: "/dashboard/questionnaires", icon: ClipboardList, badgeKey: null },
  { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon, badgeKey: null },
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
        const data = await preCasesApi.list({ limit: 200 });
        if (!mounted) return;
        const inbox = data.items.filter(
          (p) => INBOX_STATUSES.has(p.status) && p.read_at === null,
        ).length;
        const precases = data.items.filter((p) => PRECASE_STATUSES.has(p.status)).length;
        setCounters({ inbox, precases });
      } catch {
        // silent
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
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "U";

  return (
    <aside className="relative flex h-full w-[252px] flex-col border-r border-border bg-sidebar">
      {/* Brand block */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <PulseMark size={32} label="II" rings={false} />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              IMMI-PULSE
            </span>
            <span className="font-mono mt-1 truncate text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
              {org?.name || "Migration OS"}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
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
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-all",
                    isActive
                      ? "bg-[color:var(--purple)]/8 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
                        : "text-muted-foreground/70 group-hover:text-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "flex-1 truncate",
                      isActive ? "font-medium" : "font-normal",
                    )}
                  >
                    {item.name}
                  </span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-medium tabular-nums transition-colors",
                        isActive
                          ? "bg-[color:var(--purple)] text-white"
                          : "bg-foreground/8 text-foreground/70",
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

      {/* User menu */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-foreground/[0.04]">
            <Avatar className="h-8 w-8 rounded-full bg-gradient-to-br from-[color:var(--purple)] to-[color:var(--purple-deep)] text-white">
              <AvatarFallback className="rounded-full bg-transparent text-[11px] font-semibold text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <SettingsIcon className="mr-2 h-4 w-4" />
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
