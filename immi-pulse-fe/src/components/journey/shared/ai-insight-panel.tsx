"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiInsightPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning";
}

export function AiInsightPanel({
  title = "AI Insight",
  children,
  className,
  variant = "default",
}: AiInsightPanelProps) {
  const variants = {
    default: {
      border: "border-primary/20",
      bg: "bg-primary/5",
      icon: "text-primary",
      title: "text-primary",
    },
    success: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      icon: "text-emerald-600 dark:text-emerald-400",
      title: "text-emerald-700 dark:text-emerald-400",
    },
    warning: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      icon: "text-amber-600 dark:text-amber-400",
      title: "text-amber-700 dark:text-amber-400",
    },
  };

  const v = variants[variant];

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        v.border,
        v.bg,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", v.bg)}>
          <Sparkles className={cn("h-4 w-4", v.icon)} />
        </div>
        <span className={cn("text-sm font-semibold", v.title)}>
          {title}
        </span>
      </div>
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}
