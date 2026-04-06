import { CheckCircle2, XCircle, Clock, Minus } from "lucide-react";

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/80";
  if (score >= 60) return "bg-amber-500/80";
  return "bg-red-500/80";
}

export function ObligationStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "compliant":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500/80" />;
    case "non_compliant":
    case "expired":
      return <XCircle className="h-4 w-4 text-red-500/80" />;
    case "expiring":
      return <Clock className="h-4 w-4 text-amber-500/80" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground/30" />;
  }
}
