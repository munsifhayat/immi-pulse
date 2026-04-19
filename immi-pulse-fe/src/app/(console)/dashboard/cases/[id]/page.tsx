"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Flag,
  Key,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  useCase,
  useCaseDocuments,
  useCaseTimeline,
  useGenerateChecklist,
  useGeneratePortalLink,
  useReviewDocument,
} from "@/lib/api/hooks/cases";
import type {
  CaseChecklistItem,
  CaseOut,
  ChecklistItemStatus,
  DocumentStatus,
} from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

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

const docStatusMeta: Record<
  DocumentStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Processing", color: "bg-slate-100 text-slate-700", icon: Clock },
  validated: {
    label: "Validated",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  flagged: {
    label: "Needs attention",
    color: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const checklistStatusMeta: Record<
  ChecklistItemStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Awaiting upload",
    color: "bg-slate-100 text-slate-700",
    icon: Clock,
  },
  uploaded: {
    label: "Uploaded — awaiting review",
    color: "bg-blue-100 text-blue-700",
    icon: Upload,
  },
  validated: {
    label: "Validated",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  flagged: {
    label: "Needs attention",
    color: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color =
    pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ── AI summary hero ─────────────────────────────────────────
function AISummaryHero({
  summary,
}: {
  summary: NonNullable<CaseOut["ai_summary"]>;
}) {
  return (
    <motion.div variants={fadeUp} custom={2}>
      <Card className="overflow-hidden border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-white">
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/10">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
                AI intake summary
              </p>
              {summary.source_email?.received_at && (
                <p className="text-[11px] text-muted-foreground">
                  Sourced from email &middot;{" "}
                  {formatDateTime(summary.source_email.received_at)}
                </p>
              )}
            </div>
            <p className="text-[14px] leading-relaxed text-foreground">
              {summary.summary}
            </p>

            {summary.proposed_visa_subclass && (
              <div className="rounded-xl border border-border/60 bg-white/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Proposed visa pathway
                    </p>
                    <p className="text-base font-semibold">
                      {summary.proposed_visa_name}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0">
                    Subclass {summary.proposed_visa_subclass}
                  </Badge>
                </div>
                {typeof summary.confidence === "number" && (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Match confidence
                    </p>
                    <ConfidenceMeter value={summary.confidence} />
                  </div>
                )}
                {summary.reasoning && (
                  <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">
                    {summary.reasoning}
                  </p>
                )}
              </div>
            )}

            {summary.key_points?.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {summary.key_points.map((point, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border/50 bg-white px-3 py-2 text-[13px]"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Checklist tab ───────────────────────────────────────────
function ChecklistTab({
  caseId,
  caseData,
  onRefreshCase,
}: {
  caseId: string;
  caseData: CaseOut;
  onRefreshCase: () => void;
}) {
  const generate = useGenerateChecklist(caseId);
  const items: CaseChecklistItem[] = caseData.checklist ?? [];

  const handleGenerate = async () => {
    await generate.mutateAsync({});
    onRefreshCase();
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Wand2 className="mx-auto mb-2 h-6 w-6 text-primary/50" />
        <p className="text-sm font-medium text-foreground">
          No checklist yet for this case.
        </p>
        <p className="mt-1 text-xs">
          Generate the prerequisite document list tailored to{" "}
          {caseData.visa_name ?? "this visa pathway"}.
        </p>
        <Button
          size="sm"
          className="mt-4 gap-1.5"
          onClick={handleGenerate}
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Generate checklist
        </Button>
      </Card>
    );
  }

  const total = items.length;
  const done = items.filter(
    (i) => i.status === "uploaded" || i.status === "validated"
  ).length;
  const flagged = items.filter((i) => i.status === "flagged").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Prerequisite checklist
            </p>
            <p className="mt-0.5 text-base font-semibold">
              {done} of {total} collected
              {flagged > 0 && (
                <span className="ml-2 text-sm font-medium text-amber-600">
                  · {flagged} flagged
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleGenerate}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Regenerate from template
          </Button>
        </div>
        <div className="mt-4">
          <Progress value={percent} className="h-1.5" />
        </div>
      </Card>

      <Card className="divide-y divide-border/60">
        {items.map((item) => {
          const meta = checklistStatusMeta[item.status];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg",
                    item.status === "validated" && "bg-emerald-100",
                    item.status === "flagged" && "bg-amber-100",
                    item.status === "uploaded" && "bg-blue-100",
                    item.status === "pending" && "bg-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      item.status === "validated" && "text-emerald-600",
                      item.status === "flagged" && "text-amber-600",
                      item.status === "uploaded" && "text-blue-600",
                      item.status === "pending" && "text-slate-500"
                    )}
                  />
                </div>
                <div>
                  <p className="text-[13px] font-medium">
                    {item.label}
                    {item.required ? (
                      <span className="ml-1 text-[11px] font-semibold uppercase text-rose-500">
                        Required
                      </span>
                    ) : (
                      <span className="ml-1 text-[11px] font-medium uppercase text-muted-foreground">
                        Optional
                      </span>
                    )}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn("shrink-0 gap-1", meta.color)}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── Portal link modal ───────────────────────────────────────
type PortalResult = {
  url: string;
  pin: string;
  expires_at: string;
  email_sent: boolean;
};

function PortalLinkModal({
  open,
  onOpenChange,
  loading,
  result,
  clientEmail,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  result: PortalResult | null;
  clientEmail?: string | null;
  onGenerate: (sendEmail: boolean) => void;
}) {
  const [copied, setCopied] = useState<"url" | "pin" | null>(null);

  const copy = (text: string, which: "url" | "pin") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Client portal link
          </DialogTitle>
          <DialogDescription>
            Share the URL plus the 6-digit PIN. The PIN is shown once —
            consultants can revoke or regenerate at any time.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating secure link…
          </div>
        ) : result ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
                  {result.url}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => copy(result.url, "url")}
                >
                  {copied === "url" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                6-digit PIN
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-lg font-semibold tracking-[0.5em]">
                  {result.pin}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => copy(result.pin, "pin")}
                >
                  {copied === "pin" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" />
                Expires {formatDateTime(result.expires_at)}
              </p>
              {result.email_sent ? (
                <p className="mt-1 flex items-center gap-1.5 text-emerald-700">
                  <Mail className="h-3.5 w-3.5" /> Delivered to {clientEmail}
                </p>
              ) : clientEmail ? (
                <p className="mt-1 text-muted-foreground">
                  Not sent yet — click &quot;Email to client&quot; to deliver.
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  No client email on file — copy the link manually.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Ready to mint a portal link for this case?
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {!result && !loading && (
            <>
              <Button
                variant="outline"
                onClick={() => onGenerate(false)}
                className="gap-1.5"
              >
                <Key className="h-4 w-4" />
                Generate link only
              </Button>
              <Button
                onClick={() => onGenerate(true)}
                disabled={!clientEmail}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Generate &amp; email to client
              </Button>
            </>
          )}
          {result && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
              {!result.email_sent && clientEmail && (
                <Button
                  className="gap-1.5"
                  onClick={() => onGenerate(true)}
                >
                  <Send className="h-4 w-4" />
                  Email to {clientEmail}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id;
  const router = useRouter();

  const caseQuery = useCase(caseId);
  const documentsQuery = useCaseDocuments(caseId);
  const timelineQuery = useCaseTimeline(caseId);
  const generatePortalLink = useGeneratePortalLink(caseId ?? "");
  const reviewDocument = useReviewDocument(caseId ?? "");
  const generateChecklist = useGenerateChecklist(caseId ?? "");

  const [portalOpen, setPortalOpen] = useState(false);
  const [portalResult, setPortalResult] = useState<PortalResult | null>(null);

  // Default tab: if a case has AI summary, open on Checklist so the demo
  // leans into the next action. Otherwise default to Overview.
  const [tab, setTab] = useState<string>("checklist");

  if (caseQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading case…
      </div>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/cases")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Button>
        <Card className="p-6 text-center text-muted-foreground">
          Case not found or the backend is unreachable.
        </Card>
      </div>
    );
  }

  const caseData: CaseOut = caseQuery.data;

  const openPortalDialog = () => {
    setPortalResult(null);
    setPortalOpen(true);
  };

  const handleGeneratePortal = async (sendEmail: boolean) => {
    const result = await generatePortalLink.mutateAsync({
      send_email: sendEmail,
    });
    setPortalResult({
      url: result.url,
      pin: result.pin,
      expires_at: result.expires_at,
      email_sent: result.email_sent,
    });
  };

  const hasChecklist = (caseData.checklist?.length ?? 0) > 0;
  const documentsCount = documentsQuery.data?.length ?? 0;

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} custom={0}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/cases")}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Button>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {caseData.client_name}
            </h2>
            <Badge
              variant="secondary"
              className={cn(
                "font-semibold",
                stageColors[caseData.stage] ?? "bg-gray-100 text-gray-700"
              )}
            >
              {stageLabels[caseData.stage] ?? caseData.stage}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {caseData.visa_subclass && (
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Subclass {caseData.visa_subclass}
                </Badge>
                <span>{caseData.visa_name}</span>
              </span>
            )}
            {caseData.client_email && <span>&middot; {caseData.client_email}</span>}
            {caseData.source === "email" && (
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Mail className="h-3 w-3" />
                From inbox
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasChecklist && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={generateChecklist.isPending}
              onClick={() => generateChecklist.mutate({})}
            >
              {generateChecklist.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Generate checklist
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={openPortalDialog}>
            <Key className="h-4 w-4" />
            Generate client portal link
          </Button>
        </div>
      </motion.div>

      {caseData.ai_summary && <AISummaryHero summary={caseData.ai_summary} />}

      {/* Tabs */}
      <motion.div variants={fadeUp} custom={3}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="checklist">
              Checklist ({caseData.checklist?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documentsCount})
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            <ChecklistTab
              caseId={caseId ?? ""}
              caseData={caseData}
              onRefreshCase={() => caseQuery.refetch()}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card className="divide-y divide-border/60">
              {documentsQuery.isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading documents…
                </div>
              ) : documentsCount === 0 ? (
                <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">
                    No documents yet
                  </p>
                  <p className="text-xs">
                    Generate a client portal link to let the client upload.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={openPortalDialog}
                  >
                    <Key className="h-4 w-4" /> Generate portal link
                  </Button>
                </div>
              ) : (
                (documentsQuery.data ?? []).map((doc) => {
                  const meta =
                    docStatusMeta[doc.status] ?? docStatusMeta.pending;
                  const Icon = meta.icon;
                  const flags = doc.ai_analysis?.flags ?? [];
                  const suggestions = doc.ai_analysis?.suggestions ?? [];
                  const confidence = doc.ai_analysis?.confidence;
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[13px] font-medium">
                              {doc.file_name}
                            </p>
                            {doc.document_type && (
                              <Badge
                                variant="outline"
                                className="text-[11px] capitalize"
                              >
                                {doc.document_type.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {typeof confidence === "number" && (
                              <span className="text-[11px] text-muted-foreground">
                                AI {Math.round(confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Uploaded {formatDateTime(doc.uploaded_at)} by{" "}
                            {doc.uploaded_by_type}
                          </p>
                          {flags.length > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                AI flags
                              </p>
                              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-amber-800">
                                {flags.map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                              {suggestions.length > 0 && (
                                <>
                                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                                    Suggested action
                                  </p>
                                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-amber-800">
                                    {suggestions.map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          )}
                          {doc.review_notes && (
                            <p className="text-[11px] text-muted-foreground">
                              Consultant note: {doc.review_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn("gap-1 capitalize", meta.color)}
                        >
                          <Icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                        {doc.status !== "validated" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={reviewDocument.isPending}
                            onClick={() =>
                              reviewDocument.mutate({
                                document_id: doc.id,
                                status: "validated",
                              })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Approve
                          </Button>
                        )}
                        {doc.status !== "flagged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={reviewDocument.isPending}
                            onClick={() =>
                              reviewDocument.mutate({
                                document_id: doc.id,
                                status: "flagged",
                              })
                            }
                          >
                            <Flag className="h-3.5 w-3.5 text-amber-600" />
                            Flag
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <Card className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Client name" value={caseData.client_name} />
                <DetailField label="Client email" value={caseData.client_email} />
                <DetailField label="Client phone" value={caseData.client_phone} />
                <DetailField label="Visa" value={caseData.visa_name} />
                <DetailField label="Visa subclass" value={caseData.visa_subclass} />
                <DetailField
                  label="Priority"
                  value={caseData.priority}
                  className="capitalize"
                />
                <DetailField
                  label="Stage"
                  value={stageLabels[caseData.stage] ?? caseData.stage}
                />
                <DetailField
                  label="Source"
                  value={caseData.source}
                  className="capitalize"
                />
                <DetailField
                  label="Created"
                  value={formatDateTime(caseData.created_at)}
                />
                <DetailField
                  label="Last updated"
                  value={formatDateTime(caseData.updated_at)}
                />
              </div>
              {caseData.notes && (
                <div className="mt-6 border-t border-border/60 pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {caseData.notes}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card className="p-6">
              {timelineQuery.isLoading ? (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading timeline…
                </div>
              ) : (timelineQuery.data?.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No events recorded yet.
                </p>
              ) : (
                <ol className="space-y-4">
                  {(timelineQuery.data ?? []).map((ev) => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[13px] font-medium capitalize">
                          {ev.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(ev.created_at)} &middot; {ev.actor_type}
                        </p>
                        {ev.event_payload && (
                          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[10px] text-muted-foreground">
                            {JSON.stringify(ev.event_payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <PortalLinkModal
        open={portalOpen}
        onOpenChange={setPortalOpen}
        loading={generatePortalLink.isPending}
        result={portalResult}
        clientEmail={caseData.client_email ?? undefined}
        onGenerate={handleGeneratePortal}
      />
    </motion.div>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-sm text-foreground", className)}>{value || "—"}</p>
    </div>
  );
}
