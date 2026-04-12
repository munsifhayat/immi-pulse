"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { usePortalCase, usePortalUpload } from "@/lib/api/hooks/portal";
import type { DocumentStatus } from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function ClientPortalDocumentsPage() {
  const params = useParams<{ token: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const portalCase = usePortalCase();
  const upload = usePortalUpload();

  const caseData = portalCase.data;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        await upload.mutateAsync(file);
      } catch (err) {
        const msg =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any)?.response?.data?.detail ??
          `Upload of ${file.name} failed.`;
        setUploadError(typeof msg === "string" ? msg : JSON.stringify(msg));
        break;
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <motion.div variants={fadeUp} custom={0}>
        <h1 className="text-2xl font-bold tracking-tight">
          {caseData.client_name}
        </h1>
        {caseData.visa_subclass && (
          <p className="text-sm text-muted-foreground">
            {caseData.visa_subclass} — {caseData.visa_name}
          </p>
        )}
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Upload a document</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              PDFs, Word documents, spreadsheets, and images are all supported.
              Each file must be under 25 MB.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              className="gap-1.5"
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Choose files
            </Button>
          </div>
          {uploadError && (
            <p className="text-[12px] font-medium text-red-600">{uploadError}</p>
          )}
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Card className="divide-y divide-border/60">
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-sm font-semibold">Your documents</p>
            <Badge variant="secondary">{caseData.documents.length}</Badge>
          </div>
          {caseData.documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            caseData.documents.map((doc) => {
              const presentation = statusPresentation[doc.status] ?? {
                label: doc.status,
                icon: Clock,
                color: "bg-slate-100 text-slate-700",
              };
              const Icon = presentation.icon;
              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{doc.file_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[doc.document_type, formatBytes(doc.file_size)]
                          .filter(Boolean)
                          .join(" · ")}
                        {doc.uploaded_at && ` · ${formatDateTime(doc.uploaded_at)}`}
                      </p>
                      {doc.ai_analysis?.flags?.length ? (
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-700">
                          {doc.ai_analysis.flags.slice(0, 3).map((flag, i) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("gap-1", presentation.color)}
                  >
                    <Icon className="h-3 w-3" />
                    {presentation.label}
                  </Badge>
                </div>
              );
            })
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
