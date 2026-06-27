"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import type { QuestionField, FieldType } from "@/lib/api/services";
import {
  FIELD_TYPE_OPTIONS,
  type BuilderMode,
} from "./constants";
import {
  AddBranchingButton,
  CanvasLogicBlock,
} from "./CanvasLogicBlock";
import { fieldHasLogic, emptyRule } from "./logicUtils";

interface Props {
  id: string;
  index: number;
  total: number;
  field: QuestionField;
  allFields: QuestionField[];
  mode: BuilderMode;
  selected?: boolean;
  highlighted?: boolean;
  branchingRevealed: boolean;
  onRevealBranching: () => void;
  errors: string[];
  availableTargets: QuestionField[];
  onSelect: () => void;
  onUpdate: (patch: Partial<QuestionField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function CanvasFieldBlock({
  id,
  index,
  total,
  field,
  allFields,
  mode,
  selected,
  highlighted,
  branchingRevealed,
  onRevealBranching,
  errors,
  availableTargets,
  onSelect,
  onUpdate,
  onRemove,
  onMove,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  const typeDef =
    FIELD_TYPE_OPTIONS.find((o) => o.value === field.type) || FIELD_TYPE_OPTIONS[0];
  const TypeIcon = typeDef.icon;
  const hasErrors = errors.length > 0;

  const showLogicBlock =
    mode === "advanced" || branchingRevealed || fieldHasLogic(field);

  const startBranching = () => {
    onRevealBranching();
    if (!field.logic?.visibility || field.logic.visibility.mode === "always") {
      onUpdate({
        logic: {
          visibility: {
            mode: "show_if",
            rules: availableTargets.length > 0 ? [emptyRule(availableTargets)] : [],
          },
          required_if: field.logic?.required_if ?? [],
        },
      });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative rounded-xl border bg-background transition-all duration-300 ${
        hasErrors
          ? "border-rose-300 bg-rose-50/30"
          : selected
            ? "border-purple ring-2 ring-purple/20"
            : highlighted
              ? "border-purple/60 bg-purple/[0.04] shadow-[0_0_0_4px_rgba(124,92,252,0.10)]"
              : "border-border hover:border-purple/30"
      }`}
    >
      {highlighted && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-2xl border border-purple/30 animate-[fieldHighlight_1.2s_ease-out]"
        />
      )}

      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-mono-d text-[10px] uppercase tracking-[0.2em] text-purple">
          #{String(index + 1).padStart(2, "0")}
        </span>

        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Question"
          className="ml-1 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/60 transition-colors hover:border-border focus:border-purple focus:bg-background focus:outline-none focus:ring-2 focus:ring-purple/15"
        />

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Remove" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      {showLogicBlock ? (
        <div onClick={(e) => e.stopPropagation()}>
          <CanvasLogicBlock
            field={field}
            allFields={allFields}
            availableTargets={availableTargets}
            onChange={onUpdate}
            defaultExpanded={mode === "advanced" && !fieldHasLogic(field)}
            forceShow={branchingRevealed || mode === "advanced"}
          />
        </div>
      ) : (
        mode === "standard" &&
        !fieldHasLogic(field) && (
          <div onClick={(e) => e.stopPropagation()}>
            <AddBranchingButton onClick={startBranching} />
          </div>
        )
      )}

      <div
        className="grid gap-4 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <label className="mb-1 block text-[12px] font-medium text-foreground">Type</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <TypeIcon className="h-3.5 w-3.5" />
            </span>
            <select
              value={field.type}
              onChange={(e) => onUpdate({ type: e.target.value as FieldType })}
              className="block w-full appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-[13px] text-foreground transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
            >
              {FIELD_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <ArrowDown className="h-3 w-3" />
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
          <span>Required</span>
        </label>
      </div>

      {(field.type === "single_select" || field.type === "multi_select") && (
        <div className="border-t border-border/60 p-3" onClick={(e) => e.stopPropagation()}>
          <label className="mb-1 block text-[12px] font-medium text-foreground">
            Options
            <span className="ml-2 font-mono-d text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              one per line
            </span>
          </label>
          <textarea
            rows={3}
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onUpdate({
                options: e.target.value
                  .split("\n")
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            className="block w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] leading-[1.6] text-foreground transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
          />
        </div>
      )}

      {hasErrors && (
        <div className="border-t border-rose-200 bg-rose-50/60 px-3 py-2">
          <div className="flex items-start gap-2 text-[12px] text-rose-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              {errors.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
