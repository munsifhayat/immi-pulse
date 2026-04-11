"use client";

import {
  FileCheck,
  ShieldCheck,
  PenTool,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps, ApplicationPrepData } from "@/lib/types/journey-wizard";

interface PrepCheckItem {
  key: keyof Omit<ApplicationPrepData, "notes">;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PREP_ITEMS: PrepCheckItem[] = [
  {
    key: "formCompleted",
    label: "Application Form Completed",
    description:
      "All required fields in the visa application form have been filled in accurately",
    icon: FileCheck,
  },
  {
    key: "complianceChecked",
    label: "Compliance Check Passed",
    description:
      "OMARA compliance requirements verified — fee agreement, written advice, conflict check",
    icon: ShieldCheck,
  },
  {
    key: "coverLetterDrafted",
    label: "Cover Letter Drafted",
    description:
      "Submission cover letter prepared outlining the application and supporting evidence",
    icon: PenTool,
  },
  {
    key: "consultantSignoff",
    label: "Consultant Sign-off",
    description:
      "Final review completed — application is ready for lodgement",
    icon: UserCheck,
  },
];

export function ApplicationPrepStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const data = state.applicationPrep;

  const toggleItem = (key: keyof Omit<ApplicationPrepData, "notes">) => {
    updateStageData("applicationPrep", { ...data, [key]: !data[key] });
  };

  const completedCount = PREP_ITEMS.filter((item) => data[item.key]).length;
  const allComplete = completedCount === PREP_ITEMS.length;

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={6}
        subtitle="Final application assembly — forms, compliance, and consultant sign-off"
      />

      {/* Readiness score */}
      <Card className="border-border/60">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Application Readiness</p>
            <span className="text-2xl font-bold text-primary">
              {completedCount}/{PREP_ITEMS.length}
            </span>
          </div>
          <div className="flex gap-1.5">
            {PREP_ITEMS.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors duration-300",
                  data[item.key] ? "bg-emerald-500" : "bg-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prep checklist */}
      <div className="space-y-3">
        {PREP_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const checked = data[item.key];
          return (
            <button
              key={item.key}
              onClick={() => toggleItem(item.key)}
              className={cn(
                "w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
                checked
                  ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : "border-border/60 hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  checked
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {checked ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    checked && "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="prepNotes" className="text-sm font-semibold">
          Preparation Notes
        </Label>
        <Textarea
          id="prepNotes"
          placeholder="Any final notes about the application — special considerations, case officer notes, etc."
          rows={4}
          value={data.notes}
          onChange={(e) =>
            updateStageData("applicationPrep", { ...data, notes: e.target.value })
          }
        />
      </div>

      {allComplete ? (
        <AiInsightPanel variant="success" title="Ready for Lodgement">
          <p>
            All preparation steps complete. The application is ready to be lodged
            with the Department of Home Affairs.
          </p>
        </AiInsightPanel>
      ) : (
        <AiInsightPanel>
          <p>
            Complete all checklist items above before proceeding to lodgement. Each
            item ensures the application meets OMARA compliance and department requirements.
          </p>
        </AiInsightPanel>
      )}
    </div>
  );
}
