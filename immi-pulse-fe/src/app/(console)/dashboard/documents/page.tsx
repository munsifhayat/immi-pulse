"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { documentsService } from "@/lib/api/documents.service";
import type { CaseDocument, DocumentStatus } from "@/lib/types/immigration";
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  File,
  Eye,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

// ── Relative time helper ────────────────────────────────────────
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

// ── Status badge config ─────────────────────────────────────────
const statusConfig: Record<string, { color: string; label: string }> = {
  validated: { color: "bg-emerald-100 text-emerald-700", label: "Validated" },
  flagged: { color: "bg-amber-100 text-amber-700", label: "Flagged" },
  pending: { color: "bg-gray-100 text-gray-600", label: "Pending" },
  rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
};

// ── Sort priority: flagged > pending > validated > rejected ─────
const statusSortOrder: Record<string, number> = {
  flagged: 0,
  pending: 1,
  validated: 2,
  rejected: 3,
};

// ── Filter config ───────────────────────────────────────────────
const filterOptions: { value: DocumentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "validated", label: "Validated" },
  { value: "flagged", label: "Flagged" },
];

// ── Status badge component ──────────────────────────────────────
function StatusBadge({ doc }: { doc: CaseDocument }) {
  const config = statusConfig[doc.status] ?? statusConfig.pending;
  const confidence = doc.ai_validation?.confidence;
  const pct = confidence ? `${Math.round(confidence * 100)}%` : null;

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {doc.status === "validated" && <CheckCircle className="h-3 w-3" />}
      {doc.status === "flagged" && <AlertTriangle className="h-3 w-3" />}
      {doc.status === "pending" && <Clock className="h-3 w-3" />}
      {config.label}
      {pct && ` (${pct})`}
    </span>
  );

  // Show tooltip with issues for flagged documents
  if (
    doc.status === "flagged" &&
    doc.ai_validation?.issues &&
    doc.ai_validation.issues.length > 0
  ) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badgeContent}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-foreground text-background"
        >
          <p className="mb-1 font-semibold text-xs">AI Issues Found:</p>
          <ul className="list-disc pl-3 space-y-0.5">
            {doc.ai_validation.issues.map((issue, i) => (
              <li key={i} className="text-xs leading-relaxed">
                {issue}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badgeContent;
}

// ── Main page component ─────────────────────────────────────────
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [filter, setFilter] = useState<DocumentStatus | "all">("all");
  const [stats, setStats] = useState({
    pending: 0,
    validated: 0,
    flagged: 0,
    total: 0,
  });

  useEffect(() => {
    documentsService.getDocuments().then(setDocuments);
    documentsService.getDocumentStats().then(setStats);
  }, []);

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? documents
        : documents.filter((d) => d.status === filter);
    return [...base].sort(
      (a, b) =>
        (statusSortOrder[a.status] ?? 99) - (statusSortOrder[b.status] ?? 99)
    );
  }, [documents, filter]);

  // ── Stat cards config ───────────────────────────────────────
  const statCards = [
    {
      label: "Pending Review",
      value: stats.pending,
      icon: Clock,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      label: "AI Validated",
      value: stats.validated,
      icon: FileCheck,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Flagged Issues",
      value: stats.flagged,
      icon: AlertTriangle,
      iconColor: "text-red-500",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        className="space-y-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={0}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              AI-assisted document review queue for all active cases
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-purple-300 bg-purple-50 text-purple-700"
          >
            Demo Data
          </Badge>
        </motion.div>

        {/* ── Stats bar ──────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={1}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {statCards.map((card) => (
            <Card
              key={card.label}
              className="border-border/60 shadow-sm"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Filter tabs ────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          custom={2}
          className="flex items-center gap-2"
        >
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(opt.value)}
              className={
                filter === opt.value
                  ? ""
                  : "border-border/60 text-muted-foreground"
              }
            >
              {opt.label}
              {opt.value !== "all" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {opt.value === "pending"
                    ? stats.pending
                    : opt.value === "validated"
                      ? stats.validated
                      : stats.flagged}
                </span>
              )}
            </Button>
          ))}
        </motion.div>

        {/* ── Documents table ────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={3}>
          <Card className="border-border/60 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>AI Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No documents found for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      {/* Document */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">
                            {doc.file_name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Case */}
                      <TableCell>
                        {doc.case_ref ? (
                          <span className="text-sm text-muted-foreground">
                            {doc.case_ref.client_name}{" "}
                            <span className="mx-1 opacity-40">&middot;</span>
                            Visa {doc.case_ref.visa_subclass}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <span className="text-sm">{doc.document_type}</span>
                      </TableCell>

                      {/* Uploaded */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(doc.uploaded_at)}
                        </span>
                      </TableCell>

                      {/* AI Status */}
                      <TableCell>
                        <StatusBadge doc={doc} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}
