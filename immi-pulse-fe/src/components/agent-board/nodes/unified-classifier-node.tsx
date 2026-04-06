import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";

function UnifiedClassifierNode({ selected }: NodeProps) {
  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 border-l-violet-500 bg-violet-50 dark:bg-violet-950/40 bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40" />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold">Unified Classifier</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
            AI Classification
          </span>
          <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
            3 Dimensions
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40" />
    </div>
  );
}

export default memo(UnifiedClassifierNode);
