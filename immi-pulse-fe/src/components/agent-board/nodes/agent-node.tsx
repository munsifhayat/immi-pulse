import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileText,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import type { AgentMetadata } from "../board-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  AlertTriangle,
  TrendingUp,
};

const colorMap: Record<string, { border: string; bg: string; badge: string }> = {
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

function AgentNode({ data, selected }: NodeProps) {
  const meta = data as AgentMetadata;
  const Icon = iconMap[meta.icon] || FileText;
  const colors = colorMap[meta.color] || colorMap.blue;

  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 ${colors.border} ${colors.bg} bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40" />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold truncate">{meta.label}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {meta.aiModel && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
              {meta.aiModel.operation === "classify" || meta.aiModel.operation.includes("classify") ? "AI Classification" : meta.aiModel.operation === "analyze" ? "AI Analysis" : "AI Powered"}
            </span>
          )}
          {meta.confidenceThreshold !== undefined && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              ≥ {(meta.confidenceThreshold * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40" />
    </div>
  );
}

export default memo(AgentNode);
