import apiClient from "./client";

// --- Types ---

export interface ComplianceDetection {
  id: string;
  mailbox: string;
  message_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  received_at: string;
  compliance_type: string;
  jurisdiction: string | null;
  property_address: string | null;
  status: string;
  deadline: string | null;
  required_action: string | null;
  certificate_reference: string | null;
  urgency: string;
  confidence_score: number;
  ai_reasoning: string | null;
  action: string;
  manually_reviewed: boolean;
  review_action: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ComplianceObligation {
  id: string;
  mailbox: string;
  compliance_type: string;
  jurisdiction: string;
  status: string;
  last_checked: string | null;
  next_due: string | null;
  certificate_reference: string | null;
  source_email_id: string | null;
  source_detection_id: string | null;
  notes: string | null;
  severity_weight: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyScore {
  mailbox: string;
  display_name: string | null;
  score: number;
  total_obligations: number;
  compliant_count: number;
  non_compliant_count: number;
  expiring_count: number;
  unknown_count: number;
  obligations: ComplianceObligation[];
}

export interface ComplianceStats {
  total_detected: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_urgency: Record<string, number>;
  by_jurisdiction: Record<string, number>;
  critical_count: number;
  expiring_soon: number;
}

export interface ComplianceSummary {
  portfolio_score: number;
  total_properties: number;
  properties_at_risk: number;
  upcoming_deadlines: number;
  detections_this_week: number;
  by_type_status: Record<string, Record<string, number>>;
}

export interface ComplianceFilters {
  mailbox?: string;
  compliance_type?: string;
  status?: string;
  urgency?: string;
  jurisdiction?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

// --- Onboarding types ---

export interface PropertyOnboardRequest {
  mailbox: string;
  state: string;
  has_pool: boolean;
  has_gas: boolean;
  property_age: string;
  property_type: string;
  display_name?: string;
  address?: string;
}

export interface ComplianceRuleOut {
  compliance_type: string;
  state: string;
  required: boolean;
  frequency_months?: number;
  requires_certificate: boolean;
  penalty_range: string;
  legislation_ref: string;
  description: string;
}

export interface PropertyOnboardResponse {
  profile: Record<string, unknown>;
  obligations_created: number;
  score: number;
}

export interface CompleteObligationRequest {
  certificate_reference?: string;
  next_due?: string;
  notes?: string;
}

export interface ScheduleObligationRequest {
  next_due: string;
  notes?: string;
}

// --- Service ---

export const complianceService = {
  // Detection endpoints
  async getDetections(
    filters?: ComplianceFilters
  ): Promise<ComplianceDetection[]> {
    const params = new URLSearchParams();
    if (filters?.mailbox) params.set("mailbox", filters.mailbox);
    if (filters?.compliance_type)
      params.set("compliance_type", filters.compliance_type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.urgency) params.set("urgency", filters.urgency);
    if (filters?.jurisdiction) params.set("jurisdiction", filters.jurisdiction);
    if (filters?.from_date) params.set("from", filters.from_date);
    if (filters?.to_date) params.set("to", filters.to_date);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const { data } = await apiClient.get(
      `/agents/compliance/detections?${params.toString()}`
    );
    return data;
  },

  async getDetection(id: string): Promise<ComplianceDetection> {
    const { data } = await apiClient.get(
      `/agents/compliance/detections/${id}`
    );
    return data;
  },

  async reviewDetection(
    id: string,
    action: string,
    notes?: string
  ): Promise<void> {
    await apiClient.post(`/agents/compliance/detections/${id}/review`, {
      action,
      notes,
    });
  },

  async getStats(mailbox?: string): Promise<ComplianceStats> {
    const params = mailbox
      ? `?mailbox=${encodeURIComponent(mailbox)}`
      : "";
    const { data } = await apiClient.get(
      `/agents/compliance/stats${params}`
    );
    return data;
  },

  // Obligation endpoints
  async getObligations(filters?: {
    mailbox?: string;
    compliance_type?: string;
    status?: string;
    limit?: number;
  }): Promise<ComplianceObligation[]> {
    const params = new URLSearchParams();
    if (filters?.mailbox) params.set("mailbox", filters.mailbox);
    if (filters?.compliance_type)
      params.set("compliance_type", filters.compliance_type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const { data } = await apiClient.get(
      `/agents/compliance/obligations?${params.toString()}`
    );
    return data;
  },

  async createObligation(body: {
    mailbox: string;
    compliance_type: string;
    jurisdiction?: string;
    status?: string;
    next_due?: string;
    notes?: string;
  }): Promise<ComplianceObligation> {
    const { data } = await apiClient.post(
      `/agents/compliance/obligations`,
      body
    );
    return data;
  },

  async updateObligation(
    id: string,
    body: {
      status?: string;
      next_due?: string;
      certificate_reference?: string;
      notes?: string;
    }
  ): Promise<ComplianceObligation> {
    const { data } = await apiClient.put(
      `/agents/compliance/obligations/${id}`,
      body
    );
    return data;
  },

  // Property score endpoints
  async getProperties(): Promise<PropertyScore[]> {
    const { data } = await apiClient.get(`/agents/compliance/properties`);
    return data;
  },

  async getPropertyScore(mailbox: string): Promise<PropertyScore> {
    const { data } = await apiClient.get(
      `/agents/compliance/properties/${encodeURIComponent(mailbox)}/score`
    );
    return data;
  },

  // Summary
  async getSummary(): Promise<ComplianceSummary> {
    const { data } = await apiClient.get(`/agents/compliance/summary`);
    return data;
  },

  // Rules preview (for onboarding)
  async previewObligations(
    state: string,
    has_pool: boolean,
    has_gas: boolean,
    property_age: string,
    property_type: string
  ): Promise<ComplianceRuleOut[]> {
    const params = new URLSearchParams({
      state,
      has_pool: String(has_pool),
      has_gas: String(has_gas),
      property_age,
      property_type,
    });
    const { data } = await apiClient.get(
      `/agents/compliance/rules/preview?${params.toString()}`
    );
    return data;
  },

  // Onboard property
  async onboardProperty(
    body: PropertyOnboardRequest
  ): Promise<PropertyOnboardResponse> {
    const { data } = await apiClient.post(
      `/agents/compliance/properties/onboard`,
      body
    );
    return data;
  },

  // Rules for a state
  async getRulesForState(state: string): Promise<ComplianceRuleOut[]> {
    const { data } = await apiClient.get(
      `/agents/compliance/rules/${encodeURIComponent(state)}`
    );
    return data;
  },

  // Complete an obligation
  async completeObligation(
    id: string,
    body: CompleteObligationRequest
  ): Promise<ComplianceObligation> {
    const { data } = await apiClient.post(
      `/agents/compliance/obligations/${id}/complete`,
      body
    );
    return data;
  },

  // Schedule an obligation
  async scheduleObligation(
    id: string,
    body: ScheduleObligationRequest
  ): Promise<ComplianceObligation> {
    const { data } = await apiClient.post(
      `/agents/compliance/obligations/${id}/schedule`,
      body
    );
    return data;
  },
};
