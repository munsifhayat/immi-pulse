import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";

function SharedServicesNode({ selected }: NodeProps) {
  return (
    <div
      className={`w-[200px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="p-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Shared Services
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/70">
            Parser
          </span>
          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/70">
            Attachments
          </span>
          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/70">
            Logging
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/20" />
    </div>
  );
}

export default memo(SharedServicesNode);
