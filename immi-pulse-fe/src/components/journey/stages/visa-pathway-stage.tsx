"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import { getMockVisaRecommendations } from "@/lib/mock-data/visa-requirements";
import type { StageProps, VisaRecommendation } from "@/lib/types/journey-wizard";

function ConfidenceMeter({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold">{value}%</span>
    </div>
  );
}

function VisaCard({
  rec,
  isSelected,
  onSelect,
  rank,
}: {
  rec: VisaRecommendation;
  isSelected: boolean;
  onSelect: () => void;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(rank === 0);

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-200 cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border/60 hover:border-primary/30"
      )}
      onClick={onSelect}
    >
      <CardContent className="py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {rank === 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                <Sparkles className="h-3 w-3" />
                Top Match
              </Badge>
            )}
            <div>
              <h3 className="text-lg font-bold">
                Subclass {rec.visaSubclass}
              </h3>
              <p className="text-sm text-muted-foreground">{rec.visaName}</p>
            </div>
          </div>
          {isSelected && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">AI Confidence</span>
            <ConfidenceMeter value={rec.confidence} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Eligibility</span>
            <ConfidenceMeter value={rec.eligibilityScore} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Processing</span>
            <span className="font-medium">{rec.processingTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium">{rec.applicationCost}</span>
          </div>
        </div>

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs mb-3"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Show less" : "Show details"}
        </Button>

        {expanded && (
          <div className="space-y-4 border-t border-border/40 pt-4">
            {/* Key Requirements */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Key Requirements
              </p>
              <ul className="space-y-1.5">
                {rec.keyRequirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pros */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Advantages
              </p>
              <ul className="space-y-1.5">
                {rec.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ThumbsUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Considerations
              </p>
              <ul className="space-y-1.5">
                {rec.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ThumbsDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VisaPathwayStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const data = state.visaPathway;
  const recommendations = getMockVisaRecommendations();

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={2}
        subtitle="Review AI-recommended visa pathways and confirm the best option for your client"
      />

      <AiInsightPanel title="AI Visa Assessment Complete">
        <p>
          Based on the consultation data, we&apos;ve analyzed {recommendations.length} potential
          visa pathways. Select the one that best fits your client&apos;s situation.
          You can always change this later.
        </p>
      </AiInsightPanel>

      {/* Visa cards */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">
          Recommended Pathways
        </Label>
        {recommendations.map((rec, index) => (
          <VisaCard
            key={rec.visaSubclass}
            rec={rec}
            rank={index}
            isSelected={data.selectedVisa === rec.visaSubclass}
            onSelect={() =>
              updateStageData("visaPathway", {
                ...data,
                selectedVisa: rec.visaSubclass,
              })
            }
          />
        ))}
      </div>

      {/* Consultant notes */}
      <div className="space-y-2">
        <Label htmlFor="pathwayNotes" className="text-sm font-semibold">
          Pathway Notes
        </Label>
        <Textarea
          id="pathwayNotes"
          placeholder="Why was this visa pathway selected? Any specific considerations or alternative strategies discussed with the client..."
          rows={3}
          value={data.pathwayNotes}
          onChange={(e) =>
            updateStageData("visaPathway", {
              ...data,
              pathwayNotes: e.target.value,
            })
          }
        />
      </div>

      {data.selectedVisa && (
        <AiInsightPanel variant="success" title="Next Step">
          <p>
            Great — Subclass {data.selectedVisa} selected. When you continue, the AI will
            generate a tailored document checklist with all requirements specific to this
            visa type.
          </p>
        </AiInsightPanel>
      )}
    </div>
  );
}
