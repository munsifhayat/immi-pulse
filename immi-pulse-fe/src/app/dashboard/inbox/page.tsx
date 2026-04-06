"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  invoiceService,
  type InvoiceDetection,
  type InvoiceFilters,
} from "@/lib/api/invoice.service";
import { p1Service, type P1Job, type P1Filters } from "@/lib/api/p1.service";
import {
  emergentWorkService,
  type EmergentWorkItem,
  type EmergentWorkFilters,
} from "@/lib/api/emergent-work.service";
import {
  activityService,
  type ActivityEntry,
} from "@/lib/api/activity.service";
import { configService } from "@/lib/api/config.service";
import {
  complianceService,
  type ComplianceDetection,
} from "@/lib/api/compliance.service";
import {
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Inbox,
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Property-first naming map ─────────────────────────────
const assistantLabels: Record<string, string> = {
  invoice: "Financials",
  p1_classifier: "Urgent Issues",
  emergent_work: "Scope Watch",
};

// ── Shared styles ──────────────────────────────────────────
const badgeStyles: Record<string, string> = {
  invoice: "bg-[oklch(0.80_0.17_165)]/8 text-[oklch(0.80_0.17_165)] border-[oklch(0.80_0.17_165)]/20",
  p1_classifier: "bg-[oklch(0.72_0.19_25)]/8 text-[oklch(0.72_0.19_25)] border-[oklch(0.72_0.19_25)]/20",
  emergent_work: "bg-[oklch(0.75_0.15_300)]/8 text-[oklch(0.75_0.15_300)] border-[oklch(0.75_0.15_300)]/20",
};

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

function ConfidenceBadge({ score }: { score: number }) {
  const pct = (score * 100).toFixed(0);
  const cls = score >= 0.8 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" :
    score >= 0.5 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" :
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", cls)}>{pct}%</span>;
}

// ── ALL tab ────────────────────────────────────────────────
function AllTab({ mailbox }: { mailbox?: string }) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ["inbox-all", mailbox],
    queryFn: () => activityService.getActivity({ limit: 100, mailbox }),
  });

  if (isLoading) return <LoadingState />;
  if (!activity?.length) return <EmptyState message="No operations yet" />;

  return (
    <div className="divide-y divide-border">
      {activity.map((entry) => {
        const label = assistantLabels[entry.agent_name] || entry.agent_name.replace(/_/g, " ");
        return (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", badgeStyles[entry.agent_name] || "bg-muted text-muted-foreground border-border")}>
              {label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">{entry.action}</p>
              {entry.subject && <p className="truncate text-xs text-muted-foreground">{entry.subject}</p>}
            </div>
            {entry.confidence_score !== null && <ConfidenceBadge score={entry.confidence_score} />}
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── FINANCIALS tab (was Invoice) ──────────────────────────
function FinancialsTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [selected, setSelected] = useState<InvoiceDetection | null>(null);

  const { data: detections, isLoading } = useQuery({
    queryKey: ["invoice-detections", filters],
    queryFn: () => invoiceService.getDetections(filters),
  });
  const { data: stats } = useQuery({
    queryKey: ["invoice-stats"],
    queryFn: () => invoiceService.getStats(),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "confirmed" | "rejected" | "moved_manually" }) =>
      invoiceService.reviewDetection(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-detections"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      setSelected(null);
    },
  });

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid gap-3 grid-cols-4">
        {[
          { label: "Total Processed", value: stats?.total_processed ?? "--" },
          { label: "Invoices Detected", value: stats?.invoices_detected ?? "--" },
          { label: "Auto-Filed", value: stats?.moved ?? "--" },
          { label: "Flagged for Review", value: stats?.flagged ?? "--" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Filter by property..." value={filters.mailbox || ""} onChange={(e) => setFilters((f) => ({ ...f, mailbox: e.target.value || undefined }))} className="max-w-[200px] h-9 text-[13px]" />
        <Select value={filters.is_invoice === undefined ? "all" : String(filters.is_invoice)} onValueChange={(v) => setFilters((f) => ({ ...f, is_invoice: v === "all" ? undefined : v === "true" }))}>
          <SelectTrigger className="w-[150px] h-9 text-[13px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Invoices Only</SelectItem>
            <SelectItem value="false">Non-Invoices</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filters.from_date || ""} onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
        <Input type="date" value={filters.to_date || ""} onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
      </div>

      {/* Table */}
      {isLoading ? <LoadingState /> : detections && detections.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">From</TableHead>
                <TableHead className="text-[11px]">Subject</TableHead>
                <TableHead className="text-[11px]">Invoice?</TableHead>
                <TableHead className="text-[11px]">Confidence</TableHead>
                <TableHead className="text-[11px]">Action</TableHead>
                <TableHead className="text-[11px]">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detections.map((d) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(d)}>
                  <TableCell className="text-xs">{new Date(d.received_at).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-[13px]">{d.from_name || d.from_email}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-[13px]">{d.subject}</TableCell>
                  <TableCell>{d.is_invoice ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}</TableCell>
                  <TableCell><ConfidenceBadge score={d.confidence_score} /></TableCell>
                  <TableCell><span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", d.action === "moved" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : d.action === "flagged" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : "bg-muted text-muted-foreground border-border")}>{d.action}</span></TableCell>
                  <TableCell>{d.manually_reviewed ? <Badge variant="outline" className="text-[11px]">{d.review_action}</Badge> : <span className="text-xs text-muted-foreground/40">--</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : <EmptyState message="No financial documents detected yet" />}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto p-0">
          <div className="border-b border-border px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Financial Document Detail</DialogTitle>
            </DialogHeader>
          </div>
          {selected && (
            <div className="space-y-5 px-6 pb-6 pt-2">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">From</p>
                  <p className="text-[15px] font-semibold">{selected.from_name || selected.from_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Property</p>
                  <p className="text-[15px] font-semibold">{selected.mailbox}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Subject</p>
                  <p className="text-[15px] font-semibold">{selected.subject}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Received</p>
                  <p className="text-[15px]">{new Date(selected.received_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Document Type</p>
                  <p className="text-[15px] font-semibold capitalize">{selected.detected_invoice_type || "--"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">Is Invoice</p>
                  <p className="text-lg font-bold">{selected.is_invoice ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">Confidence</p>
                  <p className="text-lg font-bold">{(selected.confidence_score * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">Action</p>
                  <p className="text-lg font-bold capitalize">{selected.action}</p>
                </div>
              </div>

              {selected.attachment_names.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">{selected.attachment_names.map((name, i) => <Badge key={i} variant="outline" className="text-[13px] px-3 py-1">{name}</Badge>)}</div>
                </div>
              )}

              {selected.ai_reasoning && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">AI Reasoning</p>
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-[14px] leading-relaxed">{selected.ai_reasoning}</p>
                  </div>
                </div>
              )}

              {!selected.manually_reviewed && (
                <div className="flex gap-3 pt-1">
                  <Button onClick={() => reviewMutation.mutate({ id: selected.id, action: "confirmed" })} disabled={reviewMutation.isPending} className="h-10 px-5"><CheckCircle className="mr-2 h-4 w-4" />Confirm</Button>
                  <Button variant="destructive" onClick={() => reviewMutation.mutate({ id: selected.id, action: "rejected" })} disabled={reviewMutation.isPending} className="h-10 px-5"><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                  <Button variant="outline" onClick={() => reviewMutation.mutate({ id: selected.id, action: "moved_manually" })} disabled={reviewMutation.isPending} className="h-10 px-5"><ArrowRight className="mr-2 h-4 w-4" />File Manually</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── URGENT ISSUES tab (was P1) ───────────────────────────
const priorityColors: Record<string, string> = {
  p1: "bg-red-600 text-white",
  p2: "bg-orange-500 text-white",
  p3: "bg-yellow-500 text-black",
  p4: "bg-gray-400 text-white",
};
const priorityLabels: Record<string, string> = {
  p1: "Critical",
  p2: "High",
  p3: "Medium",
  p4: "Low",
};
const issueStatusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  responded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  resolved: "bg-muted text-muted-foreground border-border",
  escalated: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function UrgentIssuesTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<P1Filters>({});
  const [selected, setSelected] = useState<P1Job | null>(null);
  const [subTab, setSubTab] = useState<"issues" | "summary">("issues");

  const { data: jobs, isLoading } = useQuery({ queryKey: ["p1-jobs", filters], queryFn: () => p1Service.getJobs(filters) });
  const { data: stats } = useQuery({ queryKey: ["p1-stats"], queryFn: () => p1Service.getStats() });
  const { data: todaySummary } = useQuery({ queryKey: ["p1-summary-today"], queryFn: () => p1Service.getTodaySummary() });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "responded" | "resolved" | "escalated" }) => p1Service.updateJobStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["p1-jobs"] }); queryClient.invalidateQueries({ queryKey: ["p1-stats"] }); setSelected(null); },
  });

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid gap-3 grid-cols-4">
        {[
          { label: "Open Issues", value: stats?.total_p1 ?? "--" },
          { label: "Resolved in SLA", value: stats?.responded_in_sla ?? "--" },
          { label: "Overdue", value: stats?.overdue ?? "--", danger: true },
          { label: "Avg Resolution", value: stats?.avg_response_time ? formatDuration(stats.avg_response_time) : "--" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className={cn("text-xl font-bold", s.danger ? "text-destructive" : "text-foreground")}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setSubTab("issues")} className={cn("cursor-pointer px-3 py-1 text-[13px] font-medium rounded-md transition-colors", subTab === "issues" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Issues</button>
        <button onClick={() => setSubTab("summary")} className={cn("cursor-pointer px-3 py-1 text-[13px] font-medium rounded-md transition-colors", subTab === "summary" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Daily Summary</button>
      </div>

      {subTab === "issues" ? (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filters.priority || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[140px] h-9 text-[13px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="p1">Critical</SelectItem>
                <SelectItem value="p2">High</SelectItem>
                <SelectItem value="p3">Medium</SelectItem>
                <SelectItem value="p4">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[140px] h-9 text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filters.from_date || ""} onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
            <Input type="date" value={filters.to_date || ""} onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
          </div>

          {isLoading ? <LoadingState /> : jobs && jobs.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Tenant / Client</TableHead>
                    <TableHead className="text-[11px]">Property</TableHead>
                    <TableHead className="text-[11px]">Subject</TableHead>
                    <TableHead className="text-[11px]">Severity</TableHead>
                    <TableHead className="text-[11px]">SLA</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(job)}>
                      <TableCell className="text-xs">{new Date(job.received_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-[13px]">{job.client_name || "--"}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-[13px]">{job.contract_location || "--"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-[13px]">{job.subject}</TableCell>
                      <TableCell><Badge className={priorityColors[job.priority] || ""}>{priorityLabels[job.priority] || job.priority.toUpperCase()}</Badge></TableCell>
                      <TableCell>
                        {job.is_urgent && (job.is_overdue ? (
                          <Badge variant="destructive" className="text-[11px]"><AlertTriangle className="mr-1 h-3 w-3" />Overdue</Badge>
                        ) : job.is_responded ? (
                          <span className="inline-flex items-center rounded-full border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium"><CheckCircle className="mr-1 h-3 w-3" />In SLA</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><Clock className="mr-1 h-3 w-3" />Tracking</span>
                        ))}
                      </TableCell>
                      <TableCell><span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", issueStatusColors[job.status] || "")}>{job.status}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <EmptyState message="No urgent issues found" />}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5">
          {todaySummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xl font-bold">{todaySummary.total_p1_jobs}</p>
                  <p className="text-[11px] text-muted-foreground">Total Issues</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xl font-bold">{todaySummary.responded_count}</p>
                  <p className="text-[11px] text-muted-foreground">Responded</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xl font-bold text-destructive">{todaySummary.overdue_count}</p>
                  <p className="text-[11px] text-muted-foreground">Overdue</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">{todaySummary.summary_text}</p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No summary generated yet. The daily summary runs at 4pm AEST.</p>
          )}
        </div>
      )}

      {/* Issue Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto p-0">
          <div className="border-b border-border px-6 py-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-semibold">Issue Detail</DialogTitle>
                <Badge className={cn("text-[13px] px-3 py-0.5", priorityColors[selected?.priority || ""] || "")}>{priorityLabels[selected?.priority || ""] || selected?.priority?.toUpperCase()}</Badge>
              </div>
            </DialogHeader>
          </div>
          {selected && (
            <div className="space-y-5 px-6 pb-6 pt-2">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">From</p>
                  <p className="text-[15px] font-semibold">{selected.from_name || selected.from_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Tenant / Client</p>
                  <p className="text-[15px] font-semibold">{selected.client_name || "--"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Property</p>
                  <p className="text-[15px]">{selected.contract_location || "--"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Category</p>
                  <p className="text-[15px]">{selected.category || "--"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">Status</p>
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold capitalize", issueStatusColors[selected.status] || "")}>{selected.status}</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">Received</p>
                  <p className="text-[14px] font-semibold">{new Date(selected.received_at).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[13px] text-muted-foreground mb-1.5">SLA Deadline</p>
                  <p className="text-[14px] font-semibold">{selected.response_deadline ? new Date(selected.response_deadline).toLocaleString() : "--"}</p>
                </div>
              </div>

              {selected.ai_summary && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Summary</p>
                  <p className="text-[14px] leading-relaxed">{selected.ai_summary}</p>
                </div>
              )}

              {selected.job_description && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Issue Description</p>
                  <p className="text-[14px] leading-relaxed">{selected.job_description}</p>
                </div>
              )}

              {selected.ai_reasoning && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">AI Reasoning</p>
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-[14px] leading-relaxed">{selected.ai_reasoning}</p>
                  </div>
                </div>
              )}

              {selected.status === "open" && (
                <div className="flex gap-3 pt-1">
                  <Button onClick={() => statusMutation.mutate({ id: selected.id, status: "responded" })} disabled={statusMutation.isPending} className="h-10 px-5">Mark Responded</Button>
                  <Button variant="outline" onClick={() => statusMutation.mutate({ id: selected.id, status: "resolved" })} disabled={statusMutation.isPending} className="h-10 px-5">Resolved</Button>
                  <Button variant="destructive" onClick={() => statusMutation.mutate({ id: selected.id, status: "escalated" })} disabled={statusMutation.isPending} className="h-10 px-5">Escalate</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SCOPE WATCH tab (was Emergent Work) ──────────────────
const scopeStatusColors: Record<string, string> = {
  detected: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  raised: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  dismissed: "bg-muted text-muted-foreground border-border",
};

function ScopeWatchTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EmergentWorkFilters>({});
  const [selected, setSelected] = useState<EmergentWorkItem | null>(null);
  const [subTab, setSubTab] = useState<"items" | "reports">("items");

  const { data: items, isLoading } = useQuery({ queryKey: ["emergent-work-items", filters], queryFn: () => emergentWorkService.getItems(filters) });
  const { data: stats } = useQuery({ queryKey: ["emergent-work-stats"], queryFn: () => emergentWorkService.getStats() });
  const { data: reports } = useQuery({ queryKey: ["emergent-work-reports"], queryFn: () => emergentWorkService.getReports() });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "raised" | "resolved" | "dismissed" }) => emergentWorkService.updateItemStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["emergent-work-items"] }); queryClient.invalidateQueries({ queryKey: ["emergent-work-stats"] }); setSelected(null); },
  });

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid gap-3 grid-cols-4">
        {[
          { label: "Scope Alerts", value: stats?.total_detected ?? "--" },
          { label: "Raised with Client", value: stats?.raised ?? "--" },
          { label: "Resolved", value: stats?.resolved ?? "--" },
          { label: "Dismissed", value: stats?.dismissed ?? "--" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button onClick={() => setSubTab("items")} className={cn("cursor-pointer px-3 py-1 text-[13px] font-medium rounded-md transition-colors", subTab === "items" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Alerts</button>
        <button onClick={() => setSubTab("reports")} className={cn("cursor-pointer px-3 py-1 text-[13px] font-medium rounded-md transition-colors", subTab === "reports" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Reports</button>
      </div>

      {subTab === "items" ? (
        <>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Filter by client..." value={filters.client || ""} onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value || undefined }))} className="max-w-[200px] h-9 text-[13px]" />
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[140px] h-9 text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="detected">Detected</SelectItem>
                <SelectItem value="raised">Raised</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filters.from_date || ""} onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
            <Input type="date" value={filters.to_date || ""} onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value || undefined }))} className="w-[150px] h-9 text-[13px]" />
          </div>

          {isLoading ? <LoadingState /> : items && items.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px]">Client</TableHead>
                    <TableHead className="text-[11px]">Contract</TableHead>
                    <TableHead className="text-[11px]">Scope Deviation</TableHead>
                    <TableHead className="text-[11px]">Confidence</TableHead>
                    <TableHead className="text-[11px]">Evidence</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(item)}>
                      <TableCell className="text-[13px]">{item.client_name || "--"}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-[13px]">{item.contract_reference || "--"}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-[13px]">{item.emergent_work_description || item.subject}</TableCell>
                      <TableCell><ConfidenceBadge score={item.confidence_score} /></TableCell>
                      <TableCell className="text-[13px]">{item.supporting_evidence?.length || 0} items</TableCell>
                      <TableCell><span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", scopeStatusColors[item.status] || "")}>{item.status}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <EmptyState message="No scope deviations detected" />}
        </>
      ) : (
        <div className="space-y-3">
          {reports && reports.length > 0 ? reports.map((report) => (
            <div key={report.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Scope Analysis -- {new Date(report.report_time).toLocaleString()}</span>
                <Badge variant="outline" className="text-[11px]">{report.items_detected} alerts</Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{report.summary_text}</p>
            </div>
          )) : <EmptyState message="No scope analysis reports yet. AI scans contractor communications every 2 hours." />}
        </div>
      )}

      {/* Scope Alert Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto p-0">
          <div className="border-b border-border px-6 py-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-semibold">Scope Alert Detail</DialogTitle>
                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold capitalize", scopeStatusColors[selected?.status || ""] || "")}>{selected?.status}</span>
              </div>
            </DialogHeader>
          </div>
          {selected && (
            <div className="space-y-5 px-6 pb-6 pt-2">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Client</p>
                  <p className="text-[15px] font-semibold">{selected.client_name || "--"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Contract</p>
                  <p className="text-[15px] font-semibold">{selected.contract_reference || "--"}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Subject</p>
                  <p className="text-[15px] font-semibold">{selected.subject}</p>
                </div>
              </div>

              <Separator />

              {selected.original_scope_summary && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Original Scope</p>
                  <p className="text-[14px] leading-relaxed">{selected.original_scope_summary}</p>
                </div>
              )}

              {selected.emergent_work_description && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Scope Deviation</p>
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-[14px] leading-relaxed">{selected.emergent_work_description}</p>
                  </div>
                </div>
              )}

              {selected.recommended_action && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Recommended Action</p>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-[14px] leading-relaxed">{selected.recommended_action}</p>
                  </div>
                </div>
              )}

              {selected.supporting_evidence && selected.supporting_evidence.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Supporting Evidence</p>
                  <div className="space-y-2.5">{selected.supporting_evidence.map((ev, i) => (
                    <div key={i} className="rounded-xl border border-border p-4">
                      <Badge variant="outline" className="mb-2 text-[12px] px-2.5 py-0.5">{ev.source}</Badge>
                      <p className="text-[14px] leading-relaxed text-muted-foreground">{ev.detail}</p>
                    </div>
                  ))}</div>
                </div>
              )}

              {selected.processed_attachments && selected.processed_attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground mb-2">Processed Documents</p>
                    <div className="space-y-2">{selected.processed_attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <Badge variant="outline" className="text-[12px] px-2.5 py-0.5">{att.type}</Badge>
                        <span className="text-[14px] font-medium">{att.name}</span>
                      </div>
                    ))}</div>
                  </div>
                </>
              )}

              {selected.ai_reasoning && (
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">AI Reasoning</p>
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-[14px] leading-relaxed">{selected.ai_reasoning}</p>
                  </div>
                </div>
              )}

              {selected.status === "detected" && (
                <div className="flex gap-3 pt-1">
                  <Button onClick={() => statusMutation.mutate({ id: selected.id, status: "raised" })} disabled={statusMutation.isPending} className="h-10 px-5">Raise with Client</Button>
                  <Button variant="outline" onClick={() => statusMutation.mutate({ id: selected.id, status: "resolved" })} disabled={statusMutation.isPending} className="h-10 px-5">Mark Resolved</Button>
                  <Button variant="ghost" onClick={() => statusMutation.mutate({ id: selected.id, status: "dismissed" })} disabled={statusMutation.isPending} className="h-10 px-5">Dismiss</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-3" />
      <span className="text-sm">Loading...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Building2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Compliance Tab ────────────────────────────────────────
const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  smoke_alarm: "Smoke Alarms",
  electrical_safety: "Electrical / RCD",
  pool_barrier: "Pool Barriers",
  gas_safety: "Gas Safety",
  fire_safety: "Fire Safety",
  insurance: "Insurance",
  council_notice: "Council Notice",
  body_corporate: "Body Corporate",
  contractor_compliance: "Contractor",
  minimum_standards: "Min. Standards",
  water_efficiency: "Water Efficiency",
  blind_cord_safety: "Blind Cords",
  asbestos: "Asbestos",
  pest_inspection: "Pest Inspection",
  energy_efficiency: "Energy Efficiency",
  general_compliance: "General",
};

const complianceBadgeStyle =
  "border-[oklch(0.65_0.15_180)]/30 bg-[oklch(0.65_0.15_180)]/8 text-[oklch(0.65_0.15_180)]";

function ComplianceTab() {
  const { data: detections, isLoading } = useQuery({
    queryKey: ["compliance-detections-inbox"],
    queryFn: () => complianceService.getDetections({ limit: 100 }),
  });

  if (isLoading) return <EmptyState message="Loading compliance detections..." />;

  if (!detections || detections.length === 0) {
    return <EmptyState message="Compliance signals from incoming emails will appear here." />;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] w-[140px]">Date</TableHead>
            <TableHead className="text-[11px]">Type</TableHead>
            <TableHead className="text-[11px]">Subject</TableHead>
            <TableHead className="text-[11px] w-[100px]">Status</TableHead>
            <TableHead className="text-[11px] w-[80px]">Urgency</TableHead>
            <TableHead className="text-[11px] w-[60px]">State</TableHead>
            <TableHead className="text-[11px] w-[80px]">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detections.map((d) => (
            <TableRow key={d.id} className="group">
              <TableCell className="text-[12px] text-muted-foreground">
                {new Date(d.received_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-[10px]", complianceBadgeStyle)}>
                  {COMPLIANCE_TYPE_LABELS[d.compliance_type] || d.compliance_type}
                </Badge>
              </TableCell>
              <TableCell className="text-[12px] max-w-[300px] truncate">
                {d.subject}
              </TableCell>
              <TableCell>
                <span className={cn("text-[11px] font-medium capitalize", {
                  "text-emerald-600 dark:text-emerald-400": d.status === "compliant",
                  "text-red-600 dark:text-red-400": d.status === "non_compliant" || d.status === "expired",
                  "text-amber-600 dark:text-amber-400": d.status === "expiring",
                  "text-orange-600 dark:text-orange-400": d.status === "action_required",
                  "text-muted-foreground": d.status === "information",
                })}>
                  {d.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-[10px]", {
                  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400": d.urgency === "critical",
                  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400": d.urgency === "high",
                  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400": d.urgency === "medium",
                })}>
                  {d.urgency}
                </Badge>
              </TableCell>
              <TableCell className="text-[11px] text-muted-foreground">
                {d.jurisdiction && d.jurisdiction !== "unknown" ? d.jurisdiction : "—"}
              </TableCell>
              <TableCell className="text-[12px] text-right font-mono">
                {(d.confidence_score * 100).toFixed(0)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Inbox Page ────────────────────────────────────────
export default function InboxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") || "all";
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all");

  const { data: mailboxes } = useQuery({
    queryKey: ["active-mailboxes"],
    queryFn: () => configService.getActiveMailboxes(),
  });

  const mailboxParam = selectedMailbox === "all" ? undefined : selectedMailbox;

  return (
    <div className="space-y-4">
      {/* Top filter bar */}
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {mailboxes && mailboxes.length > 0 && (
          <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
            <SelectTrigger className="w-[240px] h-9 text-[13px]">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {mailboxes.map((mb) => (
                <SelectItem key={mb.id} value={mb.email}>{mb.display_name || mb.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} onValueChange={(v) => router.replace(`/dashboard/inbox?tab=${v}`, { scroll: false })}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="text-[13px]">All</TabsTrigger>
          <TabsTrigger value="financials" className="text-[13px]">
            <DollarSign className="mr-1.5 h-3.5 w-3.5" />Financials
          </TabsTrigger>
          <TabsTrigger value="urgent" className="text-[13px]">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Urgent Issues
          </TabsTrigger>
          <TabsTrigger value="scope" className="text-[13px]">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />Scope Watch
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-[13px]">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <AllTab mailbox={mailboxParam} />
          </div>
        </TabsContent>

        <TabsContent value="financials">
          <FinancialsTab />
        </TabsContent>

        <TabsContent value="urgent">
          <UrgentIssuesTab />
        </TabsContent>

        <TabsContent value="scope">
          <ScopeWatchTab />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
