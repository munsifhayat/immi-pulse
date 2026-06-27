"use client";

import { Plus } from "lucide-react";
import type { FieldType } from "@/lib/api/services";
import { FIELD_TYPE_OPTIONS } from "./constants";

interface Props {
  onAddField: (type: FieldType) => void;
  compact?: boolean;
}

export function FieldPalette({ onAddField, compact }: Props) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {FIELD_TYPE_OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onAddField(o.value)}
              title={o.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition-all hover:border-purple/40 hover:bg-purple/5"
            >
              <Icon className="h-3 w-3 text-muted-foreground" />
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {FIELD_TYPE_OPTIONS.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onAddField(o.value)}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-purple/40 hover:bg-purple/5 hover:shadow-[0_8px_20px_-12px_rgba(124,92,252,0.4)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-purple/10 group-hover:text-purple-deep">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium text-foreground">{o.label}</span>
              <span className="block text-[10.5px] text-muted-foreground">{o.hint}</span>
            </span>
            <Plus className="h-3 w-3 text-muted-foreground/60 transition-colors group-hover:text-purple" />
          </button>
        );
      })}
    </div>
  );
}
