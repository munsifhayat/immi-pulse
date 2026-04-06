"""
Pre-built E2E test scenarios for the Property Pulse email processing pipeline.

Each scenario simulates a realistic email that exercises specific classification
dimensions: invoice detection, P1 priority, emergent work, or combinations.
"""

SCENARIOS: dict[str, dict] = {
    "invoice_pdf": {
        "description": "Standard invoice email with PDF attachment reference",
        "from_name": "Sarah Mitchell",
        "from_email": "accounts@cleanservices.com.au",
        "subject": "Invoice #INV-2024-0847 — Monthly Cleaning Services March 2026",
        "body": """
        <p>Hi Property Pulse Team,</p>
        <p>Please find attached our invoice for cleaning services provided during March 2026.</p>
        <ul>
            <li><strong>Invoice Number:</strong> INV-2024-0847</li>
            <li><strong>Amount:</strong> $4,250.00 (incl. GST)</li>
            <li><strong>Due Date:</strong> 14 April 2026</li>
            <li><strong>Site:</strong> 100 George Street, Sydney</li>
        </ul>
        <p>Attached: INV-2024-0847.pdf</p>
        <p>Please process at your earliest convenience.</p>
        <p>Kind regards,<br>Sarah Mitchell<br>Clean Services Pty Ltd</p>
        """,
        "expected": {
            "invoice": {"is_invoice": True, "confidence_gte": 0.8},
            "priority": "p3",
        },
    },
    "p1_emergency_fire": {
        "description": "P1 urgent — fire alarm activation requiring immediate response",
        "from_name": "James Chen",
        "from_email": "security@buildingmgmt.com.au",
        "subject": "URGENT: Fire Alarm Activation — Level 3, 200 Kent Street",
        "body": """
        <p><strong>EMERGENCY NOTIFICATION</strong></p>
        <p>Fire alarm has been activated on Level 3 at 200 Kent Street, Sydney.</p>
        <p><strong>Details:</strong></p>
        <ul>
            <li><strong>Time:</strong> 14:32 AEST today</li>
            <li><strong>Location:</strong> Level 3, Zone B — Server Room corridor</li>
            <li><strong>Status:</strong> Fire brigade has been called. Building evacuation in progress.</li>
            <li><strong>Client:</strong> Westfield Property Management</li>
        </ul>
        <p>Immediate attendance required by Property Pulse facilities team. MFB ETA ~8 minutes.</p>
        <p>Please confirm response ASAP.</p>
        <p>James Chen<br>Building Security Manager</p>
        """,
        "expected": {
            "priority": "p1",
            "is_urgent": True,
            "confidence_gte": 0.9,
        },
    },
    "p1_water_leak": {
        "description": "P1 urgent — major water leak with property damage risk",
        "from_name": "Maria Lopez",
        "from_email": "ops@meridianproperties.com.au",
        "subject": "CRITICAL: Major Water Leak — Ground Floor 55 Collins Street",
        "body": """
        <p>Hi Property Pulse,</p>
        <p>We have a <strong>major water leak</strong> on the ground floor of 55 Collins Street, Melbourne.</p>
        <p>Water is coming through the ceiling near the main reception area. The carpet is already
        soaked and there is a risk of damage to the electrical switchboard in the adjacent comms room.</p>
        <p><strong>Impact:</strong></p>
        <ul>
            <li>Reception area flooded — approximately 50sqm affected</li>
            <li>Risk to electrical switchboard if water reaches comms room</li>
            <li>Building occupants being diverted through side entrance</li>
            <li>Client: Meridian Properties — their CEO is onsite and extremely concerned</li>
        </ul>
        <p>We need a plumber and electrical safety assessment IMMEDIATELY.</p>
        <p>Maria Lopez<br>Operations Manager, Meridian Properties</p>
        """,
        "expected": {
            "priority": "p1",
            "is_urgent": True,
        },
    },
    "p3_routine_maintenance": {
        "description": "P3 routine — scheduled maintenance request, no urgency",
        "from_name": "Tom Bradley",
        "from_email": "facilities@acmecorp.com.au",
        "subject": "Quarterly HVAC Filter Replacement — Building A",
        "body": """
        <p>Hi Team,</p>
        <p>Just a reminder that the quarterly HVAC filter replacement is due for Building A
        at 45 Pitt Street.</p>
        <p>This is a standard scheduled maintenance item. No urgency — please schedule
        at your convenience within the next 2 weeks.</p>
        <p>Filters required: 12x standard pleated filters (600x600mm) for AHU-1 through AHU-4.</p>
        <p>Thanks,<br>Tom Bradley<br>Facilities Coordinator, Acme Corp</p>
        """,
        "expected": {
            "priority": "p3",
            "is_urgent": False,
        },
    },
    "emergent_work_scope_creep": {
        "description": "Emergent work — client requesting out-of-scope services",
        "from_name": "Karen White",
        "from_email": "karen.white@stellaroffices.com.au",
        "subject": "Re: Additional Works Request — Fit-out Modifications Level 8",
        "body": """
        <p>Hi Property Pulse,</p>
        <p>Following our conversation last week, we'd like to proceed with the following
        <strong>additional works</strong> at Level 8, 120 Spencer Street:</p>
        <ol>
            <li>Install 3 additional power outlets along the north wall (not in original scope)</li>
            <li>Relocate the kitchenette plumbing to the east side of the floor</li>
            <li>Add soundproofing panels to meeting rooms 8A and 8B</li>
            <li>Extend the data cabling to cover the new hot-desk area (12 additional drops)</li>
        </ol>
        <p>I understand these weren't part of the original contract but we'd like them done
        during the current fit-out phase to avoid disruption later. Can you provide a quote?</p>
        <p>We're also wondering if you could handle the furniture procurement for the new
        hot-desk area — we know this isn't typically your scope but it would simplify things
        for us if you could manage it end-to-end.</p>
        <p>Karen White<br>Office Manager, Stellar Offices</p>
        """,
        "expected": {
            "emergent_work": {"has_signals": True, "confidence_gte": 0.7},
        },
    },
    "invoice_plus_urgent": {
        "description": "Conflict scenario — invoice attached to an urgent escalation email",
        "from_name": "David Park",
        "from_email": "david.park@rapidplumbing.com.au",
        "subject": "URGENT: Emergency Call-Out Invoice + Ongoing Leak Issue — 88 Walker St",
        "body": """
        <p>Hi Property Pulse,</p>
        <p><strong>Two things requiring immediate attention:</strong></p>
        <p><strong>1. Invoice for emergency call-out (attached):</strong></p>
        <ul>
            <li>Invoice: RP-2026-0312 — $1,850 (emergency after-hours rate)</li>
            <li>Date: Last night, 27 March 2026, 11:45 PM call-out</li>
            <li>Site: 88 Walker Street, North Sydney</li>
            <li>Work: Emergency isolation of burst pipe on Level 2</li>
        </ul>
        <p><strong>2. ONGOING ISSUE — pipe is only temporarily isolated:</strong></p>
        <p>The burst pipe has been temporarily clamped but this is NOT a permanent fix.
        The section of pipe needs full replacement. If the clamp fails, you're looking
        at significant water damage to Levels 1 and 2.</p>
        <p><strong>We need to schedule the permanent repair within 24 hours.</strong>
        The temporary fix may not hold beyond that.</p>
        <p>Attached: RP-2026-0312.pdf</p>
        <p>David Park<br>Rapid Plumbing Services</p>
        """,
        "expected": {
            "invoice": {"is_invoice": True},
            "priority": "p1",
            "is_urgent": True,
            "conflicts": ["invoice_and_urgent"],
        },
    },
    "p4_newsletter": {
        "description": "P4 non-actionable — industry newsletter, no action required",
        "from_name": "FMA Newsletter",
        "from_email": "newsletter@fma.com.au",
        "subject": "FMA Monthly Update — New Compliance Standards for Fire Safety Systems",
        "body": """
        <p>Dear Facilities Management Professional,</p>
        <p>Welcome to the March 2026 edition of the FMA Monthly Update.</p>
        <p><strong>In This Issue:</strong></p>
        <ul>
            <li>New AS 1851 amendments for fire safety system maintenance</li>
            <li>Upcoming FMA Conference — Early Bird registration open</li>
            <li>Industry spotlight: How AI is changing building management</li>
            <li>Member profile: Property Pulse Facilities Management</li>
        </ul>
        <p>For more information, visit our website.</p>
        <p>The FMA Team<br>Facility Management Association of Australia</p>
        """,
        "expected": {
            "priority": "p4",
            "is_urgent": False,
            "invoice": {"is_invoice": False},
        },
    },
    "emergent_work_with_invoice": {
        "description": "Conflict — scope creep work that also includes a cost quote (invoice-like)",
        "from_name": "Michael Torres",
        "from_email": "michael@eliteelectrical.com.au",
        "subject": "Quote for Additional Electrical Works — Not in Original Scope",
        "body": """
        <p>Hi Property Pulse Team,</p>
        <p>As discussed on-site yesterday, here is our quote for the additional electrical
        works at 300 Bourke Street that are <strong>outside the original contract scope</strong>:</p>
        <table border="1" cellpadding="5">
            <tr><th>Item</th><th>Description</th><th>Cost</th></tr>
            <tr><td>1</td><td>Additional 3-phase power to new server rack (not in original spec)</td><td>$3,200</td></tr>
            <tr><td>2</td><td>Emergency lighting upgrade — extra 8 fittings (code change since contract)</td><td>$2,400</td></tr>
            <tr><td>3</td><td>EV charger installation x2 in basement (tenant request, not contracted)</td><td>$8,500</td></tr>
        </table>
        <p><strong>Total: $14,100 + GST</strong></p>
        <p>This is a variation to the existing contract. Please approve so we can
        schedule the works during the current shutdown window.</p>
        <p>Michael Torres<br>Elite Electrical Services</p>
        """,
        "expected": {
            "emergent_work": {"has_signals": True},
            "conflicts": ["invoice_and_emergent"],
        },
    },
}
