import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  Inbox,
  ShieldCheck,
  CheckCircle2,
  BadgeCheck,
  Search,
  Pencil,
  Users,
  MessageSquare,
  Flag,
  Gavel,
  Pin,
  EyeOff,
  Shield,
  Globe,
  Star,
} from "lucide-react";
import type { AgentMetadata } from "../board-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  Inbox,
  ShieldCheck,
  CheckCircle2,
  BadgeCheck,
  Search,
  Pencil,
  Users,
  MessageSquare,
  Flag,
  Gavel,
  Pin,
  EyeOff,
  Shield,
  Globe,
  Star,
};

const colorMap: Record<
  string,
  { border: string; bg: string; badge: string; iconText: string }
> = {
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    iconText: "text-blue-600 dark:text-blue-400",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    iconText: "text-red-600 dark:text-red-400",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  sky: {
    border: "border-l-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
    iconText: "text-sky-600 dark:text-sky-400",
  },
  violet: {
    border: "border-l-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
    iconText: "text-violet-600 dark:text-violet-400",
  },
  orange: {
    border: "border-l-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    iconText: "text-orange-600 dark:text-orange-400",
  },
  teal: {
    border: "border-l-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    iconText: "text-teal-600 dark:text-teal-400",
  },
  emerald: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  pink: {
    border: "border-l-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    iconText: "text-pink-600 dark:text-pink-400",
  },
  indigo: {
    border: "border-l-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    iconText: "text-indigo-600 dark:text-indigo-400",
  },
  gray: {
    border: "border-l-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/40",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    iconText: "text-gray-600 dark:text-gray-400",
  },
};

function AgentNode({ data, selected }: NodeProps) {
  const meta = data as AgentMetadata;
  const Icon = iconMap[meta.icon] || FileText;
  const colors = colorMap[meta.color] || colorMap.blue;

  const badges: string[] = meta.badges?.length
    ? meta.badges
    : meta.aiModel
      ? [
          meta.aiModel.operation === "classify" ||
          meta.aiModel.operation.includes("classify")
            ? "AI Classification"
            : meta.aiModel.operation === "analyze"
              ? "AI Analysis"
              : "AI Powered",
        ]
      : [];

  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 ${colors.border} ${colors.bg} bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-muted-foreground/40"
      />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 shrink-0 ${colors.iconText}`} />
          <span className="text-sm font-semibold truncate">{meta.label}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span
              key={badge}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}
            >
              {badge}
            </span>
          ))}
          {!meta.badges?.length && meta.confidenceThreshold !== undefined && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              ≥ {(meta.confidenceThreshold * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-muted-foreground/40"
      />
    </div>
  );
}

export default memo(AgentNode);
