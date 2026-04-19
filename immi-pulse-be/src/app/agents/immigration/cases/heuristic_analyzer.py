"""Filename-based heuristic document analyzer — demo-reliable fallback.

Runs instantly and without any external dependencies so the client portal
and consultant dashboard always show AI-style flags the moment a file is
uploaded. If the real (Bedrock-backed) analyzer later produces a stronger
result, it will overwrite whatever this heuristic wrote.
"""

from __future__ import annotations

from typing import Any

_TYPE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("passport", ["passport", "bio", "biopage"]),
    ("english_test", ["ielts", "pte", "toefl", "oet", "english"]),
    ("skills_assessment", ["skills", "acs", "vetassess", "engineers", "tra"]),
    ("police_check", ["police", "afp", "national-police", "pcc", "clearance"]),
    ("education", ["degree", "transcript", "diploma", "bachelor", "masters"]),
    ("cv", ["cv", "resume", "résumé"]),
    ("employment_reference", ["reference", "employment", "experience", "letter"]),
    ("bank_statement", ["bank", "statement", "savings", "balance"]),
    ("form_80", ["form80", "form-80", "form_80"]),
    ("form_1221", ["form1221", "form-1221", "form_1221"]),
    ("form_888", ["form888", "form-888", "form_888"]),
    ("nomination", ["nomination", "sponsor"]),
    ("coe", ["coe", "enrolment", "enrollment"]),
    ("gte", ["gte", "genuine"]),
    ("oshc", ["oshc", "health-cover"]),
    ("relationship_evidence", ["relationship", "joint", "partner", "photos"]),
    ("itinerary", ["itinerary", "flight"]),
    ("invitation", ["invitation", "invite"]),
]


def _match_type(lowered: str) -> str | None:
    for doc_type, keys in _TYPE_KEYWORDS:
        if any(k in lowered for k in keys):
            return doc_type
    return None


def _flags_for_passport(lowered: str) -> tuple[list[str], list[str], str]:
    flags: list[str] = []
    suggestions: list[str] = []
    if "expired" in lowered or "expires" in lowered:
        flags.append("Passport appears to expire within 6 months.")
        suggestions.append(
            "Ask the client to renew their passport before lodgement — DHA requires "
            "at least 12 months validity from lodgement date."
        )
    if "damaged" in lowered:
        flags.append("Filename hints at a damaged or illegible bio-data page.")
        suggestions.append("Request a clearer scan of the photo page.")
    status = "flagged" if flags else "validated"
    return flags, suggestions, status


def _flags_for_english(lowered: str) -> tuple[list[str], list[str], str]:
    flags: list[str] = []
    suggestions: list[str] = []
    if any(tok in lowered for tok in ["5-0", "5_0", "_5", "low"]):
        flags.append("Test score appears to be below the 6.0 competent-English threshold.")
        suggestions.append("Verify each band — GSM 189/190 requires 6.0 minimum in every band.")
    if "old" in lowered or "2022" in lowered or "2023" in lowered:
        flags.append("Test may be older than the 3-year validity window.")
        suggestions.append("Confirm the test date and arrange a resit if expired.")
    status = "flagged" if flags else "validated"
    return flags, suggestions, status


def _flags_for_police(lowered: str) -> tuple[list[str], list[str], str]:
    flags: list[str] = []
    suggestions: list[str] = []
    if "national" in lowered and "afp" not in lowered:
        flags.append("Appears to be a state/national police certificate — DHA wants the AFP check.")
        suggestions.append("Request an AFP Name Check with Code 33 — Visa/Immigration Enquiry.")
    status = "flagged" if flags else "validated"
    return flags, suggestions, status


def _flags_for_bank(lowered: str) -> tuple[list[str], list[str], str]:
    flags: list[str] = []
    suggestions: list[str] = []
    if "1-month" in lowered or "1month" in lowered or "one-month" in lowered:
        flags.append("Bank statement covers only ~1 month — DHA typically wants 3-6 months.")
        suggestions.append("Ask the client for statements going back at least 3 months.")
    status = "flagged" if flags else "validated"
    return flags, suggestions, status


def _flags_for_cv(lowered: str) -> tuple[list[str], list[str], str]:
    flags: list[str] = []
    suggestions: list[str] = []
    if "draft" in lowered:
        flags.append("CV file name marked as 'draft' — verify this is the final version.")
        suggestions.append("Confirm this is the CV the client wants submitted.")
    status = "flagged" if flags else "validated"
    return flags, suggestions, status


def heuristic_analyze(file_name: str, file_bytes: bytes | None = None) -> dict[str, Any]:
    """Return an ai_analysis-compatible dict based on the file name.

    Always returns a usable dict so the UI can render immediately. If it can't
    confidently classify the file, the status stays at 'pending' so the real
    Bedrock-backed analyzer has space to take over later.
    """
    lowered = (file_name or "").lower()
    doc_type = _match_type(lowered)
    confidence = 0.72 if doc_type else 0.35

    flags: list[str] = []
    suggestions: list[str] = []
    status = "validated"
    if doc_type == "passport":
        flags, suggestions, status = _flags_for_passport(lowered)
    elif doc_type == "english_test":
        flags, suggestions, status = _flags_for_english(lowered)
    elif doc_type == "police_check":
        flags, suggestions, status = _flags_for_police(lowered)
    elif doc_type == "bank_statement":
        flags, suggestions, status = _flags_for_bank(lowered)
    elif doc_type == "cv":
        flags, suggestions, status = _flags_for_cv(lowered)

    if not doc_type:
        status = "pending"

    # Size-based sanity check — anything under 2 KB is almost certainly a mis-upload.
    if file_bytes is not None and len(file_bytes) > 0 and len(file_bytes) < 2048:
        flags.append("File is very small — may be blank, truncated, or a placeholder.")
        suggestions.append("Ask the client to re-upload the full document.")
        status = "flagged"

    return {
        "document_type": doc_type,
        "confidence": confidence,
        "status": status,
        "flags": flags,
        "suggestions": suggestions,
        "source": "heuristic",
    }
