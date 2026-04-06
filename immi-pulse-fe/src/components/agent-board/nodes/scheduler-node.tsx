import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import type { AgentMetadata } from "../board-data";

function SchedulerNode({ data, selected }: NodeProps) {
  const meta = data as AgentMetadata;

  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-950/40 bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {meta.scheduledTasks?.slice(0, 3).map((task) => (
            <span
              key={task.name}
              className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300"
            >
              {task.name}
            </span>
          ))}
          {meta.scheduledTasks && meta.scheduledTasks.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300">
              +{meta.scheduledTasks.length - 3}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40" />
    </div>
  );
}

export default memo(SchedulerNode);
