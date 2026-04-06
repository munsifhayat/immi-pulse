import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import type { AgentMetadata } from "../board-data";

function DatabaseNode({ data, selected }: NodeProps) {
  const meta = data as AgentMetadata;

  return (
    <div
      className={`w-[280px] rounded-lg border border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 bg-card shadow-sm transition-shadow hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40" />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            PostgreSQL
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {meta.dbTables?.slice(0, 4).map((table) => (
            <span
              key={table}
              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {table}
            </span>
          ))}
          {meta.dbTables && meta.dbTables.length > 4 && (
            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              +{meta.dbTables.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(DatabaseNode);
