"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  BrainCircuit,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "AI Pipeline", href: "/dashboard/agent-board", icon: BrainCircuit },
  { name: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
  { name: "Activity", href: "/dashboard/activity", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userInitials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U";

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
            <Building2 className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">Property Pulse</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3">
        {/* Version */}
        <div className="mb-2 px-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"}
          </p>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
