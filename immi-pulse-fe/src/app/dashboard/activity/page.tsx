"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  activityService,
  type ActivityEntry,
  type ActivityFilters,
} from "@/lib/api/activity.service";
import { configService } from "@/lib/api/config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Clock,
  AlertCircle,
  Activity,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ── Agent display config ──────────────────────────────────────────
const agentConfig: Record<
  string,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }
> = {
  invoice: {
    label: "Financials",
    shortLabel: "FIN",
    icon: DollarSign,
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  p1_classifier: {
    label: "Urgent Issues",
    shortLabel: "URG",
    icon: AlertTriangle,
    badgeClass:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
  emergent_work: {
    label: "Scope Watch",
    shortLabel: "SCW",
    icon: ShieldAlert,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  compliance: {
    label: "Compliance",
    shortLabel: "CMP",
    icon: ShieldCheck,
    badgeClass:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  },
};

// ── Group entries by message_id ──────────────────────────────────
interface GroupedEmail {
  message_id: string;
  subject: string;
  mailbox: string;
  created_at: string;
  agents: {
    agent_name: string;
    action: string;
    confidence_score: number | null;
    details: Record<string, unknown> | null;
    status: string;
  }[];
  processing_time_ms: number;
  hasError: boolean;
  priority: string | null;
  isInvoice: boolean;
}

function groupByEmail(entries: ActivityEntry[]): GroupedEmail[] {
  const groups = new Map<string, ActivityEntry[]>();

  for (const entry of entries) {
    const key = entry.message_id || entry.id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries()).map(([messageId, items]) => {
    const first = items[0];
    const p1Entry = items.find((e) => e.agent_name === "p1_classifier");
    const invoiceEntry = items.find((e) => e.agent_name === "invoice");
    const totalTime = Math.max(...items.map((e) => e.processing_time_ms || 0));

    const priority =
      (p1Entry?.details?.priority as string) || null;
    const isInvoice =
      invoiceEntry?.action === "moved" ||
      invoiceEntry?.action === "detected" ||
      invoiceEntry?.action === "flagged" ||
      (invoiceEntry?.details?.is_invoice as boolean) === true;

    return {
      message_id: messageId,
      subject: first.subject || "No subject",
      mailbox: first.mailbox || "",
      created_at: first.created_at,
      agents: items.map((e) => ({
        agent_name: e.agent_name,
        action: e.action,
        confidence_score: e.confidence_score,
        details: e.details,
        status: e.status,
      })),
      processing_time_ms: totalTime,
      hasError: items.some((e) => e.status === "error"),
      priority,
      isInvoice,
    };
  });
}

// ── Priority badge ────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-muted-foreground">-</span>;
  const labelMap: Record<string, string> = { P1: "Critical", P2: "High", P3: "Medium", P4: "Low" };
  const map: Record<string, string> = {
    P1: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    P2: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    P3: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    P4: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold px-1.5 py-0 ${map[priority] || ""}`}
    >
      {labelMap[priority] || priority}
    </Badge>
  );
}

// ── Expandable email row ──────────────────────────────────────────
function EmailRow({ email }: { email: GroupedEmail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Time */}
        <div className="w-[140px] shrink-0">
          <p className="text-xs text-muted-foreground">
            {new Date(email.created_at).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>

        {/* Subject + Mailbox */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{email.subject}</p>
          <p className="text-xs text-muted-foreground truncate">
            {email.mailbox}
          </p>
        </div>

        {/* Priority */}
        <div className="w-[50px] shrink-0 flex justify-center">
          <PriorityBadge priority={email.priority} />
        </div>

        {/* Agent badges */}
        <div className="w-[220px] shrink-0 flex gap-1.5 flex-wrap">
          {email.agents.map((a) => {
            const cfg = agentConfig[a.agent_name];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <Badge
                key={a.agent_name}
                variant="outline"
                className={`text-[10px] gap-1 px-1.5 py-0 ${cfg.badgeClass}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {cfg.shortLabel}
                <span className="opacity-60">
                  {a.action === "skipped"
                    ? "-"
                    : a.action === "classified"
                    ? ""
                    : a.action === "moved"
                    ? "moved"
                    : a.action === "flagged"
                    ? "!"
                    : a.action === "signal_detected"
                    ? "signal"
                    : a.action}
                </span>
              </Badge>
            );
          })}
        </div>

        {/* Processing time */}
        <div className="w-[70px] shrink-0 text-right">
          <span className="text-xs text-muted-foreground">
            {email.processing_time_ms}ms
          </span>
        </div>

        {/* Status */}
        <div className="w-[60px] shrink-0 flex justify-end">
          {email.hasError ? (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Error
            </Badge>
          ) : (
            <div className="h-2 w-2 rounded-full bg-green-500" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pl-11">
          <div className="rounded-lg border border-border/50 bg-muted/20 divide-y divide-border/40">
            {email.agents.map((a) => {
              const cfg = agentConfig[a.agent_name];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <div
                  key={a.agent_name}
                  className="flex items-center gap-4 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2 w-[140px] shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs capitalize"
                  >
                    {a.action.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {a.confidence_score !== null
                      ? `${(a.confidence_score * 100).toFixed(0)}% confidence`
                      : ""}
                  </span>
                  {a.details && (() => {
                    const parts: string[] = [];
                    if (a.details!.priority) parts.push(`Priority: ${String(a.details!.priority)}`);
                    if (a.details!.invoice_type) parts.push(`Type: ${String(a.details!.invoice_type)}`);
                    if (a.details!.signal_description) parts.push(`Signal: ${String(a.details!.signal_description)}`);
                    if (a.details!.flag_reason) parts.push(`Flagged: ${String(a.details!.flag_reason)}`);
                    return parts.length > 0 ? (
                      <span className="text-xs text-muted-foreground/70 truncate flex-1">
                        {parts.join(" \u00b7 ")}
                      </span>
                    ) : null;
                  })()}
                  {a.status === "error" && (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ActivityPage() {
  const [filters, setFilters] = useState<ActivityFilters>({ limit: 200 });
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  const { data: mailboxes } = useQuery({
    queryKey: ["active-mailboxes"],
    queryFn: () => configService.getActiveMailboxes(),
  });

  const effectiveFilters: ActivityFilters = {
    ...filters,
    mailbox: selectedMailbox === "all" ? undefined : selectedMailbox,
    agent: selectedAgent === "all" ? undefined : selectedAgent,
  };

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity-full", effectiveFilters],
    queryFn: () => activityService.getActivity(effectiveFilters),
  });

  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => activityService.getMetrics(),
  });

  const grouped = activity ? groupByEmail(activity) : [];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                <Building2 className="h-5 w-5 text-primary/70" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.emails_processed_today ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Operations Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                <Clock className="h-5 w-5 text-primary/70" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.avg_processing_time_ms
                    ? `${metrics.avg_processing_time_ms.toFixed(0)}ms`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Processing Time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                <AlertCircle className="h-5 w-5 text-primary/70" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.error_rate !== undefined
                    ? `${metrics.error_rate.toFixed(1)}%`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Error Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                <Activity className="h-5 w-5 text-primary/70" />
              </div>
              <div>
                <p className="text-2xl font-bold">{grouped.length || "-"}</p>
                <p className="text-xs text-muted-foreground">
                  Items in View
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Select
              value={selectedMailbox}
              onValueChange={setSelectedMailbox}
            >
              <SelectTrigger className="w-[240px] h-9 text-sm">
                <SelectValue placeholder="All Mailboxes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {mailboxes?.map((mb) => (
                  <SelectItem key={mb.id} value={mb.email}>
                    {mb.display_name || mb.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedAgent}
              onValueChange={setSelectedAgent}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AI Assistants</SelectItem>
                <SelectItem value="invoice">Financials</SelectItem>
                <SelectItem value="p1_classifier">Urgent Issues</SelectItem>
                <SelectItem value="emergent_work">Scope Watch</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.from_date || ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  from_date: e.target.value || undefined,
                }))
              }
              className="w-[160px] h-9 text-sm"
            />
            <Input
              type="date"
              value={filters.to_date || ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  to_date: e.target.value || undefined,
                }))
              }
              className="w-[160px] h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Activity Feed */}
      <Card className="border-border/50">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Operations Feed</CardTitle>
            <span className="text-xs text-muted-foreground">
              Each row = 1 communication, processed by AI assistants in a single pass
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-3 px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-3" />
              <span className="text-sm">Loading activity...</span>
            </div>
          ) : grouped.length > 0 ? (
            <div>
              {/* Column headers */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="w-3.5 shrink-0" />
                <div className="w-[140px] shrink-0">Time</div>
                <div className="flex-1">Email</div>
                <div className="w-[50px] shrink-0 text-center">Severity</div>
                <div className="w-[220px] shrink-0">AI Assistants</div>
                <div className="w-[70px] shrink-0 text-right">Time</div>
                <div className="w-[60px] shrink-0 text-right">Status</div>
              </div>
              {/* Rows */}
              {grouped.map((email) => (
                <EmailRow key={email.message_id} email={email} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <Activity className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No operations recorded yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Property communications will appear here once AI processing begins.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
