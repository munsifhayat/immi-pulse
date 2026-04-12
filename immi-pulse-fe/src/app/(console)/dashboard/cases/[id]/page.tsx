"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  FileText,
  Key,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  useCase,
  useCaseDocuments,
  useCaseTimeline,
  useGeneratePortalLink,
  useReviewDocument,
} from "@/lib/api/hooks/cases";
import type { CaseOut } from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ── Stage labels (mirrors dashboard/cases/page.tsx) ─────────
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

const docStatusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  validated: "bg-emerald-100 text-emerald-700",
  flagged: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id;
  const router = useRouter();

  const caseQuery = useCase(caseId);
  const documentsQuery = useCaseDocuments(caseId);
  const timelineQuery = useCaseTimeline(caseId);
  const generatePortalLink = useGeneratePortalLink(caseId ?? "");
  const reviewDocument = useReviewDocument(caseId ?? "");

  const [portalResult, setPortalResult] = useState<{
    url: string;
    pin: string;
    expires_at: string;
  } | null>(null);

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

  const handleGeneratePortalLink = async () => {
    const result = await generatePortalLink.mutateAsync({ send_email: false });
    setPortalResult({ url: result.url, pin: result.pin, expires_at: result.expires_at });
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

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
          <h2 className="text-2xl font-bold tracking-tight">
            {caseData.client_name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {caseData.visa_subclass && (
              <span>
                {caseData.visa_subclass} — {caseData.visa_name}
              </span>
            )}
            {caseData.client_email && <span>· {caseData.client_email}</span>}
            <span>
              ·{" "}
              <Badge
                variant="secondary"
                className={cn(
                  "font-semibold",
                  stageColors[caseData.stage] ?? "bg-gray-100 text-gray-700"
                )}
              >
                {stageLabels[caseData.stage] ?? caseData.stage}
              </Badge>
            </span>
          </div>
        </div>

        <Dialog
          open={!!portalResult || generatePortalLink.isPending}
          onOpenChange={(open) => {
            if (!open) setPortalResult(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleGeneratePortalLink}
              disabled={generatePortalLink.isPending}
            >
              {generatePortalLink.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Generate client portal link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client portal link</DialogTitle>
              <DialogDescription>
                Share the URL and PIN with the client. Anyone with both can
                upload documents until the link expires.
              </DialogDescription>
            </DialogHeader>
            {portalResult ? (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    URL
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
                      {portalResult.url}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => copyToClipboard(portalResult.url)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    6-digit PIN
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2 text-lg font-semibold tracking-widest">
                      {portalResult.pin}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => copyToClipboard(portalResult.pin)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  The PIN is only shown once. Expires{" "}
                  {formatDateTime(portalResult.expires_at)}.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} custom={2}>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documentsQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview */}
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
                  label="Created"
                  value={formatDateTime(caseData.created_at)}
                />
                <DetailField
                  label="Last updated"
                  value={formatDateTime(caseData.updated_at)}
                />
                <DetailField
                  label="Lodgement date"
                  value={formatDateTime(caseData.lodgement_date)}
                />
                <DetailField
                  label="Decision date"
                  value={formatDateTime(caseData.decision_date)}
                />
                <DetailField label="Source" value={caseData.source} />
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

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <Card className="divide-y divide-border/60">
              {documentsQuery.isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading documents…
                </div>
              ) : (documentsQuery.data?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm">No documents yet.</p>
                  <p className="text-xs">
                    Generate a client portal link to let the client upload.
                  </p>
                </div>
              ) : (
                (documentsQuery.data ?? []).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{doc.file_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {doc.document_type ?? "Unknown type"} · Uploaded{" "}
                          {formatDateTime(doc.uploaded_at)}
                        </p>
                        {doc.ai_analysis?.flags?.length ? (
                          <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-700">
                            {doc.ai_analysis.flags.slice(0, 3).map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize",
                          docStatusColors[doc.status] ?? "bg-gray-100 text-gray-700"
                        )}
                      >
                        {doc.status}
                      </Badge>
                      {doc.status !== "validated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewDocument.isPending}
                          onClick={() =>
                            reviewDocument.mutate({
                              document_id: doc.id,
                              status: "validated",
                            })
                          }
                        >
                          Mark validated
                        </Button>
                      )}
                      {doc.status !== "flagged" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewDocument.isPending}
                          onClick={() =>
                            reviewDocument.mutate({
                              document_id: doc.id,
                              status: "flagged",
                            })
                          }
                        >
                          Flag
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </TabsContent>

          {/* Timeline */}
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
                        <p className="text-[13px] font-medium">
                          {ev.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(ev.created_at)} · {ev.actor_type}
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

