import apiClient from "./client";

export interface InvoiceDetection {
  id: string;
  mailbox: string;
  message_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  received_at: string;
  is_invoice: boolean;
  confidence_score: number;
  ai_reasoning: string | null;
  attachment_names: string[];
  detected_invoice_type: string | null;
  action: string;
  moved_to_folder: string | null;
  moved_at: string | null;
  error_message: string | null;
  manually_reviewed: boolean;
  review_action: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface InvoiceStats {
  total_processed: number;
  invoices_detected: number;
  moved: number;
  flagged: number;
  accuracy: number;
  by_mailbox: Record<string, number>;
}

export interface InvoiceFilters {
  mailbox?: string;
  is_invoice?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const invoiceService = {
  async getDetections(filters?: InvoiceFilters): Promise<InvoiceDetection[]> {
    const params = new URLSearchParams();
    if (filters?.mailbox) params.set("mailbox", filters.mailbox);
    if (filters?.is_invoice !== undefined)
      params.set("is_invoice", String(filters.is_invoice));
    if (filters?.from_date) params.set("from", filters.from_date);
    if (filters?.to_date) params.set("to", filters.to_date);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    const { data } = await apiClient.get(
      `/agents/invoice/detections?${params.toString()}`
    );
    return data;
  },

  async getDetection(id: string): Promise<InvoiceDetection> {
    const { data } = await apiClient.get(`/agents/invoice/detections/${id}`);
    return data;
  },

  async reviewDetection(
    id: string,
    action: "confirmed" | "rejected" | "moved_manually"
  ): Promise<InvoiceDetection> {
    const { data } = await apiClient.post(
      `/agents/invoice/detections/${id}/review`,
      { action }
    );
    return data;
  },

  async getStats(mailbox?: string): Promise<InvoiceStats> {
    const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : "";
    const { data } = await apiClient.get(`/agents/invoice/stats${params}`);
    return data;
  },
};
