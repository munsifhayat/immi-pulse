"use client";

import { ChevronDown, Plus, Trash2, Wand2 } from "lucide-react";
import type {
  FieldLogic,
  OutcomeFlag,
  QuestionField,
  Rule,
  RuleOperator,
  VisibilityMode,
} from "@/lib/api/services";
import { emptyRule, OPERATOR_LABELS } from "./logicUtils";

interface Props {
  field: QuestionField;
  availableTargets: QuestionField[];
  onChange: (next: Partial<QuestionField>) => void;
  compact?: boolean;
}

const FLAGS: { value: OutcomeFlag; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "border-rose-400 bg-rose-50 text-rose-700" },
  { value: "qualified", label: "Qualified", color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "disqualified", label: "Disqualified", color: "border-slate-400 bg-slate-50 text-slate-700" },
  { value: "more_info", label: "More info", color: "border-amber-400 bg-amber-50 text-amber-700" },
];

function normalise(logic: FieldLogic | null | undefined): Required<FieldLogic> {
  return {
    visibility: {
      mode: logic?.visibility?.mode ?? "always",
      rules: logic?.visibility?.rules ?? [],
    },
    required_if: logic?.required_if ?? [],
  };
}

export function LogicSentenceEditor({ field, availableTargets, onChange, compact }: Props) {
  const logic = normalise(field.logic);
  const noTargets = availableTargets.length === 0;

  const patchLogic = (next: Required<FieldLogic>) => onChange({ logic: next });

  const setMode = (mode: VisibilityMode) =>
    patchLogic({
      ...logic,
      visibility: {
        mode,
        rules:
          mode === "always"
            ? []
            : logic.visibility.rules.length > 0
              ? logic.visibility.rules
              : [emptyRule(availableTargets)],
      },
    });

  const addVisRule = () =>
    patchLogic({
      ...logic,
      visibility: {
        ...logic.visibility,
        rules: [...logic.visibility.rules, emptyRule(availableTargets)],
      },
    });

  const setVisRule = (i: number, next: Rule) =>
    patchLogic({
      ...logic,
      visibility: {
        ...logic.visibility,
        rules: logic.visibility.rules.map((r, idx) => (idx === i ? next : r)),
      },
    });

  const removeVisRule = (i: number) =>
    patchLogic({
      ...logic,
      visibility: {
        ...logic.visibility,
        rules: logic.visibility.rules.filter((_, idx) => idx !== i),
      },
    });

  const addReqRule = () =>
    patchLogic({ ...logic, required_if: [...logic.required_if, emptyRule(availableTargets)] });

  const setReqRule = (i: number, next: Rule) =>
    patchLogic({
      ...logic,
      required_if: logic.required_if.map((r, idx) => (idx === i ? next : r)),
    });

  const removeReqRule = (i: number) =>
    patchLogic({ ...logic, required_if: logic.required_if.filter((_, idx) => idx !== i) });

  const toggleFlag = (flag: OutcomeFlag) => {
    const current = new Set(field.flags ?? []);
    if (current.has(flag)) current.delete(flag);
    else current.add(flag);
    onChange({ flags: current.size > 0 ? Array.from(current) : null });
  };

  if (noTargets) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Add at least one field <em>before</em> this one to reference in a rule.
      </p>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "p-1"}`}>
      {/* Visibility — sentence chips */}
      <Section title="When… then show or hide">
        <div className="flex flex-wrap gap-1.5">
          {(["always", "show_if", "hide_if"] as VisibilityMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                logic.visibility.mode === m
                  ? "border-purple bg-purple/10 text-purple-deep"
                  : "border-border bg-background text-muted-foreground hover:border-purple/40"
              }`}
            >
              {m === "always" ? "Always visible" : m === "show_if" ? "Show when…" : "Hide when…"}
            </button>
          ))}
        </div>

        {logic.visibility.mode !== "always" && (
          <div className="mt-3 space-y-2">
            {logic.visibility.rules.map((r, i) => (
              <SentenceRuleRow
                key={i}
                prefix={logic.visibility.mode === "show_if" ? "Show if" : "Hide if"}
                rule={r}
                targets={availableTargets}
                onChange={(next) => setVisRule(i, next)}
                onRemove={() => removeVisRule(i)}
              />
            ))}
            <button
              type="button"
              onClick={addVisRule}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-purple/30 bg-purple/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-purple-deep transition-colors hover:bg-purple/[0.06]"
            >
              <Plus className="h-3 w-3" />
              Add condition (AND)
            </button>
          </div>
        )}
      </Section>

      {/* Required-if */}
      <Section title="Require only when…">
        {logic.required_if.length === 0 ? (
          <button
            type="button"
            onClick={addReqRule}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-purple/40 hover:bg-purple/5"
          >
            <Plus className="h-3 w-3" />
            Add required-if rule
          </button>
        ) : (
          <div className="space-y-2">
            {logic.required_if.map((r, i) => (
              <SentenceRuleRow
                key={i}
                prefix="Require if"
                rule={r}
                targets={availableTargets}
                onChange={(next) => setReqRule(i, next)}
                onRemove={() => removeReqRule(i)}
              />
            ))}
            <button
              type="button"
              onClick={addReqRule}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-purple/40"
            >
              <Plus className="h-3 w-3" />
              Add condition (AND)
            </button>
          </div>
        )}
      </Section>

      {/* Outcome flags */}
      <Section title="Outcome flag">
        <div className="flex flex-wrap gap-1.5">
          {FLAGS.map((f) => {
            const active = (field.flags ?? []).includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFlag(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active ? f.color : "border-border bg-background text-muted-foreground hover:border-foreground/40"
                }`}
              >
                <Wand2 className="h-3 w-3" />
                {f.label}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono-d text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function SentenceRuleRow({
  prefix,
  rule,
  targets,
  onChange,
  onRemove,
}: {
  prefix: string;
  rule: Rule;
  targets: QuestionField[];
  onChange: (r: Rule) => void;
  onRemove: () => void;
}) {
  const operatorDef = OPERATOR_LABELS.find((o) => o.value === rule.operator)!;
  const target = targets.find((t) => t.key === rule.field_key) ?? null;
  const showValue = operatorDef.needsValue;
  const isList = operatorDef.needsList;
  const isSelectTarget =
    target?.type === "single_select" ||
    target?.type === "multi_select" ||
    target?.type === "yes_no";

  const selectOptions = (() => {
    if (target?.type === "yes_no") return ["yes", "no"];
    if (target?.type === "single_select" || target?.type === "multi_select") {
      return target.options ?? [];
    }
    return [];
  })();

  return (
    <div className="rounded-lg border border-purple/20 bg-white/80 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-deep">
          {prefix}
        </span>
        <select
          value={rule.field_key}
          onChange={(e) => onChange({ ...rule, field_key: e.target.value, value: "" })}
          className="min-w-0 max-w-[140px] rounded-md border border-border bg-background px-2 py-1 text-[12px] font-medium text-foreground focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/15"
        >
          {targets.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label || t.key}
            </option>
          ))}
        </select>
        <select
          value={rule.operator}
          onChange={(e) =>
            onChange({
              ...rule,
              operator: e.target.value as RuleOperator,
              value:
                OPERATOR_LABELS.find((o) => o.value === e.target.value)?.needsValue === false
                  ? null
                  : rule.value,
            })
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/15"
        >
          {OPERATOR_LABELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove rule"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {showValue && (
        <div className="mt-2 pl-1">
          {isList ? (
            <ListValueInput
              value={
                Array.isArray(rule.value)
                  ? (rule.value as string[])
                  : rule.value
                    ? [String(rule.value)]
                    : []
              }
              options={isSelectTarget ? selectOptions : undefined}
              onChange={(v) => onChange({ ...rule, value: v })}
            />
          ) : isSelectTarget ? (
            <div className="relative">
              <select
                value={typeof rule.value === "string" ? rule.value : ""}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                className="block w-full appearance-none rounded-md border border-border bg-background px-2 py-1 pr-7 text-[12px] text-foreground focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/15"
              >
                <option value="">— pick value —</option>
                {selectOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : (
            <input
              type={target?.type === "number" ? "number" : "text"}
              value={
                typeof rule.value === "string" || typeof rule.value === "number"
                  ? String(rule.value)
                  : ""
              }
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="value"
              className="block w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/15"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ListValueInput({
  value,
  options,
  onChange,
}: {
  value: string[];
  options?: string[];
  onChange: (v: string[]) => void;
}) {
  if (options && options.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const checked = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])
              }
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                checked
                  ? "border-purple bg-purple/10 text-purple-deep"
                  : "border-border bg-background text-muted-foreground hover:border-purple/40"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <textarea
      rows={2}
      value={value.join("\n")}
      onChange={(e) =>
        onChange(
          e.target.value
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
        )
      }
      placeholder="One value per line"
      className="block w-full resize-y rounded-md border border-border bg-background px-2 py-1 font-mono text-[11.5px] text-foreground focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/15"
    />
  );
}
