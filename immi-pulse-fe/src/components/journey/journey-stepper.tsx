"use client";

import { Check } from "lucide-react";
import { JOURNEY_STAGES } from "@/lib/journey-config";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JourneyStepperProps {
  currentStage: number;
  completedStages: number[];
  onStageClick: (stage: number) => void;
}

export function JourneyStepper({
  currentStage,
  completedStages,
  onStageClick,
}: JourneyStepperProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[700px] px-2">
          {JOURNEY_STAGES.map((stage, index) => {
            const isCompleted = completedStages.includes(index);
            const isCurrent = index === currentStage;
            const isClickable = isCompleted || isCurrent;
            const isUpcoming = !isCompleted && !isCurrent;

            return (
              <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isClickable && onStageClick(index)}
                      disabled={!isClickable}
                      className={cn(
                        "flex flex-col items-center gap-1.5 group transition-all",
                        isClickable && "cursor-pointer",
                        !isClickable && "cursor-default"
                      )}
                    >
                      {/* Circle */}
                      <div
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                          isCompleted &&
                            "border-emerald-500 bg-emerald-500 text-white",
                          isCurrent &&
                            "border-primary bg-primary text-white shadow-md shadow-primary/25",
                          isUpcoming &&
                            "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" strokeWidth={3} />
                        ) : (
                          stage.step
                        )}

                        {/* Pulse ring for current */}
                        {isCurrent && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
                        )}
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          "text-[10px] font-medium leading-tight text-center max-w-[72px] transition-colors",
                          isCompleted && "text-emerald-600 dark:text-emerald-400",
                          isCurrent && "text-primary font-semibold",
                          isUpcoming && "text-muted-foreground"
                        )}
                      >
                        {stage.shortLabel}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-center">
                    <p className="font-semibold">{stage.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isCompleted
                        ? "Completed"
                        : isCurrent
                          ? "Current stage"
                          : "Upcoming"}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Connector line */}
                {index < JOURNEY_STAGES.length - 1 && (
                  <div className="flex-1 mx-1.5 h-0.5 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-border" />
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        isCompleted ? "bg-emerald-500 w-full" : "w-0"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
