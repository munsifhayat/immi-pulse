// ── Core Domain Types for IMMI-PULSE Immigration Platform ──

// CaseStage and JourneyStageKey are unified — a case's stage is the same
// concept as the journey wizard's current step. Values must stay in sync
// with backend CASE_STAGES in src/app/agents/immigration/cases/models.py.
export type CaseStage =
  | "inquiry"
  | "consultation"
  | "visa_pathway"
  | "checklist"
  | "document_collection"
  | "document_review"
  | "application_prep"
  | "lodgement"
  | "post_lodgement"
  | "decision";

export type CasePriority = "low" | "normal" | "high" | "urgent";
export type DocumentStatus = "pending" | "validated" | "flagged" | "rejected";

// ── Client ──
export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nationality: string;
  date_of_birth: string;
  passport_number?: string;
  current_visa?: string;
  created_at: string;
  updated_at: string;
  cases_count: number;
  avatar_url?: string;
}

// ── Case ──
export type CaseSource = "email" | "manual" | "web_form";

// ── AI summary + Checklist (from backend metadata_json) ──
export interface CaseAISummary {
  summary: string;
  key_points: string[];
  proposed_visa_subclass?: string | null;
  proposed_visa_name?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  extracted_details: Record<string, unknown>;
  source_email?: {
    from?: string;
    subject?: string;
    received_at?: string;
  } | null;
}

export type ChecklistItemStatus =
  | "pending"
  | "uploaded"
  | "validated"
  | "flagged";

export interface CaseChecklistItem {
  id: string;
  label: string;
  description?: string | null;
  document_type: string;
  required: boolean;
  status: ChecklistItemStatus;
  document_id?: string | null;
  notes?: string | null;
}

// Matches backend CaseOut (src/app/agents/immigration/cases/schemas.py) one
// to one. Raw wire format — hooks may decorate responses with a nested
// `client` object for legacy pages that still consume mock data.
export interface CaseOut {
  id: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  consultant_id?: string | null;
  visa_subclass?: string | null;
  visa_name?: string | null;
  stage: CaseStage;
  priority: CasePriority;
  source: CaseSource;
  source_message_id?: string | null;
  lodgement_date?: string | null;
  decision_date?: string | null;
  notes?: string | null;
  documents_count: number;
  documents_pending: number;
  ai_summary?: CaseAISummary | null;
  checklist?: CaseChecklistItem[] | null;
  created_at: string;
  updated_at: string;
}

// UI shape used across the console dashboard. Superset of CaseOut that
// also carries legacy mock-only fields (client_id, nested client, and the
// derived checklist_progress / notes_count aggregates). New pages should
// prefer CaseOut directly.
export interface Case extends CaseOut {
  client_id: string;
  client: Client;
  notes_count: number;
  checklist_progress: number;
}

// ── Document ──
// ai_analysis is the raw JSON returned by the document analyzer.
export interface CaseDocumentAiAnalysis {
  document_type?: string;
  confidence?: number;
  status?: DocumentStatus;
  flags?: string[];
  suggestions?: string[];
}

// Mirrors backend CaseDocumentOut one to one.
export interface CaseDocumentOut {
  id: string;
  case_id: string;
  document_type?: string | null;
  file_name: string;
  file_size?: number | null;
  content_type?: string | null;
  uploaded_by_type: "client" | "consultant";
  uploaded_at: string;
  status: DocumentStatus;
  ai_analysis?: CaseDocumentAiAnalysis | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

// UI superset — keeps the legacy case_ref + ai_validation fields that the
// existing documents dashboard page still consumes from mock data.
export interface CaseDocument extends CaseDocumentOut {
  case_ref?: {
    client_name: string;
    visa_subclass: string;
  };
  ai_validation?: {
    passed: boolean;
    issues: string[];
    confidence: number;
  };
}

// ── Checklist ──
export interface ChecklistItem {
  id: string;
  case_id: string;
  requirement: string;
  document_type: string;
  status: "pending" | "uploaded" | "validated" | "flagged";
  document_id?: string;
}

// ── Dashboard KPIs ──
export interface DashboardStats {
  active_cases: number;
  active_cases_trend: number;
  documents_pending: number;
  documents_pending_trend: number;
  ai_flagged_issues: number;
  ai_flagged_trend: number;
  cases_this_month: number;
  cases_month_trend: number;
}

// ── Charts ──
export interface StageBreakdown {
  stage: CaseStage;
  count: number;
}

export interface CaseActivityPoint {
  date: string;
  cases: number;
}

export interface VisaBreakdownPoint {
  date: string;
  skilled: number;
  family: number;
  student: number;
  visitor: number;
}

// ── Visa Subclass ──
export interface VisaSubclass {
  code: string;
  name: string;
  category: "skilled" | "family" | "student" | "visitor";
}

// ── Activity ──
export interface ActivityEntry {
  id: string;
  case_id?: string;
  client_name: string;
  action: string;
  agent_type: "intake" | "visa_classifier" | "document_reviewer" | "checklist_engine";
  subject: string;
  confidence?: number;
  created_at: string;
  status: "completed" | "pending" | "flagged";
}

// ── Inbox ──
export interface InboxEmail {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  preview: string;
  received_at: string;
  classification?: string;
  linked_case_id?: string;
  linked_case_visa?: string;
  linked_client_name?: string;
  is_read: boolean;
  has_attachments: boolean;
}

// ── Demo inbox (lawyer showcase) — mirrors backend /demo/inbox ──
export interface DemoInboxClassification {
  category: string;
  is_immigration_inquiry: boolean;
  urgency: "low" | "normal" | "high" | "urgent";
  confidence: number;
}

export interface DemoCaseDefaults {
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  visa_subclass?: string | null;
  visa_name?: string | null;
  stage: CaseStage;
  priority: CasePriority;
  source: CaseSource;
  notes?: string | null;
}

export interface DemoInboxEmail {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  preview: string;
  body: string;
  received_at: string;
  has_attachments: boolean;
  is_read: boolean;
  classification?: DemoInboxClassification | null;
  ai_summary?: CaseAISummary | null;
  case_defaults?: DemoCaseDefaults | null;
  linked_case_id?: string | null;
}

// ── Client Journey ──
// Alias — journey stages ARE case stages. Kept for readability at call sites.
export type JourneyStageKey = CaseStage;

export type JourneyStepStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "blocked"
  | "skipped";

export type JourneyOutcome = "granted" | "refused" | "withdrawn" | null;

export interface JourneyStep {
  stage: JourneyStageKey;
  status: JourneyStepStatus;
  completed_at?: string;
  started_at?: string;
  notes?: string;
  blockers?: string[];
}

export interface ClientJourney {
  case_id: string;
  client_id: string;
  visa_subclass: string;
  visa_name: string;
  outcome: JourneyOutcome;
  current_stage: JourneyStageKey;
  steps: JourneyStep[];
  started_at: string;
  updated_at: string;
}
