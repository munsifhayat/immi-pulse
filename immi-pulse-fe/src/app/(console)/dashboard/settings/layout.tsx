"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  CreditCard,
  FileSignature,
  Plug,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Organization", href: "/dashboard/settings/organization", icon: Building2 },
  { name: "Bank & ABN", href: "/dashboard/settings/bank", icon: Wallet },
  { name: "Engagement letter", href: "/dashboard/settings/letter-template", icon: FileSignature },
  { name: "Plan & Billing", href: "/dashboard/settings/billing", icon: CreditCard },
  { name: "Team", href: "/dashboard/settings/team", icon: Users },
  { name: "Integrations", href: "/dashboard/settings/integrations", icon: Plug },
  { name: "How it works", href: "/dashboard/how-it-works", icon: BookOpen },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Workspace, payments, letter template, plan, team, and integrations.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
