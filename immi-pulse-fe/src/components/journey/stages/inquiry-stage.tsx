"use client";

import { MessageSquare, Users, Globe, Mail, MousePointer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import type { StageProps } from "@/lib/types/journey-wizard";

const SOURCES = [
  { value: "email", label: "Email Inquiry", icon: Mail, description: "Client reached out via email" },
  { value: "referral", label: "Referral", icon: Users, description: "Referred by another client or partner" },
  { value: "website", label: "Website Form", icon: Globe, description: "Submitted inquiry through website" },
  { value: "walk_in", label: "Walk-in", icon: MousePointer, description: "In-person office visit" },
] as const;

export function InquiryStage({ wizardContext }: StageProps) {
  const { state, updateStageData, client } = wizardContext;
  const data = state.inquiry;

  const updateField = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) => {
    updateStageData("inquiry", { ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={0}
        subtitle={`Starting the immigration journey for ${client.first_name} ${client.last_name}`}
      />

      {/* Source selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">How did this client reach you?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = data.source === source.value;
            return (
              <button
                key={source.value}
                type="button"
                onClick={() => updateField("source", source.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn("text-sm font-medium", isSelected && "text-primary")}>
                    {source.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Referral source */}
      {data.source === "referral" && (
        <div className="space-y-2">
          <Label htmlFor="referralSource" className="text-sm font-semibold">
            Referred by
          </Label>
          <Input
            id="referralSource"
            placeholder="Name of referring person or organization"
            value={data.referralSource}
            onChange={(e) => updateField("referralSource", e.target.value)}
          />
        </div>
      )}

      {/* Initial notes */}
      <div className="space-y-2">
        <Label htmlFor="initialNotes" className="text-sm font-semibold">
          Initial Notes
        </Label>
        <Textarea
          id="initialNotes"
          placeholder="Brief notes about the client's inquiry — what are they looking for? Any immediate details mentioned?"
          rows={4}
          value={data.initialNotes}
          onChange={(e) => updateField("initialNotes", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          These notes will carry forward into the consultation stage
        </p>
      </div>

      {/* Client snapshot */}
      <Card className="border-border/60">
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Client Snapshot
          </p>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{client.first_name} {client.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nationality</span>
              <span className="font-medium">{client.nationality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{client.email}</span>
            </div>
            {client.current_visa && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Visa</span>
                <span className="font-medium">Subclass {client.current_visa}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI tip */}
      <AiInsightPanel>
        <p>
          Once you complete this step, the consultation stage will help you capture
          detailed information about the client&apos;s background, goals, and eligibility.
          The AI will then suggest the most suitable visa pathways.
        </p>
      </AiInsightPanel>
    </div>
  );
}
