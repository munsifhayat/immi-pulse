"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  GripVertical,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  ToggleLeft,
  CircleDot,
  ListChecks,
  Save,
  Loader2,
  Info,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import type { QuestionField, FieldType } from "@/lib/api/services";

type FieldDef = {
  value: FieldType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FIELD_TYPE_OPTIONS: FieldDef[] = [
  { value: "short_text", label: "Short text", hint: "One-line answer", icon: Type },
  { value: "long_text", label: "Long text", hint: "Paragraph", icon: AlignLeft },
  { value: "email", label: "Email", hint: "Validated email", icon: Mail },
  { value: "phone", label: "Phone", hint: "Tel input", icon: Phone },
  { value: "number", label: "Number", hint: "Numeric only", icon: Hash },
  { value: "date", label: "Date", hint: "Calendar picker", icon: Calendar },
  { value: "yes_no", label: "Yes / No", hint: "Two-option toggle", icon: ToggleLeft },
  { value: "single_select", label: "Single choice", hint: "Pick one", icon: CircleDot },
  { value: "multi_select", label: "Multiple choice", hint: "Pick many", icon: ListChecks },
];

const AUDIENCE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "individual", label: "Individual" },
  { value: "employer", label: "Employer" },
  { value: "onshore", label: "Onshore" },
  { value: "offshore", label: "Offshore" },
];

interface Props {
  initialName?: string;
  initialDescription?: string;
  initialAudience?: string;
  initialFields?: QuestionField[];
  saving?: boolean;
  saveLabel?: string;
  onSave: (payload: {
    name: string;
    description: string;
    audience: string;
    fields: QuestionField[];
  }) => Promise<void> | void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";

export function QuestionnaireBuilder({
  initialName = "",
  initialDescription = "",
  initialAudience = "general",
  initialFields = [],
  saving = false,
  saveLabel = "Save & publish",
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [audience, setAudience] = useState(initialAudience);
  const [fields, setFields] = useState<QuestionField[]>(initialFields);

  // Form details collapses by default when there are existing fields —
  // most edits focus on the field list, not the form name.
  const [detailsOpen, setDetailsOpen] = useState(initialFields.length === 0);

  // After "Add field", we scroll to it, briefly highlight it, and surface a
  // confirmation chip in the rail. lastAddedIndex clears itself after ~1.8s.
  const [lastAdded, setLastAdded] = useState<{
    index: number;
    label: string;
  } | null>(null);
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (lastAdded === null) return;
    const node = fieldRefs.current[lastAdded.index];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const t = setTimeout(() => setLastAdded(null), 2200);
    return () => clearTimeout(t);
  }, [lastAdded]);

  const addField = (type: FieldType) => {
    const def = FIELD_TYPE_OPTIONS.find((o) => o.value === type)!;
    const baseLabel =
      type === "email" ? "Email" : type === "phone" ? "Phone" : "New field";
    const newIndex = fields.length;
    setFields((f) => [
      ...f,
      {
        key: slugify(baseLabel) + "_" + (f.length + 1),
        label: baseLabel,
        type,
        required: false,
        options:
          type === "single_select" || type === "multi_select" ? ["Option 1"] : null,
      },
    ]);
    setLastAdded({ index: newIndex, label: def.label });
  };

  const updateField = (idx: number, patch: Partial<QuestionField>) =>
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const removeField = (idx: number) =>
    setFields((f) => f.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    setFields((f) => {
      const next = [...f];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const submit = async () => {
    const cleanFields = fields.map((f, i) => ({
      ...f,
      key: f.key && f.key.trim() ? f.key : slugify(f.label) + "_" + (i + 1),
    }));
    await onSave({ name, description, audience, fields: cleanFields });
  };

  const focusLastAdded = () => {
    if (lastAdded === null) return;
    const node = fieldRefs.current[lastAdded.index];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ── Main column ── */}
      <div className="space-y-8">
        {/* Form details — collapsible */}
        <Panel
          eyebrow="01"
          title="Form details"
          description="The headline and copy your client sees on the public form."
          collapsible
          open={detailsOpen}
          onToggle={() => setDetailsOpen((v) => !v)}
          summary={
            !detailsOpen ? (
              <span className="truncate text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {name || "Untitled form"}
                </span>
                <span className="mx-2 text-muted-foreground/40">·</span>
                <span className="capitalize">{audience}</span>
              </span>
            ) : null
          }
        >
          <div className="space-y-6">
            <FieldShell label="Form name" htmlFor="q-name" required>
              <input
                id="q-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setDescription(e.target.value)}
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
                      onClick={() => setAudience(opt.value)}
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

        {/* Fields */}
        <Panel
          eyebrow="02"
          title="Fields"
          description="Order the questions your applicant will answer. Drag with the handle, or use the arrows."
          counter={fields.length}
        >
          <div className="flex items-start gap-3 rounded-xl border border-purple/15 bg-purple/[0.04] px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-deep" />
            <p className="text-[13px] leading-[1.55] text-foreground">
              <span className="font-medium">Always collected:</span>{" "}
              <span className="text-muted-foreground">
                first name, last name, email, phone (mandatory on every form). Add the
                questions specific to this audience below.
              </span>
            </p>
          </div>

          {fields.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple/10 text-purple-deep">
                <Plus className="h-4 w-4" />
              </div>
              <p className="mt-4 text-[13.5px] text-foreground">
                No custom fields yet.
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Pick a field type from the right to begin.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {fields.map((f, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    fieldRefs.current[i] = el;
                  }}
                >
                  <FieldEditor
                    index={i}
                    total={fields.length}
                    field={f}
                    highlighted={lastAdded?.index === i}
                    onUpdate={(patch) => updateField(i, patch)}
                    onRemove={() => removeField(i)}
                    onMove={(dir) => move(i, dir)}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Right rail ── */}
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {/* Just-added confirmation chip */}
        <AnimatePresence>
          {lastAdded && (
            <motion.button
              type="button"
              onClick={focusLastAdded}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="group flex w-full items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-left shadow-[0_8px_24px_-16px_rgba(16,185,129,0.4)] hover:bg-emerald-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-emerald-900">
                  {lastAdded.label} field added
                </span>
                <span className="block text-[11px] text-emerald-700/80">
                  Click to scroll to it
                </span>
              </span>
              <ArrowDown className="h-3.5 w-3.5 text-emerald-700 transition-transform group-hover:translate-y-0.5" />
            </motion.button>
          )}
        </AnimatePresence>

        <Panel eyebrow="03" title="Add a field" tight>
          <div className="space-y-1.5">
            {FIELD_TYPE_OPTIONS.map((o) => {
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => addField(o.value)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-purple/40 hover:bg-purple/5 hover:shadow-[0_8px_20px_-12px_rgba(124,92,252,0.4)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-purple/10 group-hover:text-purple-deep">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground">
                      {o.label}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {o.hint}
                    </span>
                  </span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-purple" />
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Save action */}
        <button
          type="button"
          onClick={submit}
          disabled={saving || !name.trim()}
          className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-navy px-6 py-3.5 text-[14px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(124,92,252,0.7)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(120deg, #0F1117 0%, #3E1C96 60%, #7C5CFC 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/15 transition-transform duration-700 group-hover:translate-x-[400%]"
          />
          <span className="relative inline-flex items-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {saveLabel}
              </>
            )}
          </span>
        </button>
        <p className="text-center font-mono-d text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Saving creates a new version
        </p>
      </aside>
    </div>
  );
}

/* ────────────────────────────  Building blocks  ──────────────────────────── */

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
        <span className="font-mono-d text-[10.5px] uppercase tracking-[0.28em] text-purple">
          {eyebrow}
        </span>
      )}
      <h2 className="font-heading text-[15px] font-medium tracking-tight text-foreground whitespace-nowrap">
        {title}
      </h2>
      {summary && (
        <span className="hidden min-w-0 flex-1 truncate sm:inline">
          <span className="mx-2 text-muted-foreground/40">·</span>
          {summary}
        </span>
      )}
      {typeof counter === "number" && (
        <span className="ml-auto font-mono-d text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
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
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(15,17,23,0.02)]">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-baseline gap-3 border-border/60 text-left transition-colors hover:bg-muted/30 ${
            tight ? "px-5 py-3.5" : "px-7 py-5"
          } ${open ? "border-b" : ""}`}
        >
          {headerInner}
        </button>
      ) : (
        <header
          className={`flex items-baseline gap-3 border-b border-border/60 ${tight ? "px-5 py-3.5" : "px-7 py-5"}`}
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
              <p className="border-b border-border/40 bg-muted/30 px-7 py-3 text-[12.5px] leading-[1.55] text-muted-foreground">
                {description}
              </p>
            )}
            <div className={tight ? "p-5" : "p-7"}>{children}</div>
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
        <p className="mt-1.5 text-[12px] leading-[1.5] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function FieldEditor({
  index,
  total,
  field,
  highlighted,
  onUpdate,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  field: QuestionField;
  highlighted?: boolean;
  onUpdate: (patch: Partial<QuestionField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const typeDef =
    FIELD_TYPE_OPTIONS.find((o) => o.value === field.type) ||
    FIELD_TYPE_OPTIONS[0];
  const TypeIcon = typeDef.icon;

  return (
    <div
      className={`group relative rounded-xl border bg-background/60 transition-all duration-500 ${
        highlighted
          ? "border-purple/60 bg-purple/[0.04] shadow-[0_0_0_4px_rgba(124,92,252,0.10)]"
          : "border-border hover:border-purple/30"
      }`}
    >
      {/* Highlight pulse — subtle ring that expands then fades */}
      {highlighted && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-2xl border border-purple/30 animate-[fieldHighlight_1.2s_ease-out]"
        />
      )}

      <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-mono-d text-[10.5px] uppercase tracking-[0.2em] text-purple">
          #{String(index + 1).padStart(2, "0")}
        </span>

        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Question"
          className="ml-1 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/60 transition-colors hover:border-border focus:border-purple focus:bg-background focus:outline-none focus:ring-2 focus:ring-purple/15"
        />

        <div className="flex items-center gap-0.5">
          <IconBtn
            label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Remove" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-foreground">
            Type
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <TypeIcon className="h-3.5 w-3.5" />
            </span>
            <select
              value={field.type}
              onChange={(e) => onUpdate({ type: e.target.value as FieldType })}
              className="block w-full appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-[13.5px] text-foreground transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
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

        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
          <span>Required</span>
        </label>
      </div>

      {(field.type === "single_select" || field.type === "multi_select") && (
        <div className="border-t border-border/60 p-4">
          <label className="mb-1.5 block text-[12px] font-medium text-foreground">
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
            className="block w-full resize-y rounded-lg border border-border bg-background px-3.5 py-2.5 font-mono text-[12.5px] leading-[1.6] text-foreground transition-all hover:border-purple/40 focus:border-purple focus:outline-none focus:ring-4 focus:ring-purple/12"
          />
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
