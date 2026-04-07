"use client";

import { motion } from "framer-motion";
import {
  Inbox,
  Users,
  Route,
  ClipboardList,
  Upload,
  ScanSearch,
  FileCheck,
  Send,
  Timer,
  ShieldCheck,
  Check,
  AlertTriangle,
  Lock,
  SkipForward,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { JourneyStep, JourneyStepStatus } from "@/lib/types/immigration";
import { JOURNEY_STAGES, type JourneyStageConfig } from "@/lib/journey-config";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  users: Users,
  route: Route,
  "clipboard-list": ClipboardList,
  upload: Upload,
  "scan-search": ScanSearch,
  "file-check": FileCheck,
  send: Send,
  timer: Timer,
  "shield-check": ShieldCheck,
};

function StatusIcon({
  status,
  className,
}: {
  status: JourneyStepStatus;
  className?: string;
}) {
  switch (status) {
    case "completed":
      return <Check className={cn("h-3.5 w-3.5", className)} />;
    case "blocked":
      return <AlertTriangle className={cn("h-3.5 w-3.5", className)} />;
    case "skipped":
      return <SkipForward className={cn("h-3.5 w-3.5", className)} />;
    default:
      return null;
  }
}

function getDotStyles(status: JourneyStepStatus, config: JourneyStageConfig) {
  switch (status) {
    case "completed":
      return "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/25";
    case "current":
      return `${config.colorDot} text-white border-transparent shadow-lg ring-4 ring-offset-2 ring-offset-background`;
    case "blocked":
      return "bg-red-500 text-white border-red-500 shadow-red-500/25";
    case "skipped":
      return "bg-gray-300 text-gray-500 border-gray-300 dark:bg-gray-600 dark:text-gray-400";
    default:
      return "bg-muted border-border text-muted-foreground";
  }
}

function getRingColor(config: JourneyStageConfig) {
  // Extract the color base from the dot class (e.g., "bg-blue-500" -> "ring-blue-500/20")
  const match = config.colorDot.match(/bg-(\w+-\d+)/);
  if (match) return `ring-${match[1]}/20`;
  return "ring-primary/20";
}

function getLineStyles(status: JourneyStepStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "current":
    case "blocked":
      return "bg-gradient-to-b from-emerald-500 to-border";
    default:
      return "bg-border";
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

interface JourneyTimelineProps {
  steps: JourneyStep[];
  outcome?: "granted" | "refused" | "withdrawn" | null;
  className?: string;
}

export function JourneyTimeline({
  steps,
  outcome,
  className,
}: JourneyTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className={cn("relative", className)}>
      {JOURNEY_STAGES.map((config, index) => {
        const step = steps[index];
        if (!step) return null;

        const isLast = index === JOURNEY_STAGES.length - 1;
        const isExpanded = expandedStep === index;
        const hasDetails = step.notes || (step.blockers && step.blockers.length > 0);
        const StageIcon = iconMap[config.icon] || Inbox;

        // For the decision stage, adjust color based on outcome
        const isDecisionWithOutcome =
          config.key === "decision" && step.status === "completed" && outcome;
        let decisionDotClass = "";
        if (isDecisionWithOutcome) {
          if (outcome === "granted")
            decisionDotClass =
              "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/25";
          else if (outcome === "refused")
            decisionDotClass =
              "bg-red-500 text-white border-red-500 shadow-red-500/25";
          else if (outcome === "withdrawn")
            decisionDotClass =
              "bg-gray-400 text-white border-gray-400 shadow-gray-400/25";
        }

        return (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="relative flex gap-4"
          >
            {/* Vertical line + dot column */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isDecisionWithOutcome
                    ? decisionDotClass
                    : getDotStyles(step.status, config),
                  step.status === "current" && getRingColor(config)
                )}
              >
                {step.status === "completed" || step.status === "blocked" || step.status === "skipped" ? (
                  <StatusIcon status={step.status} />
                ) : (
                  <StageIcon
                    className={cn(
                      "h-4 w-4",
                      step.status === "current"
                        ? "text-white"
                        : "text-muted-foreground"
                    )}
                  />
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    getLineStyles(step.status)
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
              {/* Header row */}
              <div
                className={cn(
                  "flex items-start gap-2 -mt-1",
                  hasDetails && "cursor-pointer"
                )}
                onClick={() =>
                  hasDetails &&
                  setExpandedStep(isExpanded ? null : index)
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[13px] font-semibold",
                        step.status === "completed" && "text-foreground",
                        step.status === "current" && config.colorText,
                        step.status === "blocked" && "text-red-600 dark:text-red-400",
                        step.status === "upcoming" && "text-muted-foreground",
                        step.status === "skipped" && "text-muted-foreground line-through"
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Step {config.step}
                    </span>
                    {step.status === "current" && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          config.colorBg,
                          config.colorText
                        )}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span
                            className={cn(
                              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                              config.colorDot
                            )}
                          />
                          <span
                            className={cn(
                              "relative inline-flex h-1.5 w-1.5 rounded-full",
                              config.colorDot
                            )}
                          />
                        </span>
                        Current
                      </span>
                    )}
                    {step.status === "blocked" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" />
                        Blocked
                      </span>
                    )}
                    {isDecisionWithOutcome && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          outcome === "granted" &&
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                          outcome === "refused" &&
                            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                          outcome === "withdrawn" &&
                            "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                        )}
                      >
                        {outcome === "granted" && "Granted"}
                        {outcome === "refused" && "Refused"}
                        {outcome === "withdrawn" && "Withdrawn"}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {config.description}
                  </p>

                  {/* Timestamps */}
                  {(step.started_at || step.completed_at) && (
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                      {step.started_at && (
                        <span>Started {formatTimeAgo(step.started_at)}</span>
                      )}
                      {step.completed_at && (
                        <span>
                          Completed {formatTimeAgo(step.completed_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                {hasDetails && (
                  <button className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && hasDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3"
                >
                  {step.notes && (
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Notes
                      </span>
                      <p className="mt-1 text-[12px] leading-relaxed text-foreground/80">
                        {step.notes}
                      </p>
                    </div>
                  )}
                  {step.blockers && step.blockers.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Blockers
                      </span>
                      <ul className="mt-1 space-y-1">
                        {step.blockers.map((blocker, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[12px] text-red-600 dark:text-red-400"
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {blocker}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
