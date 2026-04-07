"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion";
import { mockActivityEntries } from "@/lib/mock-data/immigration-mock";
import type { ActivityEntry } from "@/lib/types/immigration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Zap,
  Target,
  Eye,
} from "lucide-react";

// ── Agent badge styles ─────────────────────────────────────────────
const agentBadgeStyles: Record<string, string> = {
  intake: "border-blue-200 bg-blue-50 text-blue-700",
  visa_classifier: "border-purple-200 bg-purple-50 text-purple-700",
  document_reviewer: "border-teal-200 bg-teal-50 text-teal-700",
  checklist_engine: "border-amber-200 bg-amber-50 text-amber-700",
};

const agentLabels: Record<string, string> = {
  intake: "Email Intake",
  visa_classifier: "Visa Classifier",
  document_reviewer: "Document Reviewer",
  checklist_engine: "Checklist Engine",
};

// ── Action labels ──────────────────────────────────────────────────
const actionLabels: Record<string, string> = {
  classified: "Classified",
  flagged: "Flagged",
  validated: "Validated",
  generated: "Generated",
  detected: "Detected",
};

// ── Status config ──────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-600",
    label: "Completed",
  },
  flagged: {
    icon: AlertTriangle,
    color: "text-amber-500",
    label: "Flagged",
  },
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Pending",
  },
};

// ── Relative time helper ───────────────────────────────────────────
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Check if entry is from today ───────────────────────────────────
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

// ── Activity entry row ─────────────────────────────────────────────
function ActivityRow({ entry, index }: { entry: ActivityEntry; index: number }) {
  const badgeStyle = agentBadgeStyles[entry.agent_type] ?? "";
  const agentLabel = agentLabels[entry.agent_type] ?? entry.agent_type;
  const actionLabel = actionLabels[entry.action] ?? entry.action;
  const status = statusConfig[entry.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-b-0 hover:bg-accent/30 transition-colors"
    >
      {/* Agent badge */}
      <Badge
        variant="outline"
        className={`shrink-0 text-xs font-medium px-2.5 py-0.5 ${badgeStyle}`}
      >
        {agentLabel}
      </Badge>

      {/* Action label */}
      <span className="shrink-0 text-sm font-medium w-[80px]">{actionLabel}</span>

      {/* Client name + subject */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">
            {entry.client_name}
          </span>
          {entry.confidence != null && (
            <span className="shrink-0 text-xs text-muted-foreground/80 tabular-nums">
              {(entry.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {entry.subject}
        </p>
      </div>

      {/* Relative time */}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums w-[72px] text-right">
        {formatRelativeTime(entry.created_at)}
      </span>

      {/* Status indicator */}
      <div className="shrink-0 w-[28px] flex justify-center" title={status.label}>
        <StatusIcon className={`h-4 w-4 ${status.color}`} />
      </div>
    </motion.div>
  );
}

// ── Stats card ─────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  value,
  label,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  index: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
              <Icon className="h-5 w-5 text-primary/70" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function ActivityPage() {
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return mockActivityEntries.filter((entry) => {
      if (agentFilter !== "all" && entry.agent_type !== agentFilter) return false;
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      return true;
    });
  }, [agentFilter, statusFilter]);

  // Stats
  const actionsToday = useMemo(
    () => mockActivityEntries.filter((e) => isToday(e.created_at)).length,
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-heading font-semibold tracking-tight">
            Activity Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI agent actions across all immigration cases
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1"
        >
          Demo Data
        </Badge>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={Zap}
          value={actionsToday}
          label="Actions Today"
          index={0}
        />
        <StatCard
          icon={Clock}
          value="1.2s"
          label="Avg Processing Time"
          index={1}
        />
        <StatCard
          icon={Target}
          value="94.2%"
          label="Accuracy"
          index={2}
        />
        <StatCard
          icon={Eye}
          value={filteredEntries.length}
          label="Items in View"
          index={3}
        />
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4 pb-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters</span>
              </div>

              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="intake">Email Intake</SelectItem>
                  <SelectItem value="visa_classifier">Visa Classifier</SelectItem>
                  <SelectItem value="document_reviewer">Document Reviewer</SelectItem>
                  <SelectItem value="checklist_engine">Checklist Engine</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {(agentFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => {
                    setAgentFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity list */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <Card className="border-border/60 shadow-sm">
          <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Actions</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {filteredEntries.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {filteredEntries.map((entry, idx) => (
                <ActivityRow key={entry.id} entry={entry} index={idx} />
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <Activity className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No matching activity
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try adjusting the filters to see more results.
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
