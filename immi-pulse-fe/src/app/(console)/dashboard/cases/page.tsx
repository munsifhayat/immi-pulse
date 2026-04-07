"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Filter } from "lucide-react";
import { casesService } from "@/lib/api/cases.service";
import { visaSubclasses } from "@/lib/mock-data/immigration-mock";
import type { Case, CaseStage } from "@/lib/types/immigration";
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
const stageColors: Record<string, string> = {
  intake: "bg-slate-100 text-slate-700",
  consultation: "bg-blue-100 text-blue-700",
  checklist_sent: "bg-amber-100 text-amber-700",
  documents_collecting: "bg-amber-100 text-amber-700",
  documents_reviewing: "bg-purple-100 text-purple-700",
  lodgement_ready: "bg-teal-100 text-teal-700",
  lodged: "bg-cyan-100 text-cyan-700",
  granted: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-700",
};

const stageLabels: Record<string, string> = {
  intake: "Intake",
  consultation: "Consultation",
  checklist_sent: "Checklist Sent",
  documents_collecting: "Collecting Docs",
  documents_reviewing: "Reviewing Docs",
  lodgement_ready: "Ready to Lodge",
  lodged: "Lodged",
  granted: "Granted",
  refused: "Refused",
  withdrawn: "Withdrawn",
};

// ── Priority badge colors ───────────────────────────────────
const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
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

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ── Page ────────────────────────────────────────────────────
export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [visaFilter, setVisaFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    casesService.getCases().then(setCases);
  }, []);

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (stageFilter !== "all" && c.stage !== stageFilter) return false;
        if (visaFilter !== "all" && c.visa_subclass !== visaFilter) return false;
        if (priorityFilter !== "all" && c.priority !== priorityFilter)
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [cases, stageFilter, visaFilter, priorityFilter]);

  // ── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = cases.filter(
      (c) => !["granted", "refused", "withdrawn"].includes(c.stage)
    ).length;
    const lodged = cases.filter((c) => c.stage === "lodged").length;
    const granted = cases.filter((c) => c.stage === "granted").length;
    const flagged = cases.filter((c) => c.documents_pending > 0).length;
    return { active, lodged, granted, flagged };
  }, [cases]);

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
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-700 border-purple-200"
          >
            Demo Data
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
                <DialogDescription>
                  New case creation is coming soon. This will allow you to link a
                  client, select a visa subclass, and generate a checklist
                  automatically using AI.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end pt-4">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Close
                  </Button>
                </DialogClose>
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
            <SelectItem value="medium">Medium</SelectItem>
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
                  >
                    {/* Client */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(
                              c.client.first_name,
                              c.client.last_name
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-medium text-foreground">
                          {c.client.first_name} {c.client.last_name}
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

                    {/* Checklist progress */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{
                              width: `${c.checklist_progress}%`,
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-medium text-muted-foreground">
                          {c.checklist_progress}%
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
