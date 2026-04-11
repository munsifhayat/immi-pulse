"use client";

import { JOURNEY_STAGES } from "@/lib/journey-config";
import { cn } from "@/lib/utils";

interface StageHeaderProps {
  stageIndex: number;
  subtitle?: string;
  children?: React.ReactNode;
}

export function StageHeader({ stageIndex, subtitle, children }: StageHeaderProps) {
  const stage = JOURNEY_STAGES[stageIndex];
  if (!stage) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
            stage.colorDot
          )}
        >
          {stage.step}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
            {stage.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {subtitle || stage.description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
