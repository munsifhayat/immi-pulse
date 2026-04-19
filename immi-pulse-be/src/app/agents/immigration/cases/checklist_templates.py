"""Prerequisite document checklists per Australian visa subclass."""

from __future__ import annotations

from typing import Any

# Each entry: id (stable slug), label, description, document_type, required.
# document_type MUST match the values used by the document_analyzer so items
# can auto-link to uploaded documents.
_SKILLED_CORE: list[dict[str, Any]] = [
    {
        "id": "passport",
        "label": "Current passport (bio page)",
        "description": "Must be valid for at least 12 months from lodgement.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "skills_assessment",
        "label": "Positive skills assessment",
        "description": "From the relevant assessing authority for your nominated occupation.",
        "document_type": "skills_assessment",
        "required": True,
    },
    {
        "id": "english_test",
        "label": "English language test results",
        "description": "IELTS, PTE Academic, TOEFL iBT, OET, or Cambridge C1 Advanced.",
        "document_type": "english_test",
        "required": True,
    },
    {
        "id": "education",
        "label": "Qualifications & transcripts",
        "description": "Degree certificates and academic transcripts from all tertiary study.",
        "document_type": "education",
        "required": True,
    },
    {
        "id": "cv",
        "label": "Current CV / résumé",
        "description": "Detailed with roles, dates, and responsibilities for the last 10 years.",
        "document_type": "cv",
        "required": True,
    },
    {
        "id": "employment_references",
        "label": "Employment reference letters",
        "description": "On company letterhead, with dates, role title, duties, and hours.",
        "document_type": "employment_reference",
        "required": True,
    },
    {
        "id": "police_check",
        "label": "Police clearance certificates",
        "description": "From every country lived in for 12+ months in the last 10 years.",
        "document_type": "police_check",
        "required": True,
    },
    {
        "id": "form_80",
        "label": "Form 80 — Personal particulars",
        "description": "Department of Home Affairs character form.",
        "document_type": "form_80",
        "required": True,
    },
]

_STUDENT_CORE: list[dict[str, Any]] = [
    {
        "id": "passport",
        "label": "Current passport (bio page)",
        "description": "Must remain valid for the duration of your study.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "coe",
        "label": "Confirmation of Enrolment (CoE)",
        "description": "From your registered Australian education provider.",
        "document_type": "coe",
        "required": True,
    },
    {
        "id": "gte",
        "label": "Genuine Temporary Entrant statement",
        "description": "Statement of purpose explaining your study plans and ties to home.",
        "document_type": "gte",
        "required": True,
    },
    {
        "id": "english_test",
        "label": "English test results (if applicable)",
        "description": "IELTS / PTE / TOEFL scores meeting the provider's threshold.",
        "document_type": "english_test",
        "required": True,
    },
    {
        "id": "financial_capacity",
        "label": "Evidence of financial capacity",
        "description": "12 months of tuition + living costs + travel — bank statements or sponsorship letter.",
        "document_type": "bank_statement",
        "required": True,
    },
    {
        "id": "oshc",
        "label": "Overseas Student Health Cover",
        "description": "OSHC for the full duration of stay.",
        "document_type": "oshc",
        "required": True,
    },
    {
        "id": "education_transcripts",
        "label": "Academic transcripts",
        "description": "Previous qualifications and transcripts.",
        "document_type": "education",
        "required": True,
    },
]

_EMPLOYER_SPONSORED: list[dict[str, Any]] = [
    {
        "id": "passport",
        "label": "Current passport (bio page)",
        "description": "Must be valid for at least 12 months from lodgement.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "nomination",
        "label": "Employer nomination approval",
        "description": "Approved nomination from the sponsoring employer.",
        "document_type": "nomination",
        "required": True,
    },
    {
        "id": "skills_assessment",
        "label": "Skills assessment (if required)",
        "description": "For occupations on the relevant skilled list.",
        "document_type": "skills_assessment",
        "required": False,
    },
    {
        "id": "english_test",
        "label": "English language test results",
        "description": "IELTS 5.0+ each band (or equivalent) is the baseline for 482.",
        "document_type": "english_test",
        "required": True,
    },
    {
        "id": "cv",
        "label": "Current CV / résumé",
        "description": "Detailed with roles, dates, and responsibilities for the last 5 years.",
        "document_type": "cv",
        "required": True,
    },
    {
        "id": "employment_references",
        "label": "Employment reference letters",
        "description": "Demonstrating at least 2 years of relevant experience.",
        "document_type": "employment_reference",
        "required": True,
    },
    {
        "id": "police_check",
        "label": "Police clearance certificates",
        "description": "From every country lived in for 12+ months in the last 10 years.",
        "document_type": "police_check",
        "required": True,
    },
]

_PARTNER_CORE: list[dict[str, Any]] = [
    {
        "id": "passport_applicant",
        "label": "Applicant passport (bio page)",
        "description": "Applicant's current passport.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "passport_sponsor",
        "label": "Sponsor passport / citizenship",
        "description": "Sponsor's Australian passport or citizenship certificate.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "relationship_evidence",
        "label": "Evidence of relationship",
        "description": "Joint bills, photos, statutory declarations, travel records.",
        "document_type": "relationship_evidence",
        "required": True,
    },
    {
        "id": "form_80",
        "label": "Form 80 — Personal particulars",
        "description": "Character form for both applicant and sponsor if needed.",
        "document_type": "form_80",
        "required": True,
    },
    {
        "id": "form_888",
        "label": "Form 888 statutory declarations (x2)",
        "description": "From Australian citizens / PRs who know the couple.",
        "document_type": "form_888",
        "required": True,
    },
    {
        "id": "police_check",
        "label": "Police clearance certificates",
        "description": "From every country lived in for 12+ months in the last 10 years.",
        "document_type": "police_check",
        "required": True,
    },
]

_VISITOR_CORE: list[dict[str, Any]] = [
    {
        "id": "passport",
        "label": "Current passport (bio page)",
        "description": "Must remain valid for the intended stay plus 6 months.",
        "document_type": "passport",
        "required": True,
    },
    {
        "id": "financial_capacity",
        "label": "Evidence of funds",
        "description": "Recent bank statements showing capacity to support the trip.",
        "document_type": "bank_statement",
        "required": True,
    },
    {
        "id": "itinerary",
        "label": "Travel itinerary",
        "description": "Flight bookings, accommodation, and day-to-day plan.",
        "document_type": "itinerary",
        "required": False,
    },
    {
        "id": "invitation",
        "label": "Invitation letter (if visiting family)",
        "description": "From an Australian host — include their status and address.",
        "document_type": "invitation",
        "required": False,
    },
    {
        "id": "employment_letter",
        "label": "Employment / study evidence",
        "description": "Demonstrates ties to home country.",
        "document_type": "employment_reference",
        "required": False,
    },
]


TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "189": _SKILLED_CORE,
    "190": _SKILLED_CORE,
    "491": _SKILLED_CORE,
    "186": _EMPLOYER_SPONSORED,
    "482": _EMPLOYER_SPONSORED,
    "494": _EMPLOYER_SPONSORED,
    "500": _STUDENT_CORE,
    "485": _STUDENT_CORE,
    "820": _PARTNER_CORE,
    "309": _PARTNER_CORE,
    "600": _VISITOR_CORE,
    "601": _VISITOR_CORE,
}


def get_template(visa_subclass: str | None) -> list[dict[str, Any]]:
    """Return a fresh checklist list for the given visa subclass.

    Falls back to the skilled-core template so even unknown inquiries get a
    sensible starter set that the consultant can curate.
    """
    if not visa_subclass:
        return [dict(item, status="pending") for item in _SKILLED_CORE]
    key = visa_subclass.strip()
    items = TEMPLATES.get(key, _SKILLED_CORE)
    return [dict(item, status="pending") for item in items]
