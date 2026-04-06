import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail } from "lucide-react";
import type { AgentMetadata } from "../board-data";

function EmailInputNode({ selected }: NodeProps) {
  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 border-l-sky-500 bg-sky-50 dark:bg-sky-950/40 bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span className="text-sm font-semibold">Email Input</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
            MS365 Webhook
          </span>
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
            Graph API
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40" />
    </div>
  );
}

export default memo(EmailInputNode);
