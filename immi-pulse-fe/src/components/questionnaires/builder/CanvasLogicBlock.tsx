"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GitBranch, Pencil } from "lucide-react";
import type { QuestionField } from "@/lib/api/services";
import { LogicSentenceEditor } from "./LogicSentenceEditor";
import {
  describeRequiredIf,
  describeVisibility,
  fieldHasLogic,
} from "./logicUtils";

interface Props {
  field: QuestionField;
  allFields: QuestionField[];
  availableTargets: QuestionField[];
  onChange: (patch: Partial<QuestionField>) => void;
  /** Standard mode: collapsed summary until expanded */
  defaultExpanded?: boolean;
  forceShow?: boolean;
}

export function CanvasLogicBlock({
  field,
  allFields,
  availableTargets,
  onChange,
  defaultExpanded = false,
  forceShow = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded || fieldHasLogic(field));

  const vis = field.logic?.visibility;
  const visSentence =
    vis && vis.mode !== "always"
      ? describeVisibility(vis.mode, vis.rules ?? [], allFields, field.label || field.key)
      : null;
  const reqSentence = describeRequiredIf(field.logic?.required_if ?? [], allFields);
  const hasContent = fieldHasLogic(field) || forceShow;

  if (!hasContent) return null;

  const flagLabels = (field.flags ?? []).map((f) => f.replace("_", " "));

  return (
    <div className="mx-3 mb-2 rounded-lg border border-dashed border-purple/40 bg-purple/[0.04]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-purple/[0.06]"
      >
        <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-deep" />
        <div className="min-w-0 flex-1 space-y-1">
          {visSentence && (
            <p className="text-[12.5px] leading-snug text-purple-deep">
              <span className="font-medium">{visSentence}</span>
            </p>
          )}
          {reqSentence && (
            <p className="text-[12px] leading-snug text-muted-foreground">{reqSentence}</p>
          )}
          {flagLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {flagLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium capitalize text-amber-800"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          {!visSentence && !reqSentence && flagLabels.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground">Configure branching rules</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-purple">
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Close
            </>
          ) : (
            <>
              <Pencil className="h-3 w-3" />
              Edit
            </>
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-dashed border-purple/30 px-3 py-3">
          <LogicSentenceEditor
            field={field}
            availableTargets={availableTargets}
            onChange={onChange}
            compact
          />
        </div>
      )}
    </div>
  );
}

/** CTA for Standard mode when field has no logic yet */
export function AddBranchingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-purple/30 bg-transparent px-3 py-1.5 text-[11.5px] font-medium text-purple-deep transition-colors hover:border-purple/50 hover:bg-purple/[0.04]"
    >
      <GitBranch className="h-3 w-3" />
      Add branching
    </button>
  );
}
