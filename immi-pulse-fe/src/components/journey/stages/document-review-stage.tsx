"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  FileSearch,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps, DocumentReviewResult } from "@/lib/types/journey-wizard";

function generateMockReview(
  documents: StageProps["wizardContext"]["state"]["documents"],
  checklist: StageProps["wizardContext"]["state"]["checklist"]
): DocumentReviewResult[] {
  return documents.map((doc, index) => {
    const checklistItem = checklist.find((i) => i.id === doc.checklistItemId);
    const rand = Math.random();
    const status: DocumentReviewResult["status"] =
      rand > 0.3 ? "passed" : rand > 0.1 ? "flagged" : "failed";

    const issueBank = [
      "Document may be expired — check validity date",
      "Name on document does not exactly match passport",
      "Document resolution is low — may not be accepted",
      "Translation not certified by NAATI accredited translator",
      "Missing page 2 of multi-page document",
      "Document older than 6 months — may need updated version",
    ];

    const suggestionBank = [
      "Request a fresh copy from the issuing authority",
      "Ask client to provide a certified translation",
      "Request higher resolution scan",
      "Verify spelling matches passport exactly",
    ];

    return {
      documentId: doc.id,
      checklistItemId: doc.checklistItemId,
      fileName: doc.fileName,
      documentType: checklistItem?.documentType || "Unknown",
      status,
      confidence: status === "passed" ? 92 + Math.floor(Math.random() * 8) : 45 + Math.floor(Math.random() * 40),
      issues:
        status === "passed"
          ? []
          : issueBank.slice(0, status === "flagged" ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2)),
      suggestions:
        status === "passed"
          ? []
          : suggestionBank.slice(0, 1 + Math.floor(Math.random() * 2)),
      reviewedAt: new Date().toISOString(),
    };
  });
}

function ReviewCard({ result }: { result: DocumentReviewResult }) {
  const statusConfig = {
    passed: {
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      label: "Passed",
    },
    flagged: {
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      label: "Flagged",
    },
    failed: {
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      label: "Failed",
    },
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4", config.border, config.bg)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.color)} />
          <div>
            <p className="text-sm font-semibold">{result.documentType}</p>
            <p className="text-xs text-muted-foreground">{result.fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", config.color, config.border)}
          >
            {config.label}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {result.confidence}% confidence
          </span>
        </div>
      </div>

      {result.issues.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Issues Found
          </p>
          {result.issues.map((issue, i) => (
            <p key={i} className="text-xs flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
              {issue}
            </p>
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Suggestions
          </p>
          {result.suggestions.map((suggestion, i) => (
            <p key={i} className="text-xs flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
              {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentReviewStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const reviewResults = state.documentReview;
  const [isReviewing, setIsReviewing] = useState(false);

  const triggerReview = () => {
    setIsReviewing(true);
    // Simulate AI processing delay
    setTimeout(() => {
      const results = generateMockReview(state.documents, state.checklist);
      updateStageData("documentReview", results);
      updateStageData("reviewTriggered" as keyof typeof state, true as never);
      setIsReviewing(false);
    }, 2500);
  };

  const passed = reviewResults.filter((r) => r.status === "passed").length;
  const flagged = reviewResults.filter((r) => r.status === "flagged").length;
  const failed = reviewResults.filter((r) => r.status === "failed").length;
  const total = reviewResults.length;
  const allPassed = total > 0 && flagged === 0 && failed === 0;

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={5}
        subtitle="AI validates all uploaded documents against visa requirements"
      />

      {/* Review trigger */}
      {!state.reviewTriggered && !isReviewing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileSearch className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold mb-1">Ready for AI Review</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {state.documents.length} documents uploaded. Click below to trigger the
                AI batch review — all documents will be validated against the
                Subclass {state.visaPathway.selectedVisa} requirements.
              </p>
            </div>
            <Button size="lg" className="gap-2 mt-2" onClick={triggerReview}>
              <Sparkles className="h-4 w-4" />
              Start AI Batch Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviewing state */}
      {isReviewing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-center">
              <h3 className="text-lg font-bold mb-1">Reviewing Documents...</h3>
              <p className="text-sm text-muted-foreground">
                AI is analyzing each document for completeness, validity, and compliance
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review results */}
      {total > 0 && !isReviewing && (
        <>
          {/* Summary */}
          <Card className="border-border/60">
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Review Summary</p>
                    <p className="text-xs text-muted-foreground">
                      {total} documents reviewed
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={triggerReview}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-run Review
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      {passed}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Passed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {flagged}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Flagged</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">
                      {failed}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
                  </div>
                </div>
              </div>

              <Progress
                value={(passed / total) * 100}
                className="h-2 mt-4"
              />
            </CardContent>
          </Card>

          {/* Individual results */}
          <div className="space-y-3">
            {reviewResults.map((result) => (
              <ReviewCard key={result.documentId} result={result} />
            ))}
          </div>

          {allPassed ? (
            <AiInsightPanel variant="success" title="All Documents Validated">
              <p>
                All documents have passed AI validation. You can now proceed to
                application preparation.
              </p>
            </AiInsightPanel>
          ) : (
            <AiInsightPanel variant="warning" title="Action Required">
              <p>
                Some documents need attention. Review the flagged items above and request
                updated documents from the client if needed. You can re-run the review
                after updates. You may still proceed if the flagged items are acceptable.
              </p>
            </AiInsightPanel>
          )}
        </>
      )}
    </div>
  );
}
