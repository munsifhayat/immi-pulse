"use client";

import {
  Heart,
  ShieldCheck,
  Fingerprint,
  FileQuestion,
  Clock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps, PostLodgementData } from "@/lib/types/journey-wizard";

interface TrackingItem {
  key: "healthCheckStatus" | "characterCheckStatus" | "biometricsStatus";
  label: string;
  icon: React.ElementType;
  options: { value: string; label: string }[];
}

const TRACKING_ITEMS: TrackingItem[] = [
  {
    key: "healthCheckStatus",
    label: "Health Examination",
    icon: Heart,
    options: [
      { value: "not_started", label: "Not Started" },
      { value: "scheduled", label: "Scheduled" },
      { value: "completed", label: "Completed" },
      { value: "cleared", label: "Cleared by DHA" },
    ],
  },
  {
    key: "characterCheckStatus",
    label: "Character / Police Check",
    icon: ShieldCheck,
    options: [
      { value: "not_started", label: "Not Started" },
      { value: "submitted", label: "Submitted" },
      { value: "cleared", label: "Cleared" },
    ],
  },
  {
    key: "biometricsStatus",
    label: "Biometrics",
    icon: Fingerprint,
    options: [
      { value: "not_required", label: "Not Required" },
      { value: "scheduled", label: "Scheduled" },
      { value: "completed", label: "Completed" },
    ],
  },
];

function getStatusColor(value: string) {
  if (value === "cleared" || value === "completed") return "text-emerald-600 dark:text-emerald-400";
  if (value === "scheduled" || value === "submitted") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function PostLodgementStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const data = state.postLodgement;

  const update = <K extends keyof PostLodgementData>(
    key: K,
    value: PostLodgementData[K]
  ) => {
    updateStageData("postLodgement", { ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={8}
        subtitle="Track DHA processing — health checks, character checks, and additional requests"
      />

      <AiInsightPanel>
        <p>
          Processing times vary by visa subclass. Track each requirement below
          and update as the client completes them. The system will flag if any
          item is overdue.
        </p>
      </AiInsightPanel>

      {/* Tracking items */}
      <div className="space-y-3">
        {TRACKING_ITEMS.map((item) => {
          const Icon = item.icon;
          const currentValue = data[item.key] as string;
          return (
            <Card key={item.key} className="border-border/60">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className={cn("h-5 w-5", getStatusColor(currentValue))} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
                <Select
                  value={currentValue}
                  onValueChange={(v) => update(item.key, v as never)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {item.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional info request */}
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Additional Information Requested</p>
            <p className="text-xs text-muted-foreground">
              Has DHA requested additional documents or information (s56)?
            </p>
          </div>
          <Checkbox
            checked={data.additionalInfoRequested}
            onCheckedChange={(v) => update("additionalInfoRequested", v === true)}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="postNotes" className="text-sm font-semibold">
          Processing Notes
        </Label>
        <Textarea
          id="postNotes"
          placeholder="Updates from DHA, case officer communications, timeline notes..."
          rows={4}
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
