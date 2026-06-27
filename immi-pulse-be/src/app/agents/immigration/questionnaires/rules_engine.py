"""Conditional-logic rules engine for questionnaire fields.

Pure functions — no DB, no I/O. Mirror this contract exactly in the
frontend TypeScript port (src/lib/questionnaires/rulesEngine.ts) so client
and server agree on which fields are visible.

A field may carry `logic` (visibility + required-if rules). At fill time
and at submission time, we walk the field list in order and compute which
fields are visible. Fields hidden by their rules:
  - never count toward "required" validation
  - have their answers dropped before persistence

A Rule references another field's key. Cycles are impossible because rules
can only reference fields that appear *earlier* in the form (enforced at
authoring time by the UI; defensively allowed here — we treat unknown or
not-yet-evaluated keys as having no answer).
"""

from __future__ import annotations

from typing import Any, Iterable


OPERATORS = (
    "equals",
    "not_equals",
    "is_one_of",
    "is_not_one_of",
    "is_empty",
    "is_not_empty",
    "contains",
)

VISIBILITY_MODES = ("always", "show_if", "hide_if")


def _is_blank(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, str) and v.strip() == "":
        return True
    if isinstance(v, (list, tuple, dict)) and len(v) == 0:
        return True
    return False


def _as_list(v: Any) -> list:
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def evaluate_rule(rule: dict, answers: dict[str, Any]) -> bool:
    """Evaluate a single rule against the current answers dict.

    Rule shape: {"field_key": str, "operator": str, "value": Any}.
    Returns False for unknown operators (fail-safe — don't accidentally
    show urgent fields from a malformed rule).
    """
    key = rule.get("field_key")
    op = rule.get("operator")
    expected = rule.get("value")
    if not key or op not in OPERATORS:
        return False
    actual = answers.get(key)

    if op == "is_empty":
        return _is_blank(actual)
    if op == "is_not_empty":
        return not _is_blank(actual)
    if op == "equals":
        return actual == expected
    if op == "not_equals":
        return actual != expected
    if op == "is_one_of":
        return actual in _as_list(expected)
    if op == "is_not_one_of":
        return actual not in _as_list(expected)
    if op == "contains":
        if isinstance(actual, str) and isinstance(expected, str):
            return expected.lower() in actual.lower()
        if isinstance(actual, list):
            return expected in actual
        return False
    return False


def evaluate_rules_all(rules: Iterable[dict], answers: dict[str, Any]) -> bool:
    """AND-composition: True only when every rule passes (or no rules)."""
    rules = list(rules)
    if not rules:
        return True
    return all(evaluate_rule(r, answers) for r in rules)


def is_field_visible(field: dict, answers: dict[str, Any]) -> bool:
    """Return True if `field` should be shown given `answers`.

    Visibility config:
      logic.visibility = {"mode": "always" | "show_if" | "hide_if",
                          "rules": [Rule]}
    Default (no logic block) is "always visible".
    """
    logic = field.get("logic") or {}
    visibility = logic.get("visibility") or {}
    mode = visibility.get("mode") or "always"
    rules = visibility.get("rules") or []

    if mode == "always":
        return True
    if mode == "show_if":
        return evaluate_rules_all(rules, answers)
    if mode == "hide_if":
        return not evaluate_rules_all(rules, answers)
    return True


def is_field_required(field: dict, answers: dict[str, Any]) -> bool:
    """Return True if the field is required given the current answers.

    Required = base `required` flag OR every `required_if` rule passes.
    A hidden field is never required (caller should check visibility first
    but we also short-circuit here for safety).
    """
    if not is_field_visible(field, answers):
        return False
    if field.get("required"):
        return True
    logic = field.get("logic") or {}
    required_if = logic.get("required_if") or []
    if not required_if:
        return False
    return evaluate_rules_all(required_if, answers)


def visible_field_keys(fields: list[dict], answers: dict[str, Any]) -> set[str]:
    """Compute the set of visible field keys for the given answers."""
    return {f["key"] for f in fields if is_field_visible(f, answers)}


def clean_answers(
    fields: list[dict], answers: dict[str, Any]
) -> dict[str, Any]:
    """Strip answers for fields that are not visible. Defends against
    tampered or stale submissions where the client sent values for hidden
    fields. Unknown answer keys (no matching field) are also dropped.
    """
    visible = visible_field_keys(fields, answers)
    return {k: v for k, v in answers.items() if k in visible}


def missing_required(
    fields: list[dict], answers: dict[str, Any]
) -> list[str]:
    """Return labels of required-and-visible fields that have no answer."""
    out: list[str] = []
    for f in fields:
        if not is_field_required(f, answers):
            continue
        if _is_blank(answers.get(f["key"])):
            out.append(f.get("label") or f.get("key") or "Required field")
    return out
