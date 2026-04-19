"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { usePortalCase, usePortalUpload } from "@/lib/api/hooks/portal";
import type {
  CaseChecklistItem,
  CaseDocumentOut,
  ChecklistItemStatus,
  DocumentStatus,
} from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

const statusPresentation: Record<
  DocumentStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: "Processing", icon: Clock, color: "bg-slate-100 text-slate-700" },
  validated: {
    label: "Validated",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700",
  },
  flagged: {
    label: "Needs attention",
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-700",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-100 text-red-700",
  },
};

const checklistPresentation: Record<
  ChecklistItemStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "To upload",
    color: "bg-slate-100 text-slate-700",
    icon: Clock,
  },
  uploaded: {
    label: "Received",
    color: "bg-blue-100 text-blue-700",
    icon: Upload,
  },
  validated: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  flagged: {
    label: "Needs attention",
    color: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
};

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function ChecklistRow({
  item,
  linkedDocument,
  onUploadClick,
  uploading,
}: {
  item: CaseChecklistItem;
  linkedDocument?: CaseDocumentOut;
  onUploadClick: (item: CaseChecklistItem) => void;
  uploading: boolean;
}) {
  const preset = checklistPresentation[item.status];
  const Icon = preset.icon;
  const docStatus = linkedDocument
    ? statusPresentation[linkedDocument.status]
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        item.status === "pending"
          ? "border-border/60 bg-white"
          : item.status === "flagged"
          ? "border-amber-200 bg-amber-50/40"
          : "border-emerald-200/70 bg-emerald-50/30"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg",
              item.status === "pending" && "bg-slate-100 text-slate-500",
              item.status === "uploaded" && "bg-blue-100 text-blue-600",
              item.status === "validated" && "bg-emerald-100 text-emerald-600",
              item.status === "flagged" && "bg-amber-100 text-amber-600"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-tight">
              {item.label}
              {item.required && (
                <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                  Required
                </span>
              )}
            </p>
            {item.description && (
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
            {linkedDocument && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-[12px] border border-border/50">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium truncate max-w-[220px]">
                  {linkedDocument.file_name}
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(linkedDocument.file_size)}
                </span>
                {docStatus && (
                  <Badge
                    variant="secondary"
                    className={cn("gap-1 text-[11px]", docStatus.color)}
                  >
                    <docStatus.icon className="h-3 w-3" />
                    {docStatus.label}
                  </Badge>
                )}
              </div>
            )}
            {linkedDocument?.ai_analysis?.flags?.length ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Issues to fix
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-amber-800">
                  {linkedDocument.ai_analysis.flags
                    .slice(0, 3)
                    .map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          <Badge variant="secondary" className={cn("gap-1", preset.color)}>
            <Icon className="h-3 w-3" />
            {preset.label}
          </Badge>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant={item.status === "pending" ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => onUploadClick(item)}
              disabled={uploading}
            >
              <Upload className="h-3.5 w-3.5" />
              {item.status === "pending"
                ? "Upload"
                : item.status === "flagged"
                ? "Replace"
                : "Replace"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalDocumentsPage() {
  const params = useParams<{ token: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItem, setActiveItem] = useState<CaseChecklistItem | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const portalCase = usePortalCase();
  const upload = usePortalUpload();

  const caseData = portalCase.data;

  const documents = useMemo(
    () => caseData?.documents ?? [],
    [caseData?.documents]
  );
  const documentsById = useMemo(
    () => Object.fromEntries(documents.map((d) => [d.id, d])),
    [documents]
  );
  const checklist = useMemo(
    () => caseData?.checklist ?? [],
    [caseData?.checklist]
  );

  const progress = useMemo(() => {
    if (checklist.length === 0) return { done: 0, total: 0, percent: 0 };
    const done = checklist.filter(
      (i) => i.status === "uploaded" || i.status === "validated"
    ).length;
    return {
      done,
      total: checklist.length,
      percent: Math.round((done / checklist.length) * 100),
    };
  }, [checklist]);

  const unattachedDocuments = useMemo(() => {
    const linkedIds = new Set(
      checklist.map((i) => i.document_id).filter(Boolean)
    );
    return documents.filter((d) => !linkedIds.has(d.id));
  }, [checklist, documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    for (const original of files) {
      try {
        let toUpload: File = original;
        // When a specific checklist item is picked, tag the file name so the
        // backend heuristic auto-links it to the right row.
        if (activeItem?.document_type) {
          const safeTag = activeItem.document_type.replace(/[^a-z0-9-]/gi, "_");
          const cleanName = original.name.replace(/\s+/g, "_");
          toUpload = new File([original], `${safeTag}-${cleanName}`, {
            type: original.type,
          });
        }
        await upload.mutateAsync(toUpload);
        setToast(
          activeItem
            ? `“${original.name}” uploaded for ${activeItem.label}.`
            : `“${original.name}” uploaded.`
        );
        setTimeout(() => setToast(null), 4000);
      } catch (err) {
        const msg =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any)?.response?.data?.detail ??
          `Upload of ${original.name} failed.`;
        setUploadError(typeof msg === "string" ? msg : JSON.stringify(msg));
        break;
      }
    }
    setActiveItem(null);
  };

  const triggerUpload = (item: CaseChecklistItem | null) => {
    setUploadError(null);
    setActiveItem(item);
    fileInputRef.current?.click();
  };

  if (portalCase.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your checklist…
      </div>
    );
  }

  if (portalCase.isError || !caseData) {
    return (
      <Card className="p-6 text-center space-y-3">
        <p className="text-sm font-medium">Your session has expired.</p>
        <p className="text-xs text-muted-foreground">
          Return to the link your consultant sent you and enter the PIN again.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            (window.location.href = `/client-portal/${params?.token ?? ""}`)
          }
        >
          Re-enter PIN
        </Button>
      </Card>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileChange}
        className="hidden"
      />

      <motion.div variants={fadeUp} custom={0}>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {caseData.client_name.split(" ")[0]}
          </h1>
          {caseData.visa_subclass && (
            <p className="text-sm text-muted-foreground">
              Document collection for{" "}
              <span className="font-medium text-foreground">
                Subclass {caseData.visa_subclass} — {caseData.visa_name}
              </span>
            </p>
          )}
        </div>
      </motion.div>

      {/* Progress */}
      {checklist.length > 0 && (
        <motion.div variants={fadeUp} custom={1}>
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Your progress
                </p>
                <p className="mt-0.5 text-base font-semibold">
                  {progress.done} of {progress.total} documents uploaded
                </p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Secure upload · PIN-protected
              </div>
            </div>
            <div className="mt-4">
              <Progress value={progress.percent} className="h-1.5" />
            </div>
          </Card>
        </motion.div>
      )}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-[13px] text-emerald-800 flex items-start gap-2"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toast}</span>
        </motion.div>
      )}

      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {checklist.length > 0 ? (
        <motion.div variants={fadeUp} custom={2}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Document checklist</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap <strong>Upload</strong> on any row to attach a file. Your
                consultant reviews each document and flags anything that needs a
                re-upload.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {checklist.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                linkedDocument={
                  item.document_id ? documentsById[item.document_id] : undefined
                }
                onUploadClick={(i) => triggerUpload(i)}
                uploading={upload.isPending}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} custom={2}>
          <Card className="p-8 text-center space-y-3">
            <Info className="mx-auto h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              Your consultant is still preparing your checklist.
            </p>
            <Button
              onClick={() => triggerUpload(null)}
              disabled={upload.isPending}
              className="gap-1.5"
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload a document anyway
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Unlinked uploads */}
      {unattachedDocuments.length > 0 && (
        <motion.div variants={fadeUp} custom={3}>
          <h2 className="text-sm font-semibold">Other uploads</h2>
          <p className="text-xs text-muted-foreground">
            We couldn&apos;t automatically match these to a checklist item.
            Your consultant will sort them out.
          </p>
          <Card className="mt-3 divide-y divide-border/60">
            {unattachedDocuments.map((doc) => {
              const pres = statusPresentation[doc.status];
              const Icon = pres.icon;
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {doc.file_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(doc.file_size)} ·{" "}
                        {formatDateTime(doc.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("gap-1", pres.color)}
                  >
                    <Icon className="h-3 w-3" /> {pres.label}
                  </Badge>
                </div>
              );
            })}
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp} custom={4}>
        <p className="text-center text-[11px] text-muted-foreground">
          Session auto-expires after 15 minutes of inactivity ·{" "}
          <ShieldCheck className="inline h-3 w-3 text-emerald-600" /> All
          uploads are encrypted in transit and at rest.
        </p>
      </motion.div>
    </motion.div>
  );
}
