// ── Core Domain Types for IMMI-PULSE Immigration Platform ──

export type CaseStage =
  | "intake"
  | "consultation"
  | "checklist_sent"
  | "documents_collecting"
  | "documents_reviewing"
  | "lodgement_ready"
  | "lodged"
  | "granted"
  | "refused"
  | "withdrawn";

export type CasePriority = "low" | "medium" | "high" | "urgent";
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
export interface Case {
  id: string;
  client_id: string;
  client: Client;
  consultant_id: string;
  visa_subclass: string;
  visa_name: string;
  stage: CaseStage;
  priority: CasePriority;
  created_at: string;
  updated_at: string;
  lodgement_date?: string;
  decision_date?: string;
  notes_count: number;
  documents_count: number;
  documents_pending: number;
  checklist_progress: number; // 0-100
}

// ── Document ──
export interface CaseDocument {
  id: string;
  case_id: string;
  case_ref?: {
    client_name: string;
    visa_subclass: string;
  };
  document_type: string;
  file_name: string;
  uploaded_at: string;
  status: DocumentStatus;
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

// ── Client Journey ──
export type JourneyStageKey =
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
