"""Unit tests for the questionnaire conditional-logic rules engine.

Two test layers:
1. Shared-fixture tests — run every case in tests/fixtures/rule_eval_cases.json.
   The same fixture is consumed by the FE rulesEngine.ts tests, so a passing
   build here + a passing build there guarantees client/server parity.
2. Engine-specific tests — multi-field forms, clean_answers, missing_required,
   and the Pydantic schema validator for forward-reference rules.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.agents.immigration.questionnaires.rules_engine import (
    clean_answers,
    evaluate_rule,
    is_field_required,
    is_field_visible,
    missing_required,
    visible_field_keys,
)
from app.agents.immigration.questionnaires.schemas import QuestionnaireCreate


FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "fixtures" / "rule_eval_cases.json"
)


def _load_cases():
    with FIXTURE_PATH.open() as f:
        data = json.load(f)
    return data["cases"]


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["name"])
def test_rule_eval_fixture(case):
    """Each fixture case asserts both visibility and required-ness."""
    field = case["field"]
    answers = case["answers"]
    assert is_field_visible(field, answers) is case["expected_visible"], (
        f"{case['name']}: expected visible={case['expected_visible']}"
    )
    assert is_field_required(field, answers) is case["expected_required"], (
        f"{case['name']}: expected required={case['expected_required']}"
    )


def test_evaluate_rule_unknown_operator_is_false():
    rule = {"field_key": "x", "operator": "bogus_op", "value": 1}
    assert evaluate_rule(rule, {"x": 1}) is False


def test_evaluate_rule_missing_key_is_false():
    rule = {"operator": "equals", "value": 1}
    assert evaluate_rule(rule, {"x": 1}) is False


def test_visible_field_keys_and_clean_answers():
    fields = [
        {"key": "country", "label": "Country", "type": "short_text", "required": True},
        {
            "key": "visa",
            "label": "Visa",
            "type": "short_text",
            "required": False,
            "logic": {"visibility": {"mode": "show_if", "rules": [
                {"field_key": "country", "operator": "equals", "value": "Australia"},
            ]}},
        },
        {
            "key": "employer",
            "label": "Employer",
            "type": "short_text",
            "required": True,
            "logic": {"visibility": {"mode": "show_if", "rules": [
                {"field_key": "visa", "operator": "equals", "value": "482"},
            ]}},
        },
    ]
    answers = {"country": "Australia", "visa": "189", "employer": "TheAppsCo"}
    visible = visible_field_keys(fields, answers)
    assert visible == {"country", "visa"}  # employer hidden because visa != 482
    cleaned = clean_answers(fields, answers)
    assert cleaned == {"country": "Australia", "visa": "189"}  # employer dropped


def test_missing_required_skips_hidden_fields():
    """A required field that is hidden by logic must NOT count as missing."""
    fields = [
        {"key": "country", "label": "Country", "type": "short_text", "required": True},
        {
            "key": "employer",
            "label": "Employer",
            "type": "short_text",
            "required": True,
            "logic": {"visibility": {"mode": "show_if", "rules": [
                {"field_key": "country", "operator": "equals", "value": "Australia"},
            ]}},
        },
    ]
    # Country answered but != Australia — employer hidden — should NOT be missing
    assert missing_required(fields, {"country": "India"}) == []
    # Country == Australia — employer now visible & required & missing
    assert missing_required(fields, {"country": "Australia"}) == ["Employer"]


def test_missing_required_returns_labels_in_order():
    fields = [
        {"key": "a", "label": "Alpha", "type": "short_text", "required": True},
        {"key": "b", "label": "Bravo", "type": "short_text", "required": True},
    ]
    assert missing_required(fields, {}) == ["Alpha", "Bravo"]


def test_required_if_only_kicks_in_when_visible():
    fields = [
        {"key": "in_aus", "label": "In Australia?", "type": "yes_no", "required": True},
        {
            "key": "expiry",
            "label": "Visa expiry",
            "type": "date",
            "required": False,
            "logic": {
                "visibility": {"mode": "show_if", "rules": [
                    {"field_key": "in_aus", "operator": "equals", "value": "yes"},
                ]},
                "required_if": [
                    {"field_key": "in_aus", "operator": "equals", "value": "yes"},
                ],
            },
        },
    ]
    # in_aus=no — expiry hidden, not required
    assert missing_required(fields, {"in_aus": "no"}) == []
    # in_aus=yes, expiry missing — required-if kicks in
    assert missing_required(fields, {"in_aus": "yes"}) == ["Visa expiry"]


# ---------- Schema validator tests ----------


def test_create_rejects_forward_reference():
    """A rule that references a field appearing LATER must be rejected."""
    with pytest.raises(ValidationError) as exc:
        QuestionnaireCreate(
            name="Test",
            fields=[
                {
                    "key": "visa",
                    "label": "Visa",
                    "type": "short_text",
                    "required": False,
                    "logic": {"visibility": {"mode": "show_if", "rules": [
                        {"field_key": "country", "operator": "equals", "value": "Australia"},
                    ]}},
                },
                {"key": "country", "label": "Country", "type": "short_text", "required": True},
            ],
        )
    assert "appears later" in str(exc.value)


def test_create_rejects_unknown_field_key():
    with pytest.raises(ValidationError) as exc:
        QuestionnaireCreate(
            name="Test",
            fields=[
                {
                    "key": "visa",
                    "label": "Visa",
                    "type": "short_text",
                    "required": False,
                    "logic": {"visibility": {"mode": "show_if", "rules": [
                        {"field_key": "does_not_exist", "operator": "equals", "value": "x"},
                    ]}},
                },
            ],
        )
    assert "unknown key" in str(exc.value)


def test_create_rejects_self_reference():
    with pytest.raises(ValidationError) as exc:
        QuestionnaireCreate(
            name="Test",
            fields=[
                {
                    "key": "visa",
                    "label": "Visa",
                    "type": "short_text",
                    "required": False,
                    "logic": {"visibility": {"mode": "show_if", "rules": [
                        {"field_key": "visa", "operator": "equals", "value": "x"},
                    ]}},
                },
            ],
        )
    assert "referencing itself" in str(exc.value)


def test_create_rejects_duplicate_keys():
    with pytest.raises(ValidationError) as exc:
        QuestionnaireCreate(
            name="Test",
            fields=[
                {"key": "x", "label": "X1", "type": "short_text", "required": False},
                {"key": "x", "label": "X2", "type": "short_text", "required": False},
            ],
        )
    assert "Duplicate field key" in str(exc.value)


def test_create_accepts_valid_logic():
    """Sanity: a well-formed two-field form with correct ordering passes."""
    q = QuestionnaireCreate(
        name="Test",
        fields=[
            {"key": "country", "label": "Country", "type": "short_text", "required": True},
            {
                "key": "visa",
                "label": "Visa",
                "type": "short_text",
                "required": False,
                "logic": {"visibility": {"mode": "show_if", "rules": [
                    {"field_key": "country", "operator": "equals", "value": "Australia"},
                ]}},
                "flags": ["urgent"],
            },
        ],
    )
    assert q.fields[1].logic.visibility.mode == "show_if"
    assert q.fields[1].flags == ["urgent"]
