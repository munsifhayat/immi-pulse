"use client";

import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps, DecisionData } from "@/lib/types/journey-wizard";

const OUTCOMES = [
  {
    value: "granted",
    label: "Visa Granted",
    description: "Application approved by DHA",
    icon: CheckCircle2,
    colors: "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-600",
  },
  {
    value: "refused",
    label: "Visa Refused",
    description: "Application refused by DHA",
    icon: XCircle,
    colors: "border-red-500/30 bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400",
    iconColor: "text-red-600",
  },
  {
    value: "withdrawn",
    label: "Application Withdrawn",
    description: "Application withdrawn by applicant",
    icon: MinusCircle,
    colors: "border-gray-500/30 bg-gray-50/50 dark:bg-gray-900/10 text-gray-700 dark:text-gray-400",
    iconColor: "text-gray-500",
  },
] as const;

export function DecisionStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const data = state.decision;

  const update = <K extends keyof DecisionData>(key: K, value: DecisionData[K]) => {
    updateStageData("decision", { ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={9}
        subtitle="Record the final decision from the Department of Home Affairs"
      />

      {/* Outcome selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Decision Outcome</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {OUTCOMES.map((outcome) => {
            const Icon = outcome.icon;
            const isSelected = data.outcome === outcome.value;
            return (
              <button
                key={outcome.value}
                onClick={() => update("outcome", outcome.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                  isSelected ? outcome.colors : "border-border/60 hover:border-primary/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-8 w-8",
                    isSelected ? outcome.iconColor : "text-muted-foreground"
                  )}
                />
                <div className="text-center">
                  <p className="text-sm font-semibold">{outcome.label}</p>
                  <p className="text-xs text-muted-foreground">{outcome.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decision date */}
      <div className="space-y-1.5">
        <Label htmlFor="decisionDate" className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Decision Date
        </Label>
        <Input
          id="decisionDate"
          type="date"
          className="w-48"
          value={data.decisionDate}
          onChange={(e) => update("decisionDate", e.target.value)}
        />
      </div>

      {/* Grant-specific fields */}
      {data.outcome === "granted" && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="space-y-4 py-5">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Grant Details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="grantDate" className="text-sm">
                  Visa Grant Date
                </Label>
                <Input
                  id="grantDate"
                  type="date"
                  value={data.grantDate}
                  onChange={(e) => update("grantDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate" className="text-sm">
                  Visa Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={data.expiryDate}
                  onChange={(e) => update("expiryDate", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditions" className="text-sm">
                Visa Conditions
              </Label>
              <Textarea
                id="conditions"
                placeholder="e.g. Condition 8104 — No more than 48 hours of work per fortnight"
                rows={2}
                value={data.visaConditions}
                onChange={(e) => update("visaConditions", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refusal-specific fields */}
      {data.outcome === "refused" && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="space-y-4 py-5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Refusal Details
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="refusalReason" className="text-sm">
                Reason for Refusal
              </Label>
              <Textarea
                id="refusalReason"
                placeholder="Record the grounds for refusal as stated in the decision letter..."
                rows={4}
                value={data.refusalReason}
                onChange={(e) => update("refusalReason", e.target.value)}
              />
            </div>
            <AiInsightPanel variant="warning" title="Review Options">
              <p>
                If the visa was refused, consider whether the client may be eligible
                for a merits review at the Administrative Appeals Tribunal (AAT) or
                a ministerial intervention request.
              </p>
            </AiInsightPanel>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="decisionNotes" className="text-sm font-semibold">
          Final Notes
        </Label>
        <Textarea
          id="decisionNotes"
          placeholder="Any final notes about the outcome, next steps, or follow-up actions..."
          rows={3}
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      {data.outcome === "granted" && (
        <AiInsightPanel variant="success" title="Journey Complete">
          <p>
            Congratulations! The visa has been granted. This journey is now complete
            and will be archived in the client&apos;s case history.
          </p>
        </AiInsightPanel>
      )}
    </div>
  );
}
