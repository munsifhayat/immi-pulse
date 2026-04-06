import apiClient from "./client";

export interface ActivityEntry {
  id: string;
  agent_name: string;
  action: string;
  mailbox: string | null;
  message_id: string | null;
  subject: string | null;
  details: Record<string, unknown> | null;
  confidence_score: number | null;
  processing_time_ms: number | null;
  status: "success" | "error";
  error_message: string | null;
  created_at: string;
}

export interface ActivityMetrics {
  emails_processed_today: number;
  avg_processing_time_ms: number;
  ai_usage: Record<string, unknown>;
  error_rate: number;
  /** Present when API returns extended metrics */
  ai_calls_today?: number;
  ai_cost_today_usd?: number;
}

export interface ActivityFilters {
  agent?: string;
  mailbox?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}

export interface AgentStatusEntry {
  last_active: string | null;
  last_status: string | null;
  total_processed: number;
  error_count: number;
}

export const activityService = {
  async getActivity(filters?: ActivityFilters): Promise<ActivityEntry[]> {
    const params = new URLSearchParams();
    if (filters?.agent) params.set("agent", filters.agent);
    if (filters?.mailbox) params.set("mailbox", filters.mailbox);
    if (filters?.from_date) params.set("from", filters.from_date);
    if (filters?.to_date) params.set("to", filters.to_date);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const { data } = await apiClient.get(
      `/activity?${params.toString()}`
    );
    return data;
  },

  async getMetrics(): Promise<ActivityMetrics> {
    const { data } = await apiClient.get("/metrics");
    return data;
  },

  async getAgentStatus(): Promise<Record<string, AgentStatusEntry>> {
    const { data } = await apiClient.get("/agents/status");
    return data;
  },
};
