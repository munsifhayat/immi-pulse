"use client";

import type { JourneyStep } from "@/lib/types/immigration";
import { JOURNEY_STAGES } from "@/lib/journey-config";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JourneyProgressBarProps {
  steps: JourneyStep[];
  className?: string;
}

function getDotColor(status: JourneyStep["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "current":
      return "bg-primary animate-pulse";
    case "blocked":
      return "bg-red-500";
    case "skipped":
      return "bg-gray-300 dark:bg-gray-600";
    default:
      return "bg-border";
  }
}

function getBarColor(status: JourneyStep["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    default:
      return "bg-border";
  }
}

export function JourneyProgressBar({
  steps,
  className,
}: JourneyProgressBarProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {steps.map((step, i) => {
        const config = JOURNEY_STAGES[i];
        if (!config) return null;
        return (
          <Tooltip key={config.key}>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    getDotColor(step.status)
                  )}
                />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-1.5",
                      getBarColor(step.status)
                    )}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-medium">{config.shortLabel}</span>
              <span className="ml-1.5 capitalize text-muted-foreground">
                ({step.status})
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
