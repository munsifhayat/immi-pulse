/**
 * Conditional-logic rules engine for questionnaire fields — TypeScript port.
 *
 * MUST mirror the Python implementation in
 *   immi-pulse-be/src/app/agents/immigration/questionnaires/rules_engine.py
 * exactly. Both sides share a fixture
 *   immi-pulse-be/tests/fixtures/rule_eval_cases.json
 * so divergence is caught in either pytest or vitest.
 */

import type {
  FieldLogic,
  QuestionField,
  Rule,
  RuleOperator,
} from "@/lib/api/services";

const OPERATORS: RuleOperator[] = [
  "equals",
  "not_equals",
  "is_one_of",
  "is_not_one_of",
  "is_empty",
  "is_not_empty",
  "contains",
];

export type Answers = Record<string, unknown>;

const isBlank = (v: unknown): boolean => {
  if (v === undefined || v === null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === "object" && v !== null && Object.keys(v).length === 0)
    return true;
  return false;
};

const asList = (v: unknown): unknown[] => {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v;
  return [v];
};

export function evaluateRule(rule: Rule, answers: Answers): boolean {
  const { field_key, operator, value: expected } = rule;
  if (!field_key || !OPERATORS.includes(operator)) return false;
  const actual = answers[field_key];

  switch (operator) {
    case "is_empty":
      return isBlank(actual);
    case "is_not_empty":
      return !isBlank(actual);
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "is_one_of":
      return asList(expected).includes(actual as never);
    case "is_not_one_of":
      return !asList(expected).includes(actual as never);
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase().includes(expected.toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected as never);
      }
      return false;
    default:
      return false;
  }
}

export function evaluateRulesAll(
  rules: Rule[] | undefined,
  answers: Answers,
): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every((r) => evaluateRule(r, answers));
}

export function isFieldVisible(
  field: QuestionField,
  answers: Answers,
): boolean {
  const logic: FieldLogic | null | undefined = field.logic;
  const visibility = logic?.visibility;
  const mode = visibility?.mode ?? "always";
  const rules = visibility?.rules ?? [];

  if (mode === "always") return true;
  if (mode === "show_if") return evaluateRulesAll(rules, answers);
  if (mode === "hide_if") return !evaluateRulesAll(rules, answers);
  return true;
}

export function isFieldRequired(
  field: QuestionField,
  answers: Answers,
): boolean {
  if (!isFieldVisible(field, answers)) return false;
  if (field.required) return true;
  const requiredIf = field.logic?.required_if ?? [];
  if (requiredIf.length === 0) return false;
  return evaluateRulesAll(requiredIf, answers);
}

export function visibleFieldKeys(
  fields: QuestionField[],
  answers: Answers,
): Set<string> {
  const out = new Set<string>();
  for (const f of fields) {
    if (isFieldVisible(f, answers)) out.add(f.key);
  }
  return out;
}

export function cleanAnswers(
  fields: QuestionField[],
  answers: Answers,
): Answers {
  const visible = visibleFieldKeys(fields, answers);
  const result: Answers = {};
  for (const k of Object.keys(answers)) {
    if (visible.has(k)) result[k] = answers[k];
  }
  return result;
}

export function missingRequired(
  fields: QuestionField[],
  answers: Answers,
): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (!isFieldRequired(f, answers)) continue;
    if (isBlank(answers[f.key])) {
      out.push(f.label || f.key || "Required field");
    }
  }
  return out;
}

/* --- Authoring-time validators (used by the RuleEditor UI) --- */

/**
 * Returns a list of error messages explaining why a set of fields wouldn't
 * pass server-side validation. Empty array = valid. Used to render inline
 * warnings under a misconfigured field.
 */
export function validateFieldRules(
  fields: QuestionField[],
): { fieldKey: string; message: string }[] {
  const errors: { fieldKey: string; message: string }[] = [];
  const seenKeys = new Set<string>();
  const dupes = new Set<string>();
  for (const f of fields) {
    if (seenKeys.has(f.key)) dupes.add(f.key);
    seenKeys.add(f.key);
  }
  for (const dup of dupes) {
    errors.push({
      fieldKey: dup,
      message: `Duplicate field key "${dup}". Each field needs a unique key.`,
    });
  }
  const seenSoFar = new Set<string>();
  for (const f of fields) {
    const rules = [
      ...(f.logic?.visibility?.rules ?? []),
      ...(f.logic?.required_if ?? []),
    ];
    for (const r of rules) {
      if (r.field_key === f.key) {
        errors.push({
          fieldKey: f.key,
          message: `Rule references the field itself.`,
        });
      } else if (!seenKeys.has(r.field_key)) {
        errors.push({
          fieldKey: f.key,
          message: `Rule references unknown field "${r.field_key}".`,
        });
      } else if (!seenSoFar.has(r.field_key)) {
        errors.push({
          fieldKey: f.key,
          message: `Rule references "${r.field_key}", which appears later in the form. Move it above this field.`,
        });
      }
    }
    seenSoFar.add(f.key);
  }
  return errors;
}
