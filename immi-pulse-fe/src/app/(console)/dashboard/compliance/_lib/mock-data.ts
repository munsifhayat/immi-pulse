import type {
  ComplianceDetection,
  ComplianceObligation,
  ComplianceSummary,
  PropertyScore,
} from "@/lib/api/compliance.service";

// ── Date helpers ───────────────────────────────────────────
export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

// ── Mock Summary ───────────────────────────────────────────
export const MOCK_SUMMARY: ComplianceSummary = {
  portfolio_score: 73.4,
  total_properties: 6,
  properties_at_risk: 2,
  upcoming_deadlines: 5,
  detections_this_week: 8,
  by_type_status: {
    smoke_alarm: { compliant: 4, expiring: 1, non_compliant: 1 },
    electrical_safety: { compliant: 3, expiring: 2, unknown: 1 },
    pool_barrier: { compliant: 2, non_compliant: 1 },
    gas_safety: { compliant: 3, expiring: 1 },
    insurance: { compliant: 5, expiring: 1 },
    minimum_standards: { compliant: 4, non_compliant: 1, unknown: 1 },
  },
};

// ── Mock Properties ────────────────────────────────────────
export const MOCK_PROPERTIES: PropertyScore[] = [
  {
    mailbox: "12-hartley@strata.com.au",
    display_name: "12 Hartley Ave, Bondi",
    score: 92,
    total_obligations: 5,
    compliant_count: 4,
    non_compliant_count: 0,
    expiring_count: 1,
    unknown_count: 0,
    obligations: [
      { id: "o1", mailbox: "12-hartley@strata.com.au", compliance_type: "smoke_alarm", jurisdiction: "NSW", status: "compliant", last_checked: daysAgo(15), next_due: daysFromNow(180), certificate_reference: "SA-2025-0847", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(90), updated_at: daysAgo(15) },
      { id: "o2", mailbox: "12-hartley@strata.com.au", compliance_type: "electrical_safety", jurisdiction: "NSW", status: "compliant", last_checked: daysAgo(30), next_due: daysFromNow(335), certificate_reference: "ES-NSW-1192", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(120), updated_at: daysAgo(30) },
      { id: "o3", mailbox: "12-hartley@strata.com.au", compliance_type: "pool_barrier", jurisdiction: "NSW", status: "compliant", last_checked: daysAgo(60), next_due: daysFromNow(650), certificate_reference: "PB-0423", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 3.0, created_at: daysAgo(200), updated_at: daysAgo(60) },
      { id: "o4", mailbox: "12-hartley@strata.com.au", compliance_type: "insurance", jurisdiction: "NSW", status: "expiring", last_checked: daysAgo(2), next_due: daysFromNow(18), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "Terri Scheer renewal due", severity_weight: 1.5, created_at: daysAgo(350), updated_at: daysAgo(2) },
      { id: "o5", mailbox: "12-hartley@strata.com.au", compliance_type: "gas_safety", jurisdiction: "NSW", status: "compliant", last_checked: daysAgo(45), next_due: daysFromNow(500), certificate_reference: "GS-2025-0091", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.5, created_at: daysAgo(180), updated_at: daysAgo(45) },
    ],
  },
  {
    mailbox: "7-parkview@mgmt.com.au",
    display_name: "7 Park View Rd, South Yarra",
    score: 85,
    total_obligations: 5,
    compliant_count: 4,
    non_compliant_count: 0,
    expiring_count: 1,
    unknown_count: 0,
    obligations: [
      { id: "o6", mailbox: "7-parkview@mgmt.com.au", compliance_type: "smoke_alarm", jurisdiction: "VIC", status: "compliant", last_checked: daysAgo(20), next_due: daysFromNow(160), certificate_reference: "SA-VIC-3312", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(100), updated_at: daysAgo(20) },
      { id: "o7", mailbox: "7-parkview@mgmt.com.au", compliance_type: "electrical_safety", jurisdiction: "VIC", status: "expiring", last_checked: daysAgo(5), next_due: daysFromNow(12), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "2-year check due — VIC mandate", severity_weight: 2.0, created_at: daysAgo(700), updated_at: daysAgo(5) },
      { id: "o8", mailbox: "7-parkview@mgmt.com.au", compliance_type: "gas_safety", jurisdiction: "VIC", status: "compliant", last_checked: daysAgo(10), next_due: daysFromNow(420), certificate_reference: "GS-VIC-0778", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.5, created_at: daysAgo(300), updated_at: daysAgo(10) },
      { id: "o9", mailbox: "7-parkview@mgmt.com.au", compliance_type: "insurance", jurisdiction: "VIC", status: "compliant", last_checked: daysAgo(40), next_due: daysFromNow(200), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(300), updated_at: daysAgo(40) },
      { id: "o10", mailbox: "7-parkview@mgmt.com.au", compliance_type: "minimum_standards", jurisdiction: "VIC", status: "compliant", last_checked: daysAgo(30), next_due: null, certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(60), updated_at: daysAgo(30) },
    ],
  },
  {
    mailbox: "42-oceancrest@pm.com.au",
    display_name: "42 Ocean Crest Dr, Surfers Paradise",
    score: 54,
    total_obligations: 6,
    compliant_count: 2,
    non_compliant_count: 2,
    expiring_count: 1,
    unknown_count: 1,
    obligations: [
      { id: "o11", mailbox: "42-oceancrest@pm.com.au", compliance_type: "smoke_alarm", jurisdiction: "QLD", status: "non_compliant", last_checked: daysAgo(3), next_due: daysFromNow(-10), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "Failed — not interconnected photoelectric. QLD requires upgrade.", severity_weight: 2.0, created_at: daysAgo(60), updated_at: daysAgo(3) },
      { id: "o12", mailbox: "42-oceancrest@pm.com.au", compliance_type: "electrical_safety", jurisdiction: "QLD", status: "compliant", last_checked: daysAgo(25), next_due: daysFromNow(340), certificate_reference: "ES-QLD-5501", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(90), updated_at: daysAgo(25) },
      { id: "o13", mailbox: "42-oceancrest@pm.com.au", compliance_type: "pool_barrier", jurisdiction: "QLD", status: "non_compliant", last_checked: daysAgo(7), next_due: daysFromNow(-5), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "Gate latch defective. Inspector failed barrier.", severity_weight: 3.0, created_at: daysAgo(200), updated_at: daysAgo(7) },
      { id: "o14", mailbox: "42-oceancrest@pm.com.au", compliance_type: "gas_safety", jurisdiction: "QLD", status: "compliant", last_checked: daysAgo(50), next_due: daysFromNow(500), certificate_reference: "GS-QLD-1120", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.5, created_at: daysAgo(200), updated_at: daysAgo(50) },
      { id: "o15", mailbox: "42-oceancrest@pm.com.au", compliance_type: "insurance", jurisdiction: "QLD", status: "expiring", last_checked: daysAgo(1), next_due: daysFromNow(8), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "EBM RentCover renewal notice received", severity_weight: 1.5, created_at: daysAgo(350), updated_at: daysAgo(1) },
      { id: "o16", mailbox: "42-oceancrest@pm.com.au", compliance_type: "minimum_standards", jurisdiction: "QLD", status: "unknown", last_checked: null, next_due: null, certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(10), updated_at: daysAgo(10) },
    ],
  },
  {
    mailbox: "9-greenfield@re.com.au",
    display_name: "9 Greenfield St, Adelaide",
    score: 88,
    total_obligations: 4,
    compliant_count: 3,
    non_compliant_count: 0,
    expiring_count: 1,
    unknown_count: 0,
    obligations: [
      { id: "o17", mailbox: "9-greenfield@re.com.au", compliance_type: "smoke_alarm", jurisdiction: "SA", status: "compliant", last_checked: daysAgo(12), next_due: daysFromNow(280), certificate_reference: "SA-SA-2209", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(80), updated_at: daysAgo(12) },
      { id: "o18", mailbox: "9-greenfield@re.com.au", compliance_type: "electrical_safety", jurisdiction: "SA", status: "expiring", last_checked: daysAgo(8), next_due: daysFromNow(22), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "Safety switch test due", severity_weight: 2.0, created_at: daysAgo(700), updated_at: daysAgo(8) },
      { id: "o19", mailbox: "9-greenfield@re.com.au", compliance_type: "insurance", jurisdiction: "SA", status: "compliant", last_checked: daysAgo(60), next_due: daysFromNow(240), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(300), updated_at: daysAgo(60) },
      { id: "o20", mailbox: "9-greenfield@re.com.au", compliance_type: "gas_safety", jurisdiction: "SA", status: "compliant", last_checked: daysAgo(40), next_due: daysFromNow(500), certificate_reference: "GS-SA-0445", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.5, created_at: daysAgo(180), updated_at: daysAgo(40) },
    ],
  },
  {
    mailbox: "55-harbourside@strata.com.au",
    display_name: "55 Harbourside Tce, Perth",
    score: 95,
    total_obligations: 4,
    compliant_count: 4,
    non_compliant_count: 0,
    expiring_count: 0,
    unknown_count: 0,
    obligations: [
      { id: "o21", mailbox: "55-harbourside@strata.com.au", compliance_type: "smoke_alarm", jurisdiction: "WA", status: "compliant", last_checked: daysAgo(10), next_due: daysFromNow(350), certificate_reference: "SA-WA-8801", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(50), updated_at: daysAgo(10) },
      { id: "o22", mailbox: "55-harbourside@strata.com.au", compliance_type: "electrical_safety", jurisdiction: "WA", status: "compliant", last_checked: daysAgo(20), next_due: daysFromNow(160), certificate_reference: "ES-WA-4421", source_email_id: null, source_detection_id: null, notes: "New RCD installed Oct 2025 — WA mandate", severity_weight: 2.0, created_at: daysAgo(200), updated_at: daysAgo(20) },
      { id: "o23", mailbox: "55-harbourside@strata.com.au", compliance_type: "insurance", jurisdiction: "WA", status: "compliant", last_checked: daysAgo(15), next_due: daysFromNow(280), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(300), updated_at: daysAgo(15) },
      { id: "o24", mailbox: "55-harbourside@strata.com.au", compliance_type: "minimum_standards", jurisdiction: "WA", status: "compliant", last_checked: daysAgo(30), next_due: null, certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(60), updated_at: daysAgo(30) },
    ],
  },
  {
    mailbox: "3-wattle@rentals.com.au",
    display_name: "3/18 Wattle Ln, Hobart",
    score: 62,
    total_obligations: 4,
    compliant_count: 2,
    non_compliant_count: 1,
    expiring_count: 1,
    unknown_count: 0,
    obligations: [
      { id: "o25", mailbox: "3-wattle@rentals.com.au", compliance_type: "smoke_alarm", jurisdiction: "TAS", status: "compliant", last_checked: daysAgo(18), next_due: daysFromNow(200), certificate_reference: "SA-TAS-0091", source_email_id: null, source_detection_id: null, notes: null, severity_weight: 2.0, created_at: daysAgo(100), updated_at: daysAgo(18) },
      { id: "o26", mailbox: "3-wattle@rentals.com.au", compliance_type: "electrical_safety", jurisdiction: "TAS", status: "non_compliant", last_checked: daysAgo(5), next_due: daysFromNow(-20), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "RCD on kitchen circuit failed test", severity_weight: 2.0, created_at: daysAgo(400), updated_at: daysAgo(5) },
      { id: "o27", mailbox: "3-wattle@rentals.com.au", compliance_type: "insurance", jurisdiction: "TAS", status: "expiring", last_checked: daysAgo(3), next_due: daysFromNow(5), certificate_reference: null, source_email_id: null, source_detection_id: null, notes: "Allianz policy renewal", severity_weight: 1.5, created_at: daysAgo(360), updated_at: daysAgo(3) },
      { id: "o28", mailbox: "3-wattle@rentals.com.au", compliance_type: "minimum_standards", jurisdiction: "TAS", status: "compliant", last_checked: daysAgo(25), next_due: null, certificate_reference: null, source_email_id: null, source_detection_id: null, notes: null, severity_weight: 1.5, created_at: daysAgo(60), updated_at: daysAgo(25) },
    ],
  },
];

// ── Mock Detections ────────────────────────────────────────
export const MOCK_DETECTIONS: ComplianceDetection[] = [
  {
    id: "d1", mailbox: "42-oceancrest@pm.com.au", message_id: "m1", thread_id: null,
    from_email: "inspections@qldfiresafety.com.au", from_name: "QLD Fire Safety Inspections",
    subject: "FAILED: Smoke Alarm Compliance Inspection — 42 Ocean Crest Dr",
    received_at: hoursAgo(2), compliance_type: "smoke_alarm", jurisdiction: "QLD",
    property_address: "42 Ocean Crest Dr, Surfers Paradise QLD 4217",
    status: "non_compliant", deadline: daysFromNow(14),
    required_action: "Replace ionisation alarms with interconnected photoelectric alarms (AS 3786-2014)",
    certificate_reference: null, urgency: "critical", confidence_score: 0.96,
    ai_reasoning: "Inspector report states 3 of 4 alarms are non-compliant ionisation type. QLD requires interconnected photoelectric since 1 Jan 2022.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: hoursAgo(2),
  },
  {
    id: "d2", mailbox: "42-oceancrest@pm.com.au", message_id: "m2", thread_id: null,
    from_email: "admin@goldcoastpools.com.au", from_name: "Gold Coast Pool Inspections",
    subject: "Pool Safety Certificate FAILED — 42 Ocean Crest Drive",
    received_at: hoursAgo(6), compliance_type: "pool_barrier", jurisdiction: "QLD",
    property_address: "42 Ocean Crest Dr, Surfers Paradise QLD 4217",
    status: "non_compliant", deadline: daysFromNow(7),
    required_action: "Repair self-closing gate mechanism and replace defective latch. Re-inspection required.",
    certificate_reference: "PSI-GC-2026-0341", urgency: "critical", confidence_score: 0.98,
    ai_reasoning: "Pool barrier inspection report attached as PDF. Gate does not self-close and latch mechanism broken. Non-compliant under Building Act 1975.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: hoursAgo(6),
  },
  {
    id: "d3", mailbox: "7-parkview@mgmt.com.au", message_id: "m3", thread_id: null,
    from_email: "compliance@detectorinspector.com.au", from_name: "Detector Inspector",
    subject: "Electrical Safety Check Due — 7 Park View Rd, South Yarra",
    received_at: hoursAgo(18), compliance_type: "electrical_safety", jurisdiction: "VIC",
    property_address: "7 Park View Rd, South Yarra VIC 3141",
    status: "expiring", deadline: daysFromNow(12),
    required_action: "Schedule 2-yearly electrical safety inspection per VIC Residential Tenancies Act",
    certificate_reference: null, urgency: "high", confidence_score: 0.91,
    ai_reasoning: "Reminder from compliance provider that VIC mandatory 2-year electrical safety check is due within 14 days.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: hoursAgo(18),
  },
  {
    id: "d4", mailbox: "12-hartley@strata.com.au", message_id: "m4", thread_id: null,
    from_email: "renewals@terrischeer.com.au", from_name: "Terri Scheer Insurance",
    subject: "Landlord Insurance Renewal — Policy TS-2024-88712 expiring 16 April",
    received_at: daysAgo(1), compliance_type: "insurance", jurisdiction: "NSW",
    property_address: "12 Hartley Ave, Bondi NSW 2026",
    status: "expiring", deadline: daysFromNow(18),
    required_action: "Review and renew landlord insurance policy before expiry to maintain coverage",
    certificate_reference: "TS-2024-88712", urgency: "medium", confidence_score: 0.94,
    ai_reasoning: "Insurance renewal notice from Terri Scheer. Policy expiring in 18 days. Non-renewal would leave property uninsured.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: daysAgo(1),
  },
  {
    id: "d5", mailbox: "9-greenfield@re.com.au", message_id: "m5", thread_id: null,
    from_email: "safety@saelectrical.com.au", from_name: "SA Electrical Safety Services",
    subject: "Safety Switch Test Report — 9 Greenfield St, Adelaide",
    received_at: daysAgo(1), compliance_type: "electrical_safety", jurisdiction: "SA",
    property_address: "9 Greenfield St, Adelaide SA 5000",
    status: "expiring", deadline: daysFromNow(22),
    required_action: "Schedule safety switch (RCD) test before due date",
    certificate_reference: null, urgency: "medium", confidence_score: 0.88,
    ai_reasoning: "Scheduled reminder from electrical contractor that RCD testing is approaching due date.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: daysAgo(1),
  },
  {
    id: "d6", mailbox: "3-wattle@rentals.com.au", message_id: "m6", thread_id: null,
    from_email: "support@allianz.com.au", from_name: "Allianz Insurance",
    subject: "Urgent: Your landlord insurance policy expires in 5 days",
    received_at: daysAgo(2), compliance_type: "insurance", jurisdiction: "TAS",
    property_address: "3/18 Wattle Ln, Hobart TAS 7000",
    status: "expiring", deadline: daysFromNow(5),
    required_action: "Renew Allianz landlord insurance immediately — 5 days remaining",
    certificate_reference: "ALZ-LL-9982341", urgency: "high", confidence_score: 0.95,
    ai_reasoning: "Insurance expiry warning — 5 days. Coverage lapse would void landlord protection and may breach management agreement obligations.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: daysAgo(2),
  },
  {
    id: "d7", mailbox: "3-wattle@rentals.com.au", message_id: "m7", thread_id: null,
    from_email: "reports@taselectrical.com.au", from_name: "TAS Electrical Contractors",
    subject: "RCD Test FAILED — Unit 3/18 Wattle Lane, Hobart",
    received_at: daysAgo(3), compliance_type: "electrical_safety", jurisdiction: "TAS",
    property_address: "3/18 Wattle Ln, Hobart TAS 7000",
    status: "non_compliant", deadline: daysFromNow(7),
    required_action: "Replace faulty RCD on kitchen circuit. Re-test required after repair.",
    certificate_reference: null, urgency: "critical", confidence_score: 0.97,
    ai_reasoning: "Electrical safety report indicates RCD on kitchen circuit failed trip-time test. Non-compliant — electrocution risk.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: daysAgo(3),
  },
  {
    id: "d8", mailbox: "7-parkview@mgmt.com.au", message_id: "m8", thread_id: null,
    from_email: "gas@melbournegassafety.com.au", from_name: "Melbourne Gas Safety",
    subject: "Gas Safety Check Certificate — 7 Park View Rd, South Yarra (PASS)",
    received_at: daysAgo(4), compliance_type: "gas_safety", jurisdiction: "VIC",
    property_address: "7 Park View Rd, South Yarra VIC 3141",
    status: "compliant", deadline: null,
    required_action: null,
    certificate_reference: "GS-VIC-0778", urgency: "low", confidence_score: 0.93,
    ai_reasoning: "Gas safety compliance certificate received — all appliances passed. Next check due in 2 years per VIC mandate.",
    action: "detected", manually_reviewed: false, review_action: null, review_notes: null, reviewed_at: null,
    created_at: daysAgo(4),
  },
];

// ── Mock Upcoming Obligations ──────────────────────────────
export const MOCK_OBLIGATIONS_UPCOMING: ComplianceObligation[] = [
  MOCK_PROPERTIES[2].obligations[4], // Insurance — 42 Ocean Crest — 8d
  MOCK_PROPERTIES[5].obligations[2], // Insurance — 3 Wattle — 5d
  MOCK_PROPERTIES[1].obligations[1], // Electrical — 7 Park View — 12d
  MOCK_PROPERTIES[0].obligations[3], // Insurance — 12 Hartley — 18d
  MOCK_PROPERTIES[3].obligations[1], // Electrical — 9 Greenfield — 22d
];
