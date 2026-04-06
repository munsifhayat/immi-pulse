import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitMerge } from "lucide-react";

function ConflictResolverNode({ selected }: NodeProps) {
  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/40 bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40" />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <GitMerge className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-semibold">Conflict Resolver</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
            Pure Logic
          </span>
          <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
            3 Rules
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40" />
    </div>
  );
}

export default memo(ConflictResolverNode);
