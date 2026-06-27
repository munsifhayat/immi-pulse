"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Info, ChevronDown } from "lucide-react";
import type { QuestionField, FieldType } from "@/lib/api/services";
import {
  RECIPE_TEMPLATES,
  type QuestionnaireTemplate,
} from "@/lib/questionnaire-templates";
import { AUDIENCE_OPTIONS, type BuilderMode } from "./constants";
import { FieldPalette } from "./FieldPalette";
import { CanvasFieldBlock } from "./CanvasFieldBlock";

interface Props {
  mode: BuilderMode;
  name: string;
  description: string;
  audience: string;
  fields: QuestionField[];
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onAudienceChange: (audience: string) => void;
  onAddField: (type: FieldType) => void;
  onUpdateField: (index: number, patch: Partial<QuestionField>) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (index: number, dir: -1 | 1) => void;
  onReorderFields: (from: number, to: number) => void;
  onApplyRecipe: (recipe: QuestionnaireTemplate) => void;
  selectedKey: string | null;
  onSelectField: (key: string | null) => void;
  highlightedKey: string | null;
  lastAddedIndex: number | null;
  branchingRevealedKeys: Set<string>;
  onRevealBranching: (key: string) => void;
  errorsByKey: Record<string, string[]>;
  fieldRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function BuilderCanvas({
  mode,
  name,
  description,
  audience,
  fields,
  detailsOpen,
  onDetailsOpenChange,
  onNameChange,
  onDescriptionChange,
  onAudienceChange,
  onAddField,
  onUpdateField,
  onRemoveField,
  onMoveField,
  onReorderFields,
  onApplyRecipe,
  selectedKey,
  onSelectField,
  highlightedKey,
  lastAddedIndex,
  branchingRevealedKeys,
  onRevealBranching,
  errorsByKey,
  fieldRefs,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.key === active.id);
    const to = fields.findIndex((f) => f.key === over.id);
    if (from >= 0 && to >= 0) onReorderFields(from, to);
  };

  const sortableIds = fields.map((f) => f.key);

  return (
    <div className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-5 lg:p-6">
      <Panel
        eyebrow="Details"
        title="Form details"
        description="Headline and copy your client sees on the public form."
        collapsible
        open={detailsOpen}
        onToggle={() => onDetailsOpenChange(!detailsOpen)}
        summary={
          !detailsOpen ? (
            <span className="truncate text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{name || "Untitled form"}</span>
              <span className="mx-2 text-muted-foreground/40">·</span>
              <span className="capitalize">{audience}</span>
            </span>
          ) : null
        }
      >
        <div className="space-y-5">
          <FieldShell label="Form name" htmlFor="q-name" required>
            <input
              id="q-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Employer intake"
              className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
            />
          </FieldShell>

          <FieldShell
            label="Description"
            htmlFor="q-desc"
            hint="Shown directly under the form title on the public page."
          >
            <textarea
              id="q-desc"
              rows={2}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="A short pre-case questionnaire for any new inquiry."
              className="block w-full resize-y rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] leading-[1.5] text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
            />
          </FieldShell>

          <FieldShell label="Audience" hint="Helps us route and triage the response correctly.">
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onAudienceChange(opt.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                      active
                        ? "border-purple bg-purple/10 text-purple-deep shadow-[0_0_0_3px_rgba(124,92,252,0.08)]"
                        : "border-border bg-background text-foreground hover:border-purple/40 hover:bg-purple/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </FieldShell>
        </div>
      </Panel>

      <Panel eyebrow="Add" title="Add a field" tight>
        <FieldPalette onAddField={onAddField} compact />
      </Panel>

      <Panel
        eyebrow="Canvas"
        title="Questions"
        description={
          mode === "advanced"
            ? "Drag to reorder. Logic blocks appear inline in plain English."
            : "Drag to reorder. Use “Add branching” on a field for conditional logic."
        }
        counter={fields.length}
      >
        <div className="flex items-start gap-3 rounded-xl border border-purple/15 bg-purple/[0.04] px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-deep" />
          <p className="text-[13px] leading-[1.55] text-foreground">
            <span className="font-medium">Always collected:</span>{" "}
            <span className="text-muted-foreground">
              first name, last name, email, phone. Add audience-specific questions below.
            </span>
          </p>
        </div>

        {fields.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-purple/30 bg-purple/[0.03] px-6 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple/10 text-purple-deep">
              <Plus className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[13.5px] font-medium text-foreground">Start building</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Pick a field type above — preview updates live on the right.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="mt-5 space-y-3">
                {fields.map((f, i) => (
                  <div
                    key={f.key}
                    ref={(el) => {
                      fieldRefs.current[i] = el;
                    }}
                  >
                    <CanvasFieldBlock
                      id={f.key}
                      index={i}
                      total={fields.length}
                      field={f}
                      allFields={fields}
                      mode={mode}
                      selected={selectedKey === f.key}
                      highlighted={lastAddedIndex === i || highlightedKey === f.key}
                      branchingRevealed={branchingRevealedKeys.has(f.key)}
                      onRevealBranching={() => onRevealBranching(f.key)}
                      errors={errorsByKey[f.key] ?? []}
                      availableTargets={fields.slice(0, i)}
                      onSelect={() => onSelectField(selectedKey === f.key ? null : f.key)}
                      onUpdate={(patch) => onUpdateField(i, patch)}
                      onRemove={() => onRemoveField(i)}
                      onMove={(dir) => onMoveField(i, dir)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Panel>

      {mode === "advanced" && (
        <Panel eyebrow="Recipes" title="Logic recipes" tight>
          <p className="-mt-0.5 mb-2 text-[11px] text-muted-foreground">
            Drop in a pre-wired branching form. Customise as needed.
          </p>
          <div className="space-y-1.5">
            {RECIPE_TEMPLATES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onApplyRecipe(r)}
                  className="group flex w-full items-start gap-2.5 rounded-lg border border-dashed border-purple/30 bg-purple/[0.03] px-2.5 py-2 text-left transition-all hover:border-purple/50 hover:bg-purple/[0.06]"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple/10 text-purple-deep">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-foreground">{r.name}</span>
                    <span className="block text-[10.5px] text-muted-foreground">
                      {r.fields.length} fields · {r.branchCount ?? "?"} branches
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  counter,
  tight,
  collapsible,
  open = true,
  onToggle,
  summary,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  counter?: number;
  tight?: boolean;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headerInner = (
    <>
      {eyebrow && (
        <span className="font-mono-d text-[10px] uppercase tracking-[0.28em] text-purple">
          {eyebrow}
        </span>
      )}
      <h2 className="font-heading text-[14px] font-medium tracking-tight text-foreground">
        {title}
      </h2>
      {summary && (
        <span className="hidden min-w-0 flex-1 truncate sm:inline">
          <span className="mx-2 text-muted-foreground/40">·</span>
          {summary}
        </span>
      )}
      {typeof counter === "number" && (
        <span className="ml-auto font-mono-d text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {counter} {counter === 1 ? "field" : "fields"}
        </span>
      )}
      {collapsible && (
        <span
          className={`ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all ${
            open ? "rotate-180 bg-muted text-foreground" : "hover:bg-muted hover:text-foreground"
          }`}
          aria-hidden
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(15,17,23,0.02)]">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-baseline gap-2 border-border/60 text-left transition-colors hover:bg-muted/30 ${
            tight ? "px-4 py-3" : "px-5 py-4"
          } ${open ? "border-b" : ""}`}
        >
          {headerInner}
        </button>
      ) : (
        <header
          className={`flex items-baseline gap-2 border-b border-border/60 ${
            tight ? "px-4 py-3" : "px-5 py-4"
          }`}
        >
          {headerInner}
        </header>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {description && !tight && (
              <p className="border-b border-border/40 bg-muted/30 px-5 py-2.5 text-[12px] leading-[1.55] text-muted-foreground">
                {description}
              </p>
            )}
            <div className={tight ? "p-4" : "p-5"}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function FieldShell({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-foreground"
      >
        {label}
        {required && <span className="ml-1 text-purple">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[12px] leading-[1.5] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
