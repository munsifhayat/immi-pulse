"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedDocument } from "@/lib/types/journey-wizard";

interface DocumentUploadZoneProps {
  checklistItemId: string;
  documentType: string;
  existingDocument?: UploadedDocument;
  onUpload: (doc: UploadedDocument) => void;
  onRemove: (docId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadZone({
  checklistItemId,
  documentType,
  existingDocument,
  onUpload,
  onRemove,
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const doc: UploadedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        checklistItemId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        status: "uploaded",
      };
      onUpload(doc);
    },
    [checklistItemId, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (existingDocument) {
    const statusIcon = {
      uploaded: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      validated: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      flagged: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      uploading: (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ),
      validating: (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ),
    };

    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <File className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{existingDocument.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(existingDocument.fileSize)}
          </p>
        </div>
        {statusIcon[existingDocument.status]}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onRemove(existingDocument.id)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <Upload
        className={cn(
          "h-6 w-6",
          isDragOver ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Drop {documentType} here
        </p>
        <p className="text-xs text-muted-foreground">or click to browse</p>
      </div>
      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleInputChange}
      />
    </label>
  );
}
