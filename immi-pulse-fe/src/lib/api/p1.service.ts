import apiClient from "./client";

export interface P1Job {
  id: string;
  mailbox: string;
  message_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  received_at: string;
  priority: "p1" | "p2" | "p3" | "p4";
  is_urgent: boolean;
  confidence_score: number;
  ai_reasoning: string | null;
  category: string | null;
  client_name: string | null;
  contract_location: string | null;
  job_description: string | null;
  ai_summary: string | null;
  response_deadline: string | null;
  first_response_at: string | null;
  is_responded: boolean;
  is_overdue: boolean;
  status: "open" | "responded" | "resolved" | "escalated";
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  summary_date: string;
  summary_time: string;
  summary_type: string;
  total_p1_jobs: number;
  responded_count: number;
  overdue_count: number;
  summary_table: Record<string, unknown>[];
  summary_text: string;
  created_at: string;
}

export interface P1Stats {
  total_p1: number;
  responded_in_sla: number;
  overdue: number;
  avg_response_time: number;
  by_client: Record<string, number>;
}

export interface P1Filters {
  priority?: string;
  status?: string;
  is_overdue?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const p1Service = {
  async getJobs(filters?: P1Filters): Promise<P1Job[]> {
    const params = new URLSearchParams();
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.is_overdue !== undefined)
      params.set("is_overdue", String(filters.is_overdue));
    if (filters?.from_date) params.set("from", filters.from_date);
    if (filters?.to_date) params.set("to", filters.to_date);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    const { data } = await apiClient.get(
      `/agents/p1/jobs?${params.toString()}`
    );
    return data;
  },

  async getJob(id: string): Promise<P1Job> {
    const { data } = await apiClient.get(`/agents/p1/jobs/${id}`);
    return data;
  },

  async updateJobStatus(
    id: string,
    status: "responded" | "resolved" | "escalated"
  ): Promise<P1Job> {
    const { data } = await apiClient.put(`/agents/p1/jobs/${id}/status`, {
      status,
    });
    return data;
  },

  async getTodaySummary(): Promise<DailySummary> {
    const { data } = await apiClient.get("/agents/p1/summary/today");
    return data;
  },

  async getSummaryByDate(date: string): Promise<DailySummary> {
    const { data } = await apiClient.get(`/agents/p1/summary/${date}`);
    return data;
  },

  async getSummaries(): Promise<DailySummary[]> {
    const { data } = await apiClient.get("/agents/p1/summaries");
    return data;
  },

  async getStats(mailbox?: string): Promise<P1Stats> {
    const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : "";
    const { data } = await apiClient.get(`/agents/p1/stats${params}`);
    return data;
  },
};
