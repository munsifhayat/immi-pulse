"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Filter, Loader2 } from "lucide-react";
import { visaSubclasses } from "@/lib/mock-data/immigration-mock";
import { useCases, useCreateCase } from "@/lib/api/hooks/cases";
import type { CaseOut, CaseStage } from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ── Stage labels & colors ───────────────────────────────────
// Keys mirror backend CASE_STAGES and frontend CaseStage in immigration.ts.
const stageColors: Record<string, string> = {
  inquiry: "bg-slate-100 text-slate-700",
  consultation: "bg-blue-100 text-blue-700",
  visa_pathway: "bg-indigo-100 text-indigo-700",
  checklist: "bg-amber-100 text-amber-700",
  document_collection: "bg-amber-100 text-amber-700",
  document_review: "bg-purple-100 text-purple-700",
  application_prep: "bg-teal-100 text-teal-700",
  lodgement: "bg-cyan-100 text-cyan-700",
  post_lodgement: "bg-sky-100 text-sky-700",
  decision: "bg-emerald-100 text-emerald-700",
};

const stageLabels: Record<string, string> = {
  inquiry: "Inquiry",
  consultation: "Consultation",
  visa_pathway: "Visa Pathway",
  checklist: "Checklist",
  document_collection: "Collecting Docs",
  document_review: "Reviewing Docs",
  application_prep: "Application Prep",
  lodgement: "Lodged",
  post_lodgement: "Post-Lodgement",
  decision: "Decision",
};

// ── Priority badge colors ───────────────────────────────────
const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-700",
};

// ── Helpers ─────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${diffMonths}mo ago`;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// Placeholder progress derivation — weights stage index over the 10 steps.
// Replaced when checklist-item tracking ships.
const STAGE_ORDER: CaseStage[] = [
  "inquiry",
  "consultation",
  "visa_pathway",
  "checklist",
  "document_collection",
  "document_review",
  "application_prep",
  "lodgement",
  "post_lodgement",
  "decision",
];

function getChecklistProgress(c: CaseOut): number {
  const idx = STAGE_ORDER.indexOf(c.stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

// ── Page ────────────────────────────────────────────────────
export default function CasesPage() {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [visaFilter, setVisaFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // ── New Case dialog state ──
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseEmail, setNewCaseEmail] = useState("");
  const [newCaseVisa, setNewCaseVisa] = useState<string>("");

  const casesQuery = useCases({
    stage: stageFilter === "all" ? undefined : (stageFilter as CaseStage),
    priority:
      priorityFilter === "all" ? undefined : (priorityFilter as CaseOut["priority"]),
    visa_subclass: visaFilter === "all" ? undefined : visaFilter,
  });
  const createCase = useCreateCase();

  const cases = useMemo<CaseOut[]>(() => casesQuery.data ?? [], [casesQuery.data]);

  const filteredCases = useMemo(() => {
    return [...cases].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [cases]);

  // ── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = cases.filter((c) => c.stage !== "decision").length;
    const lodged = cases.filter(
      (c) => c.stage === "lodgement" || c.stage === "post_lodgement"
    ).length;
    const granted = cases.filter((c) => c.stage === "decision").length;
    const flagged = cases.filter((c) => c.documents_pending > 0).length;
    return { active, lodged, granted, flagged };
  }, [cases]);

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;
    const visaSub = visaSubclasses.find((v) => v.code === newCaseVisa);
    await createCase.mutateAsync({
      client_name: newCaseName.trim(),
      client_email: newCaseEmail.trim() || undefined,
      visa_subclass: visaSub?.code,
      visa_name: visaSub?.name,
      stage: "inquiry",
      priority: "normal",
    });
    setNewCaseName("");
    setNewCaseEmail("");
    setNewCaseVisa("");
    setNewCaseOpen(false);
  };

  const statItems = [
    {
      label: "Active Cases",
      value: stats.active,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Lodged",
      value: stats.lodged,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      label: "Granted",
      value: stats.granted,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Flagged Issues",
      value: stats.flagged,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        custom={0}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Cases
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage all visa applications and case progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {casesQuery.isLoading && (
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200 gap-1"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading
            </Badge>
          )}
          {casesQuery.isError && (
            <Badge
              variant="secondary"
              className="bg-red-50 text-red-700 border-red-200"
            >
              API error
            </Badge>
          )}
          <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new case</DialogTitle>
                <DialogDescription>
                  Create a case manually. It will start in the Inquiry stage so
                  you can send the client a portal link and collect documents.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Client name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="Priya Sharma"
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Client email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="priya@example.com"
                    value={newCaseEmail}
                    onChange={(e) => setNewCaseEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Visa subclass
                  </label>
                  <Select value={newCaseVisa} onValueChange={setNewCaseVisa}>
                    <SelectTrigger className="w-full h-9 text-[13px]">
                      <SelectValue placeholder="Select a visa subclass" />
                    </SelectTrigger>
                    <SelectContent>
                      {visaSubclasses.map((v) => (
                        <SelectItem key={v.code} value={v.code}>
                          {v.code} — {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  size="sm"
                  disabled={!newCaseName.trim() || createCase.isPending}
                  onClick={handleCreateCase}
                >
                  {createCase.isPending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Create case
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        variants={fadeUp}
        custom={1}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statItems.map((item) => (
          <Card
            key={item.label}
            className="border-border/60 shadow-sm p-5 flex items-center gap-4"
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                item.bg
              )}
            >
              <span className={cn("text-lg font-bold", item.color)}>
                {item.value}
              </span>
            </div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {item.label}
            </p>
          </Card>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        variants={fadeUp}
        custom={2}
        className="flex flex-wrap items-center gap-3"
      >
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px] h-9 text-[13px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(stageLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visaFilter} onValueChange={setVisaFilter}>
          <SelectTrigger className="w-[220px] h-9 text-[13px]">
            <SelectValue placeholder="Visa Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visa Types</SelectItem>
            {visaSubclasses.map((v) => (
              <SelectItem key={v.code} value={v.code}>
                {v.code} — {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-9 text-[13px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {(stageFilter !== "all" ||
          visaFilter !== "all" ||
          priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => {
              setStageFilter("all");
              setVisaFilter("all");
              setPriorityFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </motion.div>

      {/* Cases Table */}
      <motion.div variants={fadeUp} custom={3}>
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Client</TableHead>
                <TableHead className="text-xs font-semibold">Visa</TableHead>
                <TableHead className="text-xs font-semibold">Stage</TableHead>
                <TableHead className="text-xs font-semibold">
                  Priority
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Checklist
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Documents
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/dashboard/cases/${c.id}`)}
                  >
                    {/* Client */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(c.client_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-medium text-foreground">
                          {c.client_name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Visa */}
                    <TableCell>
                      <span className="text-[13px] text-foreground">
                        {c.visa_subclass}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {" "}
                        — {c.visa_name}
                      </span>
                    </TableCell>

                    {/* Stage */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          stageColors[c.stage] ?? "bg-gray-100 text-gray-700"
                        )}
                      >
                        {stageLabels[c.stage] ?? c.stage}
                      </span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                          priorityColors[c.priority] ??
                            "bg-gray-100 text-gray-700"
                        )}
                      >
                        {c.priority}
                      </span>
                    </TableCell>

                    {/* Checklist progress — derived placeholder until the
                        backend tracks checklist items in Phase 2+. */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${getChecklistProgress(c)}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-medium text-muted-foreground">
                          {getChecklistProgress(c)}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Documents */}
                    <TableCell>
                      <span className="text-[13px] text-foreground">
                        {c.documents_count} docs
                      </span>
                      {c.documents_pending > 0 && (
                        <span className="text-[13px] text-amber-600">
                          {" "}
                          &middot; {c.documents_pending} pending
                        </span>
                      )}
                    </TableCell>

                    {/* Updated */}
                    <TableCell className="text-right">
                      <span className="text-[12px] text-muted-foreground">
                        {formatRelativeTime(c.updated_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <FolderKanban className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm">No cases match the current filters</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </motion.div>
  );
}
