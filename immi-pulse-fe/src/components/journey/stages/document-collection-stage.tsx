"use client";

import { useMemo } from "react";
import {
  Upload,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Ban,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { DocumentUploadZone } from "@/components/journey/shared/document-upload-zone";
import { cn } from "@/lib/utils";
import type { StageProps, UploadedDocument } from "@/lib/types/journey-wizard";

export function DocumentCollectionStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const checklist = state.checklist.filter((i) => i.status !== "not_applicable");
  const documents = state.documents;

  const categories = [...new Set(checklist.map((i) => i.category))];

  const stats = useMemo(() => {
    const required = checklist.filter((i) => i.required);
    const uploaded = required.filter((i) =>
      documents.some((d) => d.checklistItemId === i.id)
    );
    return {
      total: checklist.length,
      required: required.length,
      uploaded: documents.length,
      requiredUploaded: uploaded.length,
      progress: required.length > 0
        ? Math.round((uploaded.length / required.length) * 100)
        : 0,
    };
  }, [checklist, documents]);

  const handleUpload = (doc: UploadedDocument) => {
    updateStageData("documents", [...documents, doc]);
    // Also update checklist item status
    updateStageData(
      "checklist",
      state.checklist.map((item) =>
        item.id === doc.checklistItemId ? { ...item, status: "uploaded" as const } : item
      )
    );
  };

  const handleRemove = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    updateStageData(
      "documents",
      documents.filter((d) => d.id !== docId)
    );
    if (doc) {
      updateStageData(
        "checklist",
        state.checklist.map((item) =>
          item.id === doc.checklistItemId ? { ...item, status: "pending" as const } : item
        )
      );
    }
  };

  const getDocForItem = (checklistItemId: string) =>
    documents.find((d) => d.checklistItemId === checklistItemId);

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={4}
        subtitle="Upload documents against each checklist requirement"
      />

      {/* Progress overview */}
      <Card className="border-border/60">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Collection Progress</p>
                <p className="text-xs text-muted-foreground">
                  {stats.requiredUploaded} of {stats.required} required documents uploaded
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {stats.uploaded} uploaded
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3" />
              {stats.required - stats.requiredUploaded} remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Documents by category */}
      {categories.map((category) => {
        const items = checklist.filter((i) => i.category === category);
        return (
          <Card key={category} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {items.map((item, idx) => {
                const existingDoc = getDocForItem(item.id);
                return (
                  <div key={item.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.documentType}</p>
                        {item.required ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
                          >
                            Required
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 text-muted-foreground"
                          >
                            Optional
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {item.notes && (
                        <p className="text-xs text-primary/70 italic">Note: {item.notes}</p>
                      )}
                      <DocumentUploadZone
                        checklistItemId={item.id}
                        documentType={item.documentType}
                        existingDocument={existingDoc}
                        onUpload={handleUpload}
                        onRemove={handleRemove}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {stats.progress >= 100 ? (
        <AiInsightPanel variant="success" title="All Required Documents Uploaded">
          <p>
            All required documents are uploaded. You can now proceed to the AI batch
            review stage, where our system will validate each document against the
            visa requirements.
          </p>
        </AiInsightPanel>
      ) : (
        <AiInsightPanel title="Upload Progress">
          <p>
            Upload all required documents to proceed to the AI review stage.
            Optional documents can be added at any time. You can save and return
            to this stage later.
          </p>
        </AiInsightPanel>
      )}
    </div>
  );
}
