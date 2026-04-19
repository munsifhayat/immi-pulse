"""Mock inbound emails for the lawyer showcase demo.

These are the emails a consultant 'receives' in the demo. Each one comes with
a pre-computed AI classification so the demo can narrate:
  1. Email arrives from client.
  2. AI reads it, extracts details, proposes a visa pathway.
  3. Consultant clicks 'Create case' and the seeded summary + checklist land
     on a real case row.

The list is static on purpose — reset via POST /demo/reset to clear any case
rows that were spawned from these emails during the last demo run.
"""

from __future__ import annotations

from typing import Any

DEMO_EMAILS: list[dict[str, Any]] = [
    {
        "id": "demo-email-priya-189",
        "from_name": "Priya Sharma",
        "from_email": "priya.sharma@gmail.com",
        "subject": "Enquiry: Skilled migration to Australia from India",
        "received_at": "2026-04-17T07:42:00Z",
        "preview": (
            "Hi, I'm a software engineer with 6+ years of experience at Infosys "
            "in Bengaluru. I hold a Master's in Computer Applications..."
        ),
        "body": (
            "Hi there,\n\n"
            "My name is Priya Sharma. I came across your practice through a "
            "colleague who migrated to Melbourne last year on your guidance.\n\n"
            "A bit about me: I am 32, Indian citizen, currently working as a "
            "Senior Software Engineer at Infosys Bengaluru (6 years, 4 of those "
            "in full-stack roles). I hold a Master of Computer Applications from "
            "VTU (2017).\n\n"
            "My IELTS from March this year is 8.0 overall (L 8.5, R 8.0, W 7.5, "
            "S 7.5). I'm single, no dependants, and no adverse character history. "
            "My passport was renewed last October and is valid until 2034.\n\n"
            "I'd love to know if I qualify for a skilled independent visa and "
            "what the realistic timeline looks like. I can send documents whenever "
            "you're ready.\n\n"
            "Thanks,\nPriya\n+91 98765 43210"
        ),
        "has_attachments": False,
        "is_read": False,
        "classification": {
            "category": "New Inquiry",
            "is_immigration_inquiry": True,
            "urgency": "normal",
            "confidence": 0.94,
        },
        "ai_summary": {
            "summary": (
                "Priya Sharma, a 32-year-old Indian software engineer with 6 years "
                "at Infosys Bengaluru and a Master of Computer Applications, is "
                "enquiring about skilled independent migration to Australia. IELTS "
                "8.0 overall (no band below 7.5), passport valid to 2034, no "
                "dependants, and no character concerns."
            ),
            "key_points": [
                "Senior Software Engineer at Infosys — 6 years experience (4 full-stack)",
                "Master of Computer Applications, VTU (2017)",
                "IELTS 8.0 overall — L 8.5 / R 8.0 / W 7.5 / S 7.5",
                "Passport valid until 2034",
                "Single, no dependants, clean character history",
            ],
            "proposed_visa_subclass": "189",
            "proposed_visa_name": "Skilled Independent (Subclass 189)",
            "confidence": 0.91,
            "reasoning": (
                "ANZSCO 261313 Software Engineer is on the MLTSSL. Master's plus 6 "
                "years of skilled employment points strongly to a 189 pathway with "
                "EOI points in the competitive range (Age 30, English 20, Education "
                "15, Experience 10 = 75+). Skills assessment (ACS) is the gating "
                "document — consider 190/491 as backup if state sponsorship opens."
            ),
            "extracted_details": {
                "client_name": "Priya Sharma",
                "age": 32,
                "nationality": "Indian",
                "occupation": "Senior Software Engineer",
                "anzsco_code": "261313",
                "employer": "Infosys Bengaluru",
                "years_experience": 6,
                "education": "Master of Computer Applications (VTU, 2017)",
                "english_test": "IELTS 8.0 overall (L 8.5 / R 8.0 / W 7.5 / S 7.5)",
                "passport_expiry": "2034",
                "dependants": 0,
            },
            "source_email": {
                "from": "Priya Sharma <priya.sharma@gmail.com>",
                "received_at": "2026-04-17T07:42:00Z",
                "subject": "Enquiry: Skilled migration to Australia from India",
            },
        },
        "case_defaults": {
            "client_name": "Priya Sharma",
            "client_email": "priya.sharma@gmail.com",
            "client_phone": "+91 98765 43210",
            "visa_subclass": "189",
            "visa_name": "Skilled Independent (Subclass 189)",
            "stage": "consultation",
            "priority": "normal",
            "source": "email",
            "notes": (
                "Inbound email inquiry. ACS skills assessment is the next step "
                "before EOI lodgement. Confirm IELTS validity window (valid 3 years)."
            ),
        },
    },
    {
        "id": "demo-email-liam-482",
        "from_name": "Liam O'Connor",
        "from_email": "liam.oconnor@acmetech.com.au",
        "subject": "Sponsoring a senior DevOps engineer — need help with 482",
        "received_at": "2026-04-17T06:18:00Z",
        "preview": (
            "G'day. Our company Acme Tech (SBS accredited) wants to sponsor our "
            "Dublin-based DevOps lead for a 482 Skills in Demand visa..."
        ),
        "body": (
            "G'day,\n\n"
            "I'm the COO at Acme Tech — we're an accredited sponsor, Australian "
            "owned, based in North Sydney. We'd like to move our Dublin-based "
            "Senior DevOps Engineer, Sean Walsh, to Sydney on a 482 visa.\n\n"
            "Sean has 9 years of experience, AWS/Kubernetes/Terraform heavy, "
            "salary offer AUD 165,000 + super. He's 34, Irish passport, wife and "
            "one child (3yo) on dependants. IELTS not done yet but he's happy to "
            "sit it.\n\n"
            "Happy to provide the nomination paperwork whenever you need it. "
            "What's the fastest path?\n\n"
            "Cheers,\nLiam"
        ),
        "has_attachments": True,
        "is_read": False,
        "classification": {
            "category": "New Inquiry",
            "is_immigration_inquiry": True,
            "urgency": "high",
            "confidence": 0.92,
        },
        "ai_summary": {
            "summary": (
                "Acme Tech (accredited Australian sponsor) seeks a Subclass 482 "
                "Skills in Demand visa for Sean Walsh, a 34-year-old Irish DevOps "
                "engineer currently in Dublin. 9 years experience, AWS/Kubernetes/"
                "Terraform, AUD 165k salary, dependants = spouse + 1 child. English "
                "test not yet completed."
            ),
            "key_points": [
                "Acme Tech is an accredited sponsor — eligible for priority processing",
                "Applicant Sean Walsh, 34, Irish, 9 years DevOps experience",
                "Salary AUD 165k exceeds TSMIT by wide margin",
                "2 dependants (spouse + 1 child)",
                "English test outstanding — must be completed before lodgement",
            ],
            "proposed_visa_subclass": "482",
            "proposed_visa_name": "Skills in Demand (Subclass 482)",
            "confidence": 0.93,
            "reasoning": (
                "ANZSCO DevOps Engineer maps to the Core Skills list. Accredited "
                "sponsor status unlocks priority processing (≤14 days). Salary well "
                "above TSMIT. Main gate: IELTS/PTE 5.0+ in each band before decision."
            ),
            "extracted_details": {
                "client_name": "Sean Walsh (sponsored by Acme Tech)",
                "sponsor": "Acme Tech Pty Ltd",
                "sponsor_status": "Accredited",
                "applicant_age": 34,
                "applicant_nationality": "Irish",
                "occupation": "Senior DevOps Engineer",
                "years_experience": 9,
                "salary_aud": 165000,
                "dependants": 2,
                "english_test": "Not completed",
            },
            "source_email": {
                "from": "Liam O'Connor <liam.oconnor@acmetech.com.au>",
                "received_at": "2026-04-17T06:18:00Z",
                "subject": "Sponsoring a senior DevOps engineer — need help with 482",
            },
        },
        "case_defaults": {
            "client_name": "Sean Walsh",
            "client_email": "liam.oconnor@acmetech.com.au",
            "client_phone": None,
            "visa_subclass": "482",
            "visa_name": "Skills in Demand (Subclass 482)",
            "stage": "consultation",
            "priority": "high",
            "source": "email",
            "notes": (
                "Employer-sponsored 482 via Acme Tech (accredited). Priority "
                "processing available. English test outstanding — flag before nomination."
            ),
        },
    },
    {
        "id": "demo-email-yuki-500",
        "from_name": "Yuki Tanaka",
        "from_email": "yuki.tanaka@outlook.jp",
        "subject": "Student visa for Master's in Data Science at Monash",
        "received_at": "2026-04-17T05:05:00Z",
        "preview": (
            "Hello, I received an offer from Monash University for a Master of "
            "Data Science starting July 2026 and I'd like to apply for a 500..."
        ),
        "body": (
            "Hello,\n\n"
            "I'm Yuki Tanaka from Tokyo. I got an unconditional offer for Master "
            "of Data Science at Monash (start July 2026, 2 years). My IELTS is "
            "7.0 overall, no band below 6.5.\n\n"
            "My parents will sponsor the tuition (~AUD 90k) and living costs. I "
            "have an existing bank balance of about AUD 120k equivalent in JPY "
            "that my father would pay on my behalf.\n\n"
            "Is 500 the right visa, and what documents should I start gathering?\n\n"
            "Regards,\nYuki"
        ),
        "has_attachments": False,
        "is_read": False,
        "classification": {
            "category": "New Inquiry",
            "is_immigration_inquiry": True,
            "urgency": "normal",
            "confidence": 0.96,
        },
        "ai_summary": {
            "summary": (
                "Yuki Tanaka, Japanese national, enquiring about a Subclass 500 "
                "Student visa for a Master of Data Science at Monash University "
                "(July 2026 intake). Parents will sponsor ~AUD 90k tuition plus "
                "living costs; existing family funds ~AUD 120k equivalent."
            ),
            "key_points": [
                "Monash University — Master of Data Science, 2-year program",
                "Intake: July 2026",
                "IELTS 7.0 overall (≥6.5 each band)",
                "Funds source: parental sponsorship + ~AUD 120k savings",
                "GTE statement required — strong case given offer + funds",
            ],
            "proposed_visa_subclass": "500",
            "proposed_visa_name": "Student (Subclass 500)",
            "confidence": 0.96,
            "reasoning": (
                "Unconditional CoE from Monash meets the primary criterion. IELTS "
                "7.0 easily clears the 6.5 Monash requirement. Financials look "
                "solid but the sponsor letter from parents + source-of-funds "
                "evidence will be the key documents."
            ),
            "extracted_details": {
                "client_name": "Yuki Tanaka",
                "nationality": "Japanese",
                "institution": "Monash University",
                "course": "Master of Data Science",
                "duration_years": 2,
                "intake": "July 2026",
                "english_test": "IELTS 7.0 overall (each band ≥6.5)",
                "tuition_aud": 90000,
                "funds_evidence_aud": 120000,
                "sponsor": "Parents",
            },
            "source_email": {
                "from": "Yuki Tanaka <yuki.tanaka@outlook.jp>",
                "received_at": "2026-04-17T05:05:00Z",
                "subject": "Student visa for Master's in Data Science at Monash",
            },
        },
        "case_defaults": {
            "client_name": "Yuki Tanaka",
            "client_email": "yuki.tanaka@outlook.jp",
            "client_phone": None,
            "visa_subclass": "500",
            "visa_name": "Student (Subclass 500)",
            "stage": "consultation",
            "priority": "normal",
            "source": "email",
            "notes": (
                "500 pathway — parental sponsorship, strong English and funds. "
                "GTE statement will be decisive; draft early."
            ),
        },
    },
    {
        "id": "demo-email-newsletter",
        "from_name": "Department of Home Affairs",
        "from_email": "updates@homeaffairs.gov.au",
        "subject": "April 2026 skilled migration occupation list update",
        "received_at": "2026-04-16T22:11:00Z",
        "preview": (
            "The Core Skills Occupation List has been updated effective 1 May 2026. "
            "Key changes affect software engineering, cybersecurity, and nursing..."
        ),
        "body": "Routine policy update — no client action required.",
        "has_attachments": True,
        "is_read": True,
        "classification": {
            "category": "Government Correspondence",
            "is_immigration_inquiry": False,
            "urgency": "low",
            "confidence": 0.99,
        },
        "ai_summary": None,
        "case_defaults": None,
    },
    {
        "id": "demo-email-existing-update",
        "from_name": "Maria Santos",
        "from_email": "maria.santos@yahoo.com",
        "subject": "Re: 482 nomination — updated payslips attached",
        "received_at": "2026-04-16T18:34:00Z",
        "preview": (
            "Hi, please find the last three payslips as requested. I've also "
            "asked my employer to send the updated reference letter directly..."
        ),
        "body": "3 payslips attached as requested.",
        "has_attachments": True,
        "is_read": True,
        "classification": {
            "category": "Document Submission",
            "is_immigration_inquiry": False,
            "urgency": "normal",
            "confidence": 0.88,
        },
        "ai_summary": None,
        "case_defaults": None,
    },
]


def get_demo_email(email_id: str) -> dict[str, Any] | None:
    for email in DEMO_EMAILS:
        if email["id"] == email_id:
            return email
    return None
