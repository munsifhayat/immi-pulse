"use client";

import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNEY_STAGES } from "@/lib/journey-config";

interface JourneyActionsBarProps {
  currentStage: number;
  canProgress: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function JourneyActionsBar({
  currentStage,
  canProgress,
  onBack,
  onNext,
  nextLabel,
}: JourneyActionsBarProps) {
  const isFirstStage = currentStage === 0;
  const isLastStage = currentStage === JOURNEY_STAGES.length - 1;

  const defaultNextLabel =
    currentStage < 4
      ? "Save & Continue"
      : isLastStage
        ? "Complete Journey"
        : "Continue";

  return (
    <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        {/* Left: Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={isFirstStage}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Center: Stage info */}
        <p className="text-xs text-muted-foreground hidden sm:block">
          Step {currentStage + 1} of {JOURNEY_STAGES.length}
          <span className="mx-1.5">·</span>
          {JOURNEY_STAGES[currentStage]?.shortLabel}
        </p>

        {/* Right: Next / Complete */}
        <Button
          size="sm"
          onClick={onNext}
          disabled={!canProgress}
          className="gap-2"
        >
          {isLastStage ? (
            <>
              <Save className="h-4 w-4" />
              {nextLabel || defaultNextLabel}
            </>
          ) : (
            <>
              {nextLabel || defaultNextLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
