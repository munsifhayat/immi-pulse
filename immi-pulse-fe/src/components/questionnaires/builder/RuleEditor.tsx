"use client";

/**
 * RuleEditor — thin popover wrapper around LogicSentenceEditor for legacy
 * attachment points. Primary editing happens on-canvas via CanvasLogicBlock.
 */

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { QuestionField } from "@/lib/api/services";
import { LogicSentenceEditor } from "./LogicSentenceEditor";
import { fieldHasLogic } from "./logicUtils";

interface Props {
  field: QuestionField;
  availableTargets: QuestionField[];
  onChange: (next: Partial<QuestionField>) => void;
}

export function RuleEditor({ field, availableTargets, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const hasLogic = fieldHasLogic(field);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
            hasLogic
              ? "border-purple/40 bg-purple/10 text-purple-deep hover:bg-purple/15"
              : "border-border bg-background text-muted-foreground hover:border-purple/40 hover:text-purple"
          }`}
          title="Add conditional logic"
        >
          <GitBranch className="h-3 w-3" />
          {hasLogic ? "Edit logic" : "Add logic"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[440px] max-h-[80vh] overflow-y-auto p-0"
      >
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <div className="font-mono-d text-[10px] uppercase tracking-[0.22em] text-purple">
            Conditional logic
          </div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-foreground">
            {field.label || field.key}
          </div>
        </div>
        <div className="p-4">
          <LogicSentenceEditor
            field={field}
            availableTargets={availableTargets}
            onChange={onChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
