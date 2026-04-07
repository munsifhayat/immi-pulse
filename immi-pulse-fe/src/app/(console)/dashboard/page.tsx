"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { dashboardService } from "@/lib/api/dashboard.service";
import {
  FolderKanban,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Mail,
  BrainCircuit,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import type {
  DashboardStats,
  CaseActivityPoint,
  VisaBreakdownPoint,
  ActivityEntry,
} from "@/lib/types/immigration";

// ── Stat card config ────────────────────────────────
const statCards = [
  {
    key: "active_cases" as const,
    title: "Active Cases",
    icon: FolderKanban,
    accentColor: "text-primary",
    accentBg: "bg-primary/10",
    ringColor: "ring-primary/20",
  },
  {
    key: "documents_pending" as const,
    title: "Documents Pending",
    icon: FileCheck,
    accentColor: "text-teal-600",
    accentBg: "bg-teal-500/10",
    ringColor: "ring-teal-500/20",
  },
  {
    key: "ai_flagged_issues" as const,
    title: "AI Flagged Issues",
    icon: AlertTriangle,
    accentColor: "text-amber-600",
    accentBg: "bg-amber-500/10",
    ringColor: "ring-amber-500/20",
  },
  {
    key: "cases_this_month" as const,
    title: "Cases This Month",
    icon: TrendingUp,
    accentColor: "text-emerald-600",
    accentBg: "bg-emerald-500/10",
    ringColor: "ring-emerald-500/20",
  },
];

// ── Chart configs ─────────────────────────────────────
const activityChartConfig = {
  cases: { label: "Cases", color: "var(--chart-1)" },
} satisfies ChartConfig;

const breakdownConfig = {
  skilled: { label: "Skilled", color: "var(--chart-1)" },
  family: { label: "Family", color: "var(--chart-5)" },
  student: { label: "Student", color: "var(--chart-2)" },
  visitor: { label: "Visitor", color: "var(--chart-3)" },
} satisfies ChartConfig;

// ── AI Agent config ──────────────────────────────────
const agentConfig = [
  { key: "intake", label: "Email Intake", icon: Mail, color: "text-blue-600", bg: "bg-blue-500/10", bar: "bg-blue-500" },
  { key: "visa_classifier", label: "Visa Classifier", icon: BrainCircuit, color: "text-primary", bg: "bg-primary/10", bar: "bg-primary" },
  { key: "document_reviewer", label: "Document Reviewer", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-500/10", bar: "bg-teal-500" },
  { key: "checklist_engine", label: "Checklist Engine", icon: ListChecks, color: "text-amber-600", bg: "bg-amber-500/10", bar: "bg-amber-500" },
];

const agentBadgeStyles: Record<string, string> = {
  intake: "border-blue-200 bg-blue-50 text-blue-700",
  visa_classifier: "border-purple-200 bg-purple-50 text-purple-700",
  document_reviewer: "border-teal-200 bg-teal-50 text-teal-700",
  checklist_engine: "border-amber-200 bg-amber-50 text-amber-700",
};

// ── Helpers ───────────────────────────────────────────
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

function getTrend(key: string, stats: DashboardStats) {
  const map: Record<string, number> = {
    active_cases: stats.active_cases_trend,
    documents_pending: stats.documents_pending_trend,
    ai_flagged_issues: stats.ai_flagged_trend,
    cases_this_month: stats.cases_month_trend,
  };
  return map[key] ?? 0;
}

function getStatValue(key: string, stats: DashboardStats) {
  const map: Record<string, number> = {
    active_cases: stats.active_cases,
    documents_pending: stats.documents_pending,
    ai_flagged_issues: stats.ai_flagged_issues,
    cases_this_month: stats.cases_this_month,
  };
  return map[key] ?? 0;
}

const statDescriptions: Record<string, string> = {
  active_cases: "Cases in progress across all stages",
  documents_pending: "Awaiting AI validation or review",
  ai_flagged_issues: "Documents or cases needing attention",
  cases_this_month: "New cases opened this month",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [caseActivity, setCaseActivity] = useState<CaseActivityPoint[]>([]);
  const [visaBreakdown, setVisaBreakdown] = useState<VisaBreakdownPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    dashboardService.getStats().then(setStats);
    dashboardService.getCaseActivity().then(setCaseActivity);
    dashboardService.getVisaBreakdown().then(setVisaBreakdown);
    dashboardService.getRecentActivity(6).then(setRecentActivity);
  }, []);

  // Mock agent counts for the performance panel
  const agentCounts: Record<string, number> = {
    intake: 12,
    visa_classifier: 18,
    document_reviewer: 15,
    checklist_engine: 8,
  };
  const maxCount = Math.max(...Object.values(agentCounts), 1);

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome greeting */}
      <motion.div variants={fadeUp} custom={0} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome Back{user?.first_name ? `, ${user.first_name}` : ""}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your immigration practice at a glance
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 text-primary">
          Demo Data
        </Badge>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={fadeUp} custom={1} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const value = stats ? getStatValue(card.key, stats) : "--";
          const trend = stats ? getTrend(card.key, stats) : 0;
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
                {trend !== 0 && (
                  <span className={cn(
                    "mb-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    trend > 0
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend)}%
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{statDescriptions[card.key]}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Charts + AI Agents Panel */}
      <motion.div variants={fadeUp} custom={2} className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Case Activity — area chart */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Case Activity</CardTitle>
            <CardDescription className="text-xs">Cases created and updated over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="h-[240px] w-full">
              <AreaChart data={caseActivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cases)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-cases)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cases" stroke="var(--color-cases)" strokeWidth={2} fill="url(#fillCases)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* AI Agents Performance */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">AI Agents</CardTitle>
            <CardDescription className="text-xs">Actions handled this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentConfig.map((agent) => {
              const count = agentCounts[agent.key] ?? 0;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const Icon = agent.icon;
              return (
                <div key={agent.key} className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", agent.bg)}>
                    <Icon className={cn("h-4.5 w-4.5", agent.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-medium text-foreground">{agent.label}</p>
                      <span className={cn("text-sm font-bold", agent.color)}>{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", agent.bar)}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* System health mini cards */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Response</p>
                <p className="mt-1 text-lg font-bold text-foreground">1.2<span className="text-xs font-normal text-muted-foreground">s</span></p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI Actions</p>
                <p className="mt-1 text-lg font-bold text-foreground">53</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Accuracy</p>
                <p className="mt-1 text-lg font-bold text-foreground">94.2<span className="text-xs font-normal text-muted-foreground">%</span></p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AI Cost</p>
                <p className="mt-1 text-lg font-bold text-foreground">$2.40</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Visa Type Breakdown — stacked bar chart */}
      <motion.div variants={fadeUp} custom={3}>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Visa Type Breakdown</CardTitle>
            <CardDescription className="text-xs">Case activity by visa category over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={breakdownConfig} className="h-[200px] w-full">
              <BarChart data={visaBreakdown} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[11px]" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="skilled" stackId="a" fill="var(--color-skilled)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="family" stackId="a" fill="var(--color-family)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="student" stackId="a" fill="var(--color-student)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="visitor" stackId="a" fill="var(--color-visitor)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Case Activity */}
      <motion.div variants={fadeUp} custom={4}>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">Recent Case Activity</CardTitle>
              <CardDescription className="text-xs">Latest AI-processed immigration events</CardDescription>
            </div>
            <Link href="/dashboard/activity" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border/50">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => {
                  const badgeStyle = agentBadgeStyles[entry.agent_type] || "bg-muted text-muted-foreground border-border";
                  const agentLabel = agentConfig.find((a) => a.key === entry.agent_type)?.label || entry.agent_type;
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", badgeStyle)}>
                        {agentLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{entry.action} — {entry.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{entry.subject}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
                        {entry.confidence !== undefined && (
                          <p className="text-[11px] font-medium text-muted-foreground/70">{(entry.confidence * 100).toFixed(0)}%</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-12 text-center">
                  <FolderKanban className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No case activity yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">AI will start processing when client communications arrive</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
