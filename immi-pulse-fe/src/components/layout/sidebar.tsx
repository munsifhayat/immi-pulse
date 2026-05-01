"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  FileText,
  Users,
  FolderKanban,
  Settings,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
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

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pre-Cases", href: "/dashboard/precases", icon: Inbox, badgeKey: "preCases" as const },
  { name: "Questionnaires", href: "/dashboard/questionnaires", icon: ClipboardList },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Cases", href: "/dashboard/cases", icon: FolderKanban },
  { name: "Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Settings", href: "/dashboard/settings/team", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, org, logout, isAuthenticated } = useAuth();
  const [unreadPre, setUnreadPre] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const load = async () => {
      try {
        const items = await preCasesApi.list();
        if (!mounted) return;
        setUnreadPre(items.filter((p) => p.status === "pending" || p.read_at === null).length);
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
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#7C5CFC] to-[#5B3ADB] text-xs font-bold text-white">
            IP
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">IMMI-PULSE</span>
            <span className="text-[10px] text-muted-foreground">{org?.name || "—"}</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge =
            item.badgeKey === "preCases" && unreadPre > 0 ? unreadPre : null;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.name}
              </span>
              {badge !== null && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/team">
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
