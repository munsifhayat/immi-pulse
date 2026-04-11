"use client";

import { Send, Receipt, CalendarCheck, FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps, LodgementData } from "@/lib/types/journey-wizard";

export function LodgementStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const data = state.lodgement;

  const update = <K extends keyof LodgementData>(key: K, value: LodgementData[K]) => {
    updateStageData("lodgement", { ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={7}
        subtitle="Record application submission details with the Department of Home Affairs"
      />

      {/* Lodgement form */}
      <Card className="border-border/60">
        <CardContent className="space-y-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lodgeDate" className="text-sm flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                Lodgement Date
              </Label>
              <Input
                id="lodgeDate"
                type="date"
                value={data.lodgementDate}
                onChange={(e) => update("lodgementDate", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt" className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                Receipt / Transaction Number
              </Label>
              <Input
                id="receipt"
                placeholder="e.g. TRN-1234567890"
                value={data.receiptNumber}
                onChange={(e) => update("receiptNumber", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method" className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Lodgement Method
            </Label>
            <Select
              value={data.method || undefined}
              onValueChange={(v) => update("method", v as LodgementData["method"])}
            >
              <SelectTrigger id="method" className="w-64">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immi_account">ImmiAccount (Online)</SelectItem>
                <SelectItem value="paper">Paper Application</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="confirmation"
              checked={data.confirmationUploaded}
              onCheckedChange={(v) => update("confirmationUploaded", v === true)}
            />
            <Label htmlFor="confirmation" className="text-sm cursor-pointer flex items-center gap-2">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              Lodgement confirmation / receipt uploaded
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="lodgeNotes" className="text-sm font-semibold">
          Lodgement Notes
        </Label>
        <Textarea
          id="lodgeNotes"
          placeholder="Any notes about the lodgement — e.g., issues encountered, payment confirmation, etc."
          rows={3}
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <AiInsightPanel>
        <p>
          After lodging, the case moves to post-lodgement tracking where you
          can monitor health checks, character checks, and any DHA requests for
          additional information.
        </p>
      </AiInsightPanel>
    </div>
  );
}
