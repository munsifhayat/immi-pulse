"""Subscription plan catalog.

Model: simple per-seat pricing on every plan. Plans gate **features**, not seat counts.

  - Each seat (regardless of role) is billed at the plan's per-seat price.
  - Role (owner / admin / consultant / staff) is purely a permission level —
    it does not affect billing.
  - There are no seat caps. Growth = more seats × per-seat price.

Tiers:
  - Starter      : entry-level features, low per-seat price.
  - Professional : full AI platform, marketplace presence, predictive analytics.
  - Enterprise   : everything + SSO / on-prem / custom AI training. Custom-priced.
"""

from typing import TypedDict


class Plan(TypedDict):
    tier: str
    name: str
    description: str
    price_per_seat_aud_monthly: int  # 0 == free (early access) or custom (enterprise)
    price_label: str  # short marketing label for the price line
    is_default_signup: bool
    is_custom: bool  # true for enterprise (no self-serve)
    features: list[str]


PLAN_CATALOG: list[Plan] = [
    {
        "tier": "starter",
        "name": "Starter",
        "description": "For solo OMARA agents starting their first cases on the platform.",
        "price_per_seat_aud_monthly": 200,
        "price_label": "A$200 / seat / month",
        "is_default_signup": False,
        "is_custom": False,
        "features": [
            "Up to 20 active cases",
            "Email intake & AI classification",
            "Visa checklists & document tracker",
            "Client portal (read-only)",
            "Community support",
        ],
    },
    {
        "tier": "pro",
        "name": "Professional",
        "description": "The full AI workspace for practices scaling beyond a single agent.",
        "price_per_seat_aud_monthly": 450,
        "price_label": "A$450 / seat / month",
        "is_default_signup": True,
        "is_custom": False,
        "features": [
            "Unlimited active cases",
            "AI document validation & OCR",
            "Smart checklists with progress tracking",
            "Predictive case analytics & insights",
            "Marketplace listing for new client leads",
            "Engagement letters & native e-sign",
            "Priority support",
        ],
    },
    {
        "tier": "enterprise",
        "name": "Enterprise",
        "description": "For multi-office firms with custom volume, SSO and integration needs.",
        "price_per_seat_aud_monthly": 0,
        "price_label": "Custom pricing",
        "is_default_signup": False,
        "is_custom": True,
        "features": [
            "Everything in Professional",
            "SSO (SAML / OIDC)",
            "Custom AI model training",
            "On-premise deployment option",
            "Dedicated account manager",
            "SLA & uptime guarantee",
            "Custom integrations",
        ],
    },
]

PLAN_BY_TIER: dict[str, Plan] = {p["tier"]: p for p in PLAN_CATALOG}

TRIAL_DAYS = 14
DEFAULT_SIGNUP_TIER = next(p["tier"] for p in PLAN_CATALOG if p["is_default_signup"])


def get_plan(tier: str) -> Plan | None:
    return PLAN_BY_TIER.get(tier)


def price_per_seat(tier: str) -> int:
    p = PLAN_BY_TIER.get(tier)
    return p["price_per_seat_aud_monthly"] if p else 0
