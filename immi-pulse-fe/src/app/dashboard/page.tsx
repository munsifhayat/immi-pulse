"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { invoiceService } from "@/lib/api/invoice.service";
import { p1Service } from "@/lib/api/p1.service";
import { emergentWorkService } from "@/lib/api/emergent-work.service";
import { activityService } from "@/lib/api/activity.service";
import { configService } from "@/lib/api/config.service";
import { complianceService } from "@/lib/api/compliance.service";
import {
  Mail,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Inbox,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

// ── Property-first stat cards ────────────────────────────────
const statCards = [
  {
    key: "urgent",
    title: "Urgent Issues",
    icon: AlertTriangle,
    accentColor: "text-[oklch(0.72_0.19_25)]",
    accentBg: "bg-[oklch(0.72_0.19_25)]/10",
    ringColor: "ring-[oklch(0.72_0.19_25)]/20",
  },
  {
    key: "maintenance",
    title: "Maintenance Queue",
    icon: Wrench,
    accentColor: "text-[oklch(0.62_0.14_175)]",
    accentBg: "bg-[oklch(0.62_0.14_175)]/10",
    ringColor: "ring-[oklch(0.62_0.14_175)]/20",
  },
  {
    key: "scopeWatch",
    title: "Scope Alerts",
    icon: ShieldAlert,
    accentColor: "text-[oklch(0.75_0.15_300)]",
    accentBg: "bg-[oklch(0.75_0.15_300)]/10",
    ringColor: "ring-[oklch(0.75_0.15_300)]/20",
  },
  {
    key: "financials",
    title: "Invoices Processed",
    icon: DollarSign,
    accentColor: "text-[oklch(0.80_0.17_165)]",
    accentBg: "bg-[oklch(0.80_0.17_165)]/10",
    ringColor: "ring-[oklch(0.80_0.17_165)]/20",
  },
];

// ── Chart configs ─────────────────────────────────────────
const activityChartConfig = {
  operations: { label: "Operations", color: "var(--chart-1)" },
} satisfies ChartConfig;

const breakdownConfig = {
  invoice: { label: "Financials", color: "var(--chart-1)" },
  p1_classifier: { label: "Urgent Issues", color: "var(--chart-5)" },
  emergent_work: { label: "Scope Watch", color: "var(--chart-2)" },
  compliance: { label: "Compliance", color: "var(--chart-3)" },
} satisfies ChartConfig;

// ── AI Assistant colors ──────────────────────────────────
const assistantColors: Record<string, { bg: string; bar: string; text: string }> = {
  invoice: {
    bg: "bg-[oklch(0.80_0.17_165)]/10",
    bar: "bg-[oklch(0.80_0.17_165)]",
    text: "text-[oklch(0.80_0.17_165)]",
  },
  p1_classifier: {
    bg: "bg-[oklch(0.72_0.19_25)]/10",
    bar: "bg-[oklch(0.72_0.19_25)]",
    text: "text-[oklch(0.72_0.19_25)]",
  },
  emergent_work: {
    bg: "bg-[oklch(0.75_0.15_300)]/10",
    bar: "bg-[oklch(0.75_0.15_300)]",
    text: "text-[oklch(0.75_0.15_300)]",
  },
  compliance: {
    bg: "bg-[oklch(0.65_0.15_180)]/10",
    bar: "bg-[oklch(0.65_0.15_180)]",
    text: "text-[oklch(0.65_0.15_180)]",
  },
};

const assistantLabels: Record<string, string> = {
  invoice: "Financials",
  p1_classifier: "Urgent Issues",
  emergent_work: "Scope Watch",
  compliance: "Compliance",
};

const assistantIcons: Record<string, typeof DollarSign> = {
  invoice: DollarSign,
  p1_classifier: AlertTriangle,
  emergent_work: ShieldAlert,
  compliance: ShieldCheck,
};

// ── Helpers ───────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const badgeStyles: Record<string, string> = {
  invoice:
    "border-[oklch(0.80_0.17_165)]/30 bg-[oklch(0.80_0.17_165)]/8 text-[oklch(0.80_0.17_165)]",
  p1_classifier:
    "border-[oklch(0.72_0.19_25)]/30 bg-[oklch(0.72_0.19_25)]/8 text-[oklch(0.72_0.19_25)]",
  emergent_work:
    "border-[oklch(0.75_0.15_300)]/30 bg-[oklch(0.75_0.15_300)]/8 text-[oklch(0.75_0.15_300)]",
  compliance:
    "border-[oklch(0.65_0.15_180)]/30 bg-[oklch(0.65_0.15_180)]/8 text-[oklch(0.65_0.15_180)]",
};

export default function DashboardPage() {
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all");
  const { user } = useAuth();

  const { data: mailboxes } = useQuery({ queryKey: ["active-mailboxes"], queryFn: () => configService.getActiveMailboxes() });
  const mailboxParam = selectedMailbox === "all" ? undefined : selectedMailbox;
  const { data: invoiceStats } = useQuery({ queryKey: ["invoice-stats", mailboxParam], queryFn: () => invoiceService.getStats(mailboxParam) });
  const { data: p1Stats } = useQuery({ queryKey: ["p1-stats", mailboxParam], queryFn: () => p1Service.getStats(mailboxParam) });
  const { data: ewStats } = useQuery({ queryKey: ["emergent-work-stats", mailboxParam], queryFn: () => emergentWorkService.getStats(mailboxParam) });
  const { data: activity } = useQuery({ queryKey: ["activity", { limit: 50, mailbox: mailboxParam }], queryFn: () => activityService.getActivity({ limit: 50, mailbox: mailboxParam }) });
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: () => activityService.getMetrics() });

  const getStatValue = (key: string): { value: string | number; description: string; trend?: number } => {
    switch (key) {
      case "urgent": return {
        value: p1Stats?.total_p1 ?? "--",
        description: `${p1Stats?.overdue ?? 0} overdue, ${p1Stats?.responded_in_sla ?? 0} resolved in SLA`,
        trend: p1Stats?.overdue && p1Stats.overdue > 0 ? -8 : 0,
      };
      case "maintenance": return {
        value: invoiceStats?.total_processed ?? "--",
        description: "Emails triaged by AI this period",
        trend: 18,
      };
      case "scopeWatch": return {
        value: ewStats?.total_detected ?? "--",
        description: `${ewStats?.raised ?? 0} raised with client`,
        trend: ewStats?.total_detected && ewStats.total_detected > 0 ? 5 : 0,
      };
      case "financials": return {
        value: invoiceStats?.invoices_detected ?? "--",
        description: `${invoiceStats?.moved ?? 0} auto-filed, ${invoiceStats?.flagged ?? 0} flagged`,
        trend: 12,
      };
      default: return { value: "--", description: "" };
    }
  };

  // 7-day operations activity for area chart
  const activityByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
      const count = activity?.filter((e) => e.created_at.startsWith(dateStr)).length ?? 0;
      return { day: dayLabel, operations: count };
    });
  }, [activity]);

  // Breakdown stacked bar
  const breakdownData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayItems = activity?.filter((e) => e.created_at.startsWith(dateStr)) ?? [];
      return {
        day: dayLabel,
        invoice: dayItems.filter((e) => e.agent_name === "invoice").length,
        p1_classifier: dayItems.filter((e) => e.agent_name === "p1_classifier").length,
        emergent_work: dayItems.filter((e) => e.agent_name === "emergent_work").length,
      };
    });
  }, [activity]);

  // AI Assistants performance panel
  const assistantsData = useMemo(() => {
    const agents = [
      { name: "invoice", count: activity?.filter((e) => e.agent_name === "invoice").length ?? 0 },
      { name: "p1_classifier", count: activity?.filter((e) => e.agent_name === "p1_classifier").length ?? 0 },
      { name: "emergent_work", count: activity?.filter((e) => e.agent_name === "emergent_work").length ?? 0 },
    ];
    return agents.sort((a, b) => b.count - a.count);
  }, [activity]);

  const maxCount = Math.max(...assistantsData.map((a) => a.count), 1);
  const recentActivity = activity?.slice(0, 6) ?? [];

  return (
    <div className="space-y-6 text-foreground">
      {/* Welcome greeting + property selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome Back{user?.first_name ? `, ${user.first_name}` : ""}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your property operations at a glance
          </p>
        </div>
        {mailboxes && mailboxes.length > 0 && (
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
              <SelectTrigger className="w-[240px] h-9 text-[13px]">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {mailboxes.map((mb) => (
                  <SelectItem key={mb.id} value={mb.email}>{mb.display_name || mb.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats cards — Property operations focused */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const { value, description, trend } = getStatValue(card.key);
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="group relative rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-medium text-muted-foreground">{card.title}</p>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset", card.accentBg, card.ringColor)}>
                  <Icon className={cn("h-4.5 w-4.5", card.accentColor)} />
                </div>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
                {trend !== undefined && trend !== 0 && (
                  <span className={cn(
                    "mb-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    trend > 0
                      ? "bg-[oklch(0.80_0.17_165)]/10 text-[oklch(0.80_0.17_165)]"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend)}%
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
            </div>
          );
        })}
      </div>

      {/* Charts + AI Assistants Panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Operations Activity — area chart */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">Operations Activity</CardTitle>
                <CardDescription className="text-xs">Property operations processed over the last 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="h-[240px] w-full">
              <AreaChart data={activityByDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillOps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-operations)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-operations)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="operations" stroke="var(--color-operations)" strokeWidth={2} fill="url(#fillOps)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* AI Assistants Performance */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">AI Assistants</CardTitle>
            <CardDescription className="text-xs">Actions handled this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assistantsData.map((agent) => {
              const colors = assistantColors[agent.name] || assistantColors.invoice;
              const Icon = assistantIcons[agent.name] || DollarSign;
              const label = assistantLabels[agent.name] || agent.name;
              const barWidth = maxCount > 0 ? (agent.count / maxCount) * 100 : 0;
              return (
                <div key={agent.name} className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
                    <Icon className={cn("h-4.5 w-4.5", colors.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-medium text-foreground">{label}</p>
                      <span className={cn("text-sm font-bold", colors.text)}>{agent.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* System health mini cards */}
            {metrics && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Response</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{Math.round(metrics.avg_processing_time_ms ?? 0)}<span className="text-xs font-normal text-muted-foreground">ms</span></p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI Actions</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{metrics.ai_calls_today ?? 0}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Accuracy</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{(100 - Number((metrics.error_rate ?? 0).toFixed(1))).toFixed(1)}<span className="text-xs font-normal text-muted-foreground">%</span></p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI Cost</p>
                  <p className="mt-1 text-lg font-bold text-foreground">${Number((metrics.ai_cost_today_usd ?? 0).toFixed(3))}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations Breakdown — stacked bar chart */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">Operations Breakdown</CardTitle>
          <CardDescription className="text-xs">AI assistant actions over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={breakdownConfig} className="h-[200px] w-full">
            <BarChart data={breakdownData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="invoice" stackId="a" fill="var(--color-invoice)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="p1_classifier" stackId="a" fill="var(--color-p1_classifier)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="emergent_work" stackId="a" fill="var(--color-emergent_work)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">Recent Operations</CardTitle>
            <CardDescription className="text-xs">Latest AI-processed property events</CardDescription>
          </div>
          <Link href="/dashboard/activity" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border/50">
            {recentActivity.length > 0 ? (
              recentActivity.map((entry) => {
                const label = assistantLabels[entry.agent_name] || entry.agent_name.replace(/_/g, " ");
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30">
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", badgeStyles[entry.agent_name] || "bg-muted text-muted-foreground border-border")}>
                      {label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{entry.action}</p>
                      {entry.subject && <p className="truncate text-xs text-muted-foreground">{entry.subject}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
                      {entry.confidence_score !== null && (
                        <p className="text-[11px] font-medium text-muted-foreground/70">{(entry.confidence_score * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No operations yet</p>
                <p className="mt-1 text-xs text-muted-foreground/60">AI will start processing when property communications arrive</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
