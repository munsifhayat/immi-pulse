import type { QuestionField, Rule, RuleOperator, VisibilityMode } from "@/lib/api/services";

export const OPERATOR_LABELS: {
  value: RuleOperator;
  label: string;
  needsValue: boolean;
  needsList?: boolean;
}[] = [
  { value: "equals", label: "is", needsValue: true },
  { value: "not_equals", label: "is not", needsValue: true },
  { value: "is_one_of", label: "is one of", needsValue: true, needsList: true },
  { value: "is_not_one_of", label: "is not one of", needsValue: true, needsList: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "is_not_empty", label: "is not empty", needsValue: false },
];

export function fieldLabel(fields: QuestionField[], key: string): string {
  return fields.find((f) => f.key === key)?.label || key;
}

export function formatRuleValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "…";
  if (Array.isArray(value)) return value.join(" / ");
  return String(value);
}

export function describeRule(rule: Rule, fields: QuestionField[]): string {
  const target = fieldLabel(fields, rule.field_key);
  const op = OPERATOR_LABELS.find((o) => o.value === rule.operator)?.label ?? rule.operator;
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${target} ${op}`;
  }
  return `${target} ${op} "${formatRuleValue(rule.value)}"`;
}

export function describeVisibility(
  mode: VisibilityMode,
  rules: Rule[],
  fields: QuestionField[],
  fieldLabelText: string,
): string | null {
  if (mode === "always" || rules.length === 0) return null;
  const when = rules.map((r) => describeRule(r, fields)).join(" AND ");
  const action = mode === "show_if" ? "Show" : "Hide";
  return `When ${when} → ${action} "${fieldLabelText}"`;
}

export function describeRequiredIf(rules: Rule[], fields: QuestionField[]): string | null {
  if (rules.length === 0) return null;
  const when = rules.map((r) => describeRule(r, fields)).join(" AND ");
  return `When ${when} → Require field`;
}

export function fieldHasLogic(field: QuestionField): boolean {
  const vis = field.logic?.visibility;
  const hasVis = vis && vis.mode !== "always" && (vis.rules?.length ?? 0) > 0;
  const hasReq = (field.logic?.required_if?.length ?? 0) > 0;
  const hasFlags = (field.flags?.length ?? 0) > 0;
  return !!(hasVis || hasReq || hasFlags);
}

export function emptyRule(targets: QuestionField[]): Rule {
  const firstKey = targets[0]?.key ?? "";
  return { field_key: firstKey, operator: "equals", value: "" };
}
