import apiClient from "./client";

export interface EmergentWorkItem {
  id: string;
  mailbox: string;
  source_message_ids: string[];
  thread_id: string | null;
  subject: string;
  client_name: string | null;
  contract_reference: string | null;
  original_scope_summary: string | null;
  emergent_work_description: string | null;
  supporting_evidence: Array<{ source: string; detail: string }>;
  confidence_score: number;
  ai_reasoning: string | null;
  recommended_action: string | null;
  processed_attachments: Array<{
    name: string;
    type: string;
    extracted_text_preview: string | null;
  }>;
  status: "detected" | "raised" | "resolved" | "dismissed";
  raised_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergentWorkReport {
  id: string;
  report_time: string;
  period_start: string;
  period_end: string;
  items_detected: number;
  summary_table: Record<string, unknown>[];
  summary_text: string;
  created_at: string;
}

export interface EmergentWorkStats {
  total_detected: number;
  raised: number;
  resolved: number;
  dismissed: number;
  by_client: Record<string, number>;
}

export interface EmergentWorkFilters {
  client?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const emergentWorkService = {
  async getItems(filters?: EmergentWorkFilters): Promise<EmergentWorkItem[]> {
    const params = new URLSearchParams();
    if (filters?.client) params.set("client", filters.client);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from_date) params.set("from", filters.from_date);
    if (filters?.to_date) params.set("to", filters.to_date);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    const { data } = await apiClient.get(
      `/agents/emergent-work/items?${params.toString()}`
    );
    return data;
  },

  async getItem(id: string): Promise<EmergentWorkItem> {
    const { data } = await apiClient.get(`/agents/emergent-work/items/${id}`);
    return data;
  },

  async updateItemStatus(
    id: string,
    status: "raised" | "resolved" | "dismissed"
  ): Promise<EmergentWorkItem> {
    const { data } = await apiClient.put(
      `/agents/emergent-work/items/${id}/status`,
      { status }
    );
    return data;
  },

  async getReports(): Promise<EmergentWorkReport[]> {
    const { data } = await apiClient.get("/agents/emergent-work/reports");
    return data;
  },

  async getLatestReport(): Promise<EmergentWorkReport> {
    const { data } = await apiClient.get(
      "/agents/emergent-work/reports/latest"
    );
    return data;
  },

  async getStats(mailbox?: string): Promise<EmergentWorkStats> {
    const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : "";
    const { data } = await apiClient.get(`/agents/emergent-work/stats${params}`);
    return data;
  },
};
