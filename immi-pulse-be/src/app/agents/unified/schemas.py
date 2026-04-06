"""
Unified classification schemas — shared dataclasses for the classify-once pipeline.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class InvoiceLabel:
    is_invoice: bool
    confidence: float
    invoice_type: str  # invoice|receipt|purchase_order|credit_note|unknown
    reasoning: str


@dataclass
class PriorityLabel:
    priority: str  # p1|p2|p3|p4
    is_urgent: bool
    confidence: float
    category: str  # safety|maintenance|repair|inspection|compliance|general
    client_name: Optional[str]
    contract_location: Optional[str]
    job_description: Optional[str]
    summary: Optional[str]
    reasoning: str


@dataclass
class EmergentSignal:
    has_signals: bool
    confidence: float
    signal_description: Optional[str]
    reasoning: str


@dataclass
class ComplianceLabel:
    has_compliance_signals: bool
    confidence: float
    compliance_type: str  # smoke_alarm|electrical_safety|pool_barrier|gas_safety|fire_safety|insurance|council_notice|body_corporate|contractor_compliance|minimum_standards|water_efficiency|blind_cord_safety|asbestos|pest_inspection|energy_efficiency|general_compliance
    jurisdiction: str  # NSW|VIC|QLD|SA|WA|TAS|ACT|NT|unknown
    property_address: Optional[str]
    status: str  # compliant|non_compliant|expiring|expired|action_required|information
    deadline: Optional[str]  # ISO date string or null
    required_action: Optional[str]
    certificate_reference: Optional[str]
    urgency: str  # critical|high|medium|low
    reasoning: str


@dataclass
class ConflictFlag:
    conflict_type: str  # invoice_and_urgent|invoice_and_emergent|urgent_and_low_confidence|compliance_and_urgent|compliance_and_invoice
    description: str


@dataclass
class UnifiedClassification:
    invoice: InvoiceLabel
    priority: PriorityLabel
    emergent: EmergentSignal
    compliance: ComplianceLabel
    conflicts: list[ConflictFlag] = field(default_factory=list)


@dataclass
class ResolvedAction:
    should_execute: bool
    suppress_reason: Optional[str] = None
    flagged: bool = False
    flag_reason: Optional[str] = None


@dataclass
class ResolvedActions:
    invoice: ResolvedAction
    p1: ResolvedAction
    emergent: ResolvedAction
    compliance: ResolvedAction
