"""
Compliance Rules Engine — deterministic rules for Australian property compliance.

Maps (state, compliance_type) → obligation requirements based on legislation.
No AI — just knows Australian law across 9 compliance types × 8 states.

Data sourced from government websites, tenancy authorities, and legislative
instruments as of March 2026.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from app.agents.compliance.scorer import SEVERITY_WEIGHTS


@dataclass
class ComplianceRule:
    compliance_type: str
    state: str
    required: bool
    frequency_months: Optional[int]  # None = ongoing / no fixed cycle
    requires_certificate: bool
    penalty_range: str
    legislation_ref: str
    description: str
    conditions: list[str] = field(default_factory=list)  # e.g., ["has_pool"]


# ── RULES DATABASE ──────────────────────────────────────────────────────
# Key: (state, compliance_type) → ComplianceRule

COMPLIANCE_RULES: dict[tuple[str, str], ComplianceRule] = {
    # ═══════════════════════════════════════════
    # SMOKE ALARMS
    # ═══════════════════════════════════════════

    ("QLD", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="QLD", required=True,
        frequency_months=12, requires_certificate=True,
        penalty_range="Up to $4,032",
        legislation_ref="Fire and Emergency Services Act 1990",
        description="Interconnected photoelectric alarms (AS 3786:2014) in every bedroom, hallway, and level. Test before each new tenancy. Replace every 10 years.",
    ),
    ("NSW", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="NSW", required=True,
        frequency_months=12, requires_certificate=False,
        penalty_range="Up to $2,200",
        legislation_ref="Environmental Planning & Assessment Regulation 2021",
        description="Photoelectric alarms on every level. Mains-powered for post-2006 builds. Must be working at start of each tenancy.",
    ),
    ("VIC", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="VIC", required=True,
        frequency_months=12, requires_certificate=True,
        penalty_range="Up to $5,000",
        legislation_ref="Building Regulations 2018; Residential Tenancies Act 1997",
        description="Photoelectric alarms on all habitable rooms and hallways. Annual safety check mandatory from Nov 2025. Hardwired for post-1997 builds.",
    ),
    ("SA", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="SA", required=True,
        frequency_months=12, requires_certificate=False,
        penalty_range="Fines under Housing Safety Authority",
        legislation_ref="Development Regulations 2008",
        description="Photoelectric recommended. Mains-hardwired for post-1995 homes. Check before each new tenancy.",
    ),
    ("WA", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="WA", required=True,
        frequency_months=12, requires_certificate=True,
        penalty_range="Up to $5,000",
        legislation_ref="Building Regulations 2012",
        description="Photoelectric alarms (AS 3786:2014). Mains-powered with battery backup. Existing homes must comply by Feb 2026.",
    ),
    ("TAS", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="TAS", required=True,
        frequency_months=12, requires_certificate=False,
        penalty_range="Penalties under Residential Tenancy Act",
        legislation_ref="Residential Tenancy (Smoke Alarms) Regulations 2022",
        description="Mains-powered or 10-year sealed battery. Replaceable-battery alarms do not comply. Check before each tenancy.",
    ),
    ("ACT", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="ACT", required=True,
        frequency_months=12, requires_certificate=False,
        penalty_range="Penalties under Residential Tenancies Act",
        legislation_ref="Building (General) Regulation 2008",
        description="AS 3786 compliant alarms on hallways and each level. Check before each tenancy.",
    ),
    ("NT", "smoke_alarm"): ComplianceRule(
        compliance_type="smoke_alarm", state="NT", required=True,
        frequency_months=12, requires_certificate=False,
        penalty_range="Penalties under Building Act",
        legislation_ref="Building Regulations; Residential Tenancies Act 1999",
        description="AS 3786 compliant alarms in all dwellings. Annual check by landlord.",
    ),

    # ═══════════════════════════════════════════
    # ELECTRICAL SAFETY / RCDs
    # ═══════════════════════════════════════════

    ("VIC", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="VIC", required=True,
        frequency_months=24, requires_certificate=True,
        penalty_range="Up to $11,095",
        legislation_ref="Residential Tenancies Act 1997 (s 30D, s 35)",
        description="Mandatory electrical safety check every 2 years by licensed electrician. At least 2 RCDs on all power circuits. Records kept 5 years.",
    ),
    ("WA", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="WA", required=True,
        frequency_months=None, requires_certificate=True,
        penalty_range="Up to $15,000 (individuals) / $100,000 (corporations)",
        legislation_ref="Electricity Regulations 1947 (amended Oct 2025)",
        description="RCDs required on ALL final sub-circuits (from Oct 2025). Certificate of Electrical Compliance at each new tenancy.",
    ),
    ("QLD", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="QLD", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Electrical Safety Act",
        legislation_ref="Electrical Safety Act 2002",
        description="At least 2 RCDs on power circuits. No mandatory periodic check but property must be electrically safe.",
    ),
    ("NSW", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="NSW", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Up to $5,500",
        legislation_ref="Residential Tenancies Act 2010; Home Building Act 1989",
        description="Safety switches on all power and lighting circuits. No mandatory periodic check.",
    ),
    ("SA", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="SA", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Residential Tenancies Act",
        legislation_ref="Electricity Act 1996",
        description="At least 1 RCD on power circuits (best practice 2+). No mandatory periodic check.",
    ),
    ("TAS", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="TAS", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Residential Tenancy Act",
        legislation_ref="Building Regulations",
        description="At least 2 RCDs on power circuits for new installations. Landlord must ensure electrical safety.",
    ),
    ("ACT", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="ACT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Residential Tenancies Act",
        legislation_ref="Building (General) Regulation 2008",
        description="At least 2 RCDs required. No mandatory periodic check.",
    ),
    ("NT", "electrical_safety"): ComplianceRule(
        compliance_type="electrical_safety", state="NT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Building Act",
        legislation_ref="Building Regulations",
        description="RCDs required on power circuits. Landlord must maintain safe premises.",
    ),

    # ═══════════════════════════════════════════
    # POOL / SPA BARRIERS
    # ═══════════════════════════════════════════

    ("QLD", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="QLD", required=True,
        frequency_months=24, requires_certificate=True,
        penalty_range="Up to $26,690",
        legislation_ref="Building Act 1975 (Part 8)",
        description="Pool safety certificate required before every lease. Valid 2 years (non-shared) or 1 year (shared). QBCC-licensed inspector only.",
        conditions=["has_pool"],
    ),
    ("NSW", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="NSW", required=True,
        frequency_months=36, requires_certificate=True,
        penalty_range="Up to $22,000",
        legislation_ref="Swimming Pools Act 1992",
        description="Pool must be registered on NSW Swimming Pool Register. Compliance certificate valid 3 years. Required before every new lease.",
        conditions=["has_pool"],
    ),
    ("VIC", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="VIC", required=True,
        frequency_months=48, requires_certificate=True,
        penalty_range="Council-imposed penalties",
        legislation_ref="Building Act 1993; Building Regulations 2018 (Part 6)",
        description="Pool/spa registered with council. Barrier inspection every 4 years by registered Victorian inspector. Certificate lodged within 30 days.",
        conditions=["has_pool"],
    ),
    ("WA", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="WA", required=True,
        frequency_months=48, requires_certificate=True,
        penalty_range="Penalties under Building Act",
        legislation_ref="Building Act 2011; Building Regulations 2012",
        description="Safety barriers for pools/spas deeper than 30cm. Council inspects every 4 years max.",
        conditions=["has_pool"],
    ),
    ("SA", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="SA", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Development Act",
        legislation_ref="Swimming Pools (Safety) Act 1972",
        description="Mandatory barrier for all pools/spas. Compliance check required before tenant moves in.",
        conditions=["has_pool"],
    ),
    ("TAS", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="TAS", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Building Regulations",
        legislation_ref="Building Regulations",
        description="Barrier required under Building Regulations. Must comply with AS 1926.1.",
        conditions=["has_pool"],
    ),
    ("ACT", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="ACT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Building Act",
        legislation_ref="Building Act 2004",
        description="Pool must be registered with ACT Government. Barrier must comply with AS 1926.1.",
        conditions=["has_pool"],
    ),
    ("NT", "pool_barrier"): ComplianceRule(
        compliance_type="pool_barrier", state="NT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Penalties under Building Act",
        legislation_ref="Building Act 1993",
        description="Barrier required for pools/spas over 300mm depth. Must comply with AS 1926.1.",
        conditions=["has_pool"],
    ),

    # ═══════════════════════════════════════════
    # GAS SAFETY
    # ═══════════════════════════════════════════

    ("VIC", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="VIC", required=True,
        frequency_months=24, requires_certificate=True,
        penalty_range="Up to $11,095",
        legislation_ref="Residential Tenancies Act 1997 (s 30D); Gas Safety (Gas Installation) Regulations 2018",
        description="Mandatory gas safety check every 2 years by licensed gasfitter with Type A endorsement. Covers all gas installations, CO testing, appliance function.",
        conditions=["has_gas"],
    ),
    ("QLD", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="QLD", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancies and Rooming Accommodation Act 2008",
        description="Not mandatory but strongly recommended every 2 years. Gas appliances must be maintained in safe working order.",
        conditions=["has_gas"],
    ),
    ("NSW", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="NSW", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancies Act 2010",
        description="Not mandatory but recommended every 2 years. Gas appliances must meet safety standards.",
        conditions=["has_gas"],
    ),
    ("SA", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="SA", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancies Act 1995",
        description="Not mandatory but recommended. Landlord must ensure gas appliances are safe.",
        conditions=["has_gas"],
    ),
    ("WA", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="WA", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General duty of care",
        legislation_ref="Building Regulations 2012",
        description="Not mandatory but recommended. Gas appliances must be safe.",
        conditions=["has_gas"],
    ),
    ("TAS", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="TAS", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancy Act 1997",
        description="Not mandatory but recommended. Safe condition required.",
        conditions=["has_gas"],
    ),
    ("ACT", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="ACT", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancies Act 1997",
        description="Not mandatory but recommended. Gas appliances must be safe and functional.",
        conditions=["has_gas"],
    ),
    ("NT", "gas_safety"): ComplianceRule(
        compliance_type="gas_safety", state="NT", required=False,
        frequency_months=24, requires_certificate=False,
        penalty_range="General tenancy obligations",
        legislation_ref="Residential Tenancies Act 1999",
        description="Not mandatory but recommended. Landlord must maintain safe premises.",
        conditions=["has_gas"],
    ),

    # ═══════════════════════════════════════════
    # MINIMUM HOUSING STANDARDS
    # ═══════════════════════════════════════════

    ("QLD", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="QLD", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="QCAT orders, compensation",
        legislation_ref="Residential Tenancies and Rooming Accommodation Act 2008 (Part 3A)",
        description="10 standards: weatherproof, structural, locks, plumbing, lighting, mould-free, window coverings, kitchen, smoke alarms, ventilation. All tenancies from Sep 2024.",
    ),
    ("VIC", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="VIC", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Up to $11,000 (individuals) / $57,000 (companies)",
        legislation_ref="Residential Tenancies Act 1997; Minimum Standards Regulations 2021",
        description="14 standards including heating, locks, RCDs, ventilation, window coverings. Offence to advertise non-compliant from Nov 2025.",
    ),
    ("NSW", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="NSW", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="NCAT orders, compensation",
        legislation_ref="Residential Tenancies Act 2010 (s 52)",
        description="7 standards: structural, lighting, ventilation, electricity/gas, plumbing, water, bathroom. Strengthened from May 2025.",
    ),
    ("SA", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="SA", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Housing Safety Authority enforcement",
        legislation_ref="Residential Tenancies Act 1995; Housing Safety Authority Standards",
        description="Standards from July 2024: plumbing, electricity, heating/cooling, insulation, weatherproofing, structural stability, smoke alarms.",
    ),
    ("WA", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="WA", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Magistrates Court orders",
        legislation_ref="Residential Tenancies Act 1987",
        description="General 'fit for habitation' standard. No specific checklist — general duty of repair and fitness.",
    ),
    ("TAS", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="TAS", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Residential Tenancy Commissioner enforcement",
        legislation_ref="Residential Tenancy Act 1997",
        description="Fit for habitation: smoke alarms, structural soundness, weatherproof, adequate plumbing/electricity.",
    ),
    ("ACT", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="ACT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="ACAT orders, compensation",
        legislation_ref="Residential Tenancies Act 1997",
        description="Fit for habitation plus ceiling insulation standard (R5 by Nov 2026).",
    ),
    ("NT", "minimum_standards"): ComplianceRule(
        compliance_type="minimum_standards", state="NT", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="NTCAT enforcement",
        legislation_ref="Residential Tenancies Act 1999",
        description="General 'fit for habitation' and reasonable state of repair.",
    ),

    # ═══════════════════════════════════════════
    # WATER EFFICIENCY
    # ═══════════════════════════════════════════

    ("NSW", "water_efficiency"): ComplianceRule(
        compliance_type="water_efficiency", state="NSW", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Loss of right to recover water charges",
        legislation_ref="Residential Tenancies Act 2010 (s 39)",
        description="Dual-flush toilets (3-star WELS), showerheads max 9L/min, taps max 9L/min, no leaks. Required to pass on water costs. From Mar 2025.",
    ),
    ("QLD", "water_efficiency"): ComplianceRule(
        compliance_type="water_efficiency", state="QLD", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Loss of right to recover water charges",
        legislation_ref="Residential Tenancies and Rooming Accommodation Act 2008 (s 161-162)",
        description="Dual-flush toilets, showerheads and taps max 9L/min. Individual meter required. Must provide bill within 4 weeks.",
    ),
    ("VIC", "water_efficiency"): ComplianceRule(
        compliance_type="water_efficiency", state="VIC", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Loss of right to recover water charges",
        legislation_ref="Residential Tenancies Act 1997",
        description="Water fixtures must meet 3-star WELS rating. Separate meter required to charge tenants.",
    ),
    ("SA", "water_efficiency"): ComplianceRule(
        compliance_type="water_efficiency", state="SA", required=False,
        frequency_months=None, requires_certificate=False,
        penalty_range="N/A",
        legislation_ref="Residential Tenancies Act 1995",
        description="Basic metering requirement to pass on water charges. No specific fixture ratings mandated.",
    ),
    ("WA", "water_efficiency"): ComplianceRule(
        compliance_type="water_efficiency", state="WA", required=False,
        frequency_months=None, requires_certificate=False,
        penalty_range="N/A",
        legislation_ref="Residential Tenancies Act 1987",
        description="Basic metering requirement. No specific water efficiency fixture standards for rentals.",
    ),

    # ═══════════════════════════════════════════
    # BLIND CORD SAFETY (VIC only)
    # ═══════════════════════════════════════════

    ("VIC", "blind_cord_safety"): ComplianceRule(
        compliance_type="blind_cord_safety", state="VIC", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Included in minimum standards penalties",
        legislation_ref="Residential Tenancies (Minimum Standards) Regulations 2025",
        description="All corded window coverings must be child-safe from Dec 2025. Cords cannot form 220mm+ loop below 1600mm. No exemptions for older blinds.",
    ),

    # ═══════════════════════════════════════════
    # ENERGY EFFICIENCY / INSULATION
    # ═══════════════════════════════════════════

    ("ACT", "energy_efficiency"): ComplianceRule(
        compliance_type="energy_efficiency", state="ACT", required=True,
        frequency_months=None, requires_certificate=True,
        penalty_range="Up to $1,250 for non-disclosure",
        legislation_ref="Energy Efficiency (Cost of Living) Improvement Act 2012",
        description="EER disclosure mandatory when advertising. Ceiling insulation R5+ required by Nov 2026.",
    ),
    ("VIC", "energy_efficiency"): ComplianceRule(
        compliance_type="energy_efficiency", state="VIC", required=True,
        frequency_months=None, requires_certificate=False,
        penalty_range="Included in minimum standards penalties",
        legislation_ref="Residential Tenancies Act 1997; Energy Victoria regulations",
        description="Ceiling insulation from Mar 2027. Draught-proofing from Jul 2027. Cooling systems phased Mar 2027-Jul 2030.",
    ),

    # ═══════════════════════════════════════════
    # INSURANCE (recommended, not legally required)
    # ═══════════════════════════════════════════

    ("QLD", "insurance"): ComplianceRule(
        compliance_type="insurance", state="QLD", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies and Rooming Accommodation Act 2008",
        description="Not legally required but strongly recommended. Non-compliance with safety items can void coverage. Most lenders require it.",
    ),
    ("NSW", "insurance"): ComplianceRule(
        compliance_type="insurance", state="NSW", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 2010",
        description="Not legally required but strongly recommended. Coverage may be denied if property non-compliant at time of claim.",
    ),
    ("VIC", "insurance"): ComplianceRule(
        compliance_type="insurance", state="VIC", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 1997",
        description="Not legally required but strongly recommended. VIC compliance failures can lead to denied insurance claims.",
    ),
    ("SA", "insurance"): ComplianceRule(
        compliance_type="insurance", state="SA", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 1995",
        description="Not legally required but strongly recommended.",
    ),
    ("WA", "insurance"): ComplianceRule(
        compliance_type="insurance", state="WA", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 1987",
        description="Not legally required but strongly recommended.",
    ),
    ("TAS", "insurance"): ComplianceRule(
        compliance_type="insurance", state="TAS", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancy Act 1997",
        description="Not legally required but strongly recommended.",
    ),
    ("ACT", "insurance"): ComplianceRule(
        compliance_type="insurance", state="ACT", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 1997",
        description="Not legally required but strongly recommended.",
    ),
    ("NT", "insurance"): ComplianceRule(
        compliance_type="insurance", state="NT", required=False,
        frequency_months=12, requires_certificate=False,
        penalty_range="N/A (recommended)",
        legislation_ref="Residential Tenancies Act 1999",
        description="Not legally required but strongly recommended.",
    ),
}

AUSTRALIAN_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NT"]


def _check_conditions(rule: ComplianceRule, has_pool: bool, has_gas: bool) -> bool:
    """Check if a rule's conditions are met by the property features."""
    for cond in rule.conditions:
        if cond == "has_pool" and not has_pool:
            return False
        if cond == "has_gas" and not has_gas:
            return False
    return True


def generate_obligations(
    state: str,
    has_pool: bool = False,
    has_gas: bool = False,
    property_age: str = "10-30",
    property_type: str = "house",
) -> list[ComplianceRule]:
    """
    Return all applicable compliance rules for a property.

    Args:
        state: Australian state code (QLD, NSW, VIC, SA, WA, TAS, ACT, NT)
        has_pool: Whether the property has a swimming pool or spa
        has_gas: Whether the property has gas appliances
        property_age: Age bracket (new, 1-10, 10-30, 30+)
        property_type: Property type (house, apartment, townhouse, unit)

    Returns:
        List of ComplianceRule objects for all applicable obligations
    """
    applicable = []

    for (rule_state, rule_type), rule in COMPLIANCE_RULES.items():
        if rule_state != state:
            continue
        if not _check_conditions(rule, has_pool, has_gas):
            continue
        applicable.append(rule)

    return applicable


def preview_obligations(
    state: str,
    has_pool: bool = False,
    has_gas: bool = False,
    property_age: str = "10-30",
    property_type: str = "house",
) -> list[dict]:
    """
    Same as generate_obligations but returns serializable dicts for API response.
    """
    rules = generate_obligations(state, has_pool, has_gas, property_age, property_type)
    return [
        {
            "compliance_type": r.compliance_type,
            "state": r.state,
            "required": r.required,
            "frequency_months": r.frequency_months,
            "requires_certificate": r.requires_certificate,
            "penalty_range": r.penalty_range,
            "legislation_ref": r.legislation_ref,
            "description": r.description,
        }
        for r in rules
    ]


def create_obligations_for_property(
    state: str,
    mailbox: str,
    has_pool: bool = False,
    has_gas: bool = False,
    property_age: str = "10-30",
    property_type: str = "house",
) -> list:
    """
    Generate ComplianceObligation model instances for a property.
    Returns list of unsaved model instances ready to be added to a DB session.
    """
    from app.agents.compliance.models import ComplianceObligation

    rules = generate_obligations(state, has_pool, has_gas, property_age, property_type)
    now = datetime.now(timezone.utc)
    obligations = []

    for rule in rules:
        # Calculate initial next_due based on frequency
        next_due = None
        if rule.frequency_months:
            next_due = now + timedelta(days=rule.frequency_months * 30)

        obligation = ComplianceObligation(
            id=uuid.uuid4(),
            mailbox=mailbox,
            compliance_type=rule.compliance_type,
            jurisdiction=state,
            status="unknown",
            next_due=next_due,
            severity_weight=SEVERITY_WEIGHTS.get(rule.compliance_type, 1.0),
            notes=f"Auto-generated from rules engine. {rule.legislation_ref}",
        )
        obligations.append(obligation)

    return obligations


def get_rules_for_state(state: str) -> list[dict]:
    """Return all compliance rules for a given state."""
    rules = []
    for (rule_state, _), rule in COMPLIANCE_RULES.items():
        if rule_state != state:
            continue
        rules.append({
            "compliance_type": rule.compliance_type,
            "state": rule.state,
            "required": rule.required,
            "frequency_months": rule.frequency_months,
            "requires_certificate": rule.requires_certificate,
            "penalty_range": rule.penalty_range,
            "legislation_ref": rule.legislation_ref,
            "description": rule.description,
            "conditions": rule.conditions,
        })
    return rules
