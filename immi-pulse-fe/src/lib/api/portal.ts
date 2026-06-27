/**
 * Client-portal *account* API (persistent, org-scoped login).
 *
 * Separate from the legacy PIN flow in `portal-client.ts`: this uses a
 * long-lived account session JWT stored in localStorage so a client stays
 * signed in. Public endpoints live under /public/portal and do NOT require the
 * console X-API-Key.
 */

import axios from "axios";

export const PORTAL_ACCOUNT_TOKEN_KEY = "ip_portal_account_token";

const portalAccountClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
});

portalAccountClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(PORTAL_ACCOUNT_TOKEN_KEY);
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

// ---- Types (mirror backend portal/schemas.py) ----

export interface PortalOrgInfo {
  org_slug: string;
  firm_name: string;
  omara_number?: string | null;
}

export interface PortalMe {
  account_id: string;
  email: string;
  name?: string | null;
  status: string;
  must_reset: boolean;
  firm_name: string;
  org_slug: string;
}

export interface PortalLoginResponse {
  access_token: string;
  expires_at: string;
  must_reset: boolean;
  account: PortalMe;
}

export interface PortalFact {
  label: string;
  value: string;
}

export interface PortalTodo {
  type: "sign" | "upload" | "respond" | "info";
  title: string;
  subtitle?: string | null;
  done: boolean;
}

export interface PortalChecklistItem {
  id: string;
  label: string;
  description?: string | null;
  document_type?: string | null;
  required: boolean;
  status: string;
  document_id?: string | null;
}

export interface PortalDocument {
  id: string;
  file_name: string;
  document_type?: string | null;
  status: string;
  uploaded_by_type: string;
  uploaded_at?: string | null;
}

export interface PortalLetterInfo {
  letter_id: string;
  status: string;
  can_sign: boolean;
  rendered_body_md: string;
  fee_lines: Array<Record<string, unknown>>;
  firm_name: string;
  omara_number?: string | null;
  abn?: string | null;
  sent_at?: string | null;
  signed_at?: string | null;
}

export interface PortalTimelineItem {
  key: string;
  title: string;
  date?: string | null;
  hint?: string | null;
  state: "done" | "now" | "future";
}

export interface PortalApplicationSummary {
  application_id: string;
  case_id?: string | null;
  title: string;
  subclass?: string | null;
  stage_label: string;
  status: string;
  progress_pct: number;
  step_index: number;
  step_total: number;
  needs_count: number;
  is_complete: boolean;
  updated_at?: string | null;
}

export interface PortalApplicationDetail extends PortalApplicationSummary {
  summary_text?: string | null;
  facts: PortalFact[];
  todos: PortalTodo[];
  letter?: PortalLetterInfo | null;
  checklist: PortalChecklistItem[];
  documents: PortalDocument[];
  timeline: PortalTimelineItem[];
}

// ---- Token helpers ----

export const portalToken = {
  get: () =>
    typeof window !== "undefined"
      ? localStorage.getItem(PORTAL_ACCOUNT_TOKEN_KEY)
      : null,
  set: (t: string) => {
    if (typeof window !== "undefined") localStorage.setItem(PORTAL_ACCOUNT_TOKEN_KEY, t);
  },
  clear: () => {
    if (typeof window !== "undefined") localStorage.removeItem(PORTAL_ACCOUNT_TOKEN_KEY);
  },
};

// ---- API ----

export const portalApi = {
  info: async (orgSlug: string): Promise<PortalOrgInfo> =>
    (await portalAccountClient.get(`/public/portal/${orgSlug}/info`)).data,

  login: async (orgSlug: string, email: string, password: string): Promise<PortalLoginResponse> =>
    (await portalAccountClient.post(`/public/portal/${orgSlug}/login`, { email, password })).data,

  forgotPassword: async (orgSlug: string, email: string): Promise<{ ok: boolean; message?: string }> =>
    (await portalAccountClient.post(`/public/portal/${orgSlug}/forgot-password`, { email })).data,

  me: async (): Promise<PortalMe> =>
    (await portalAccountClient.get(`/public/portal/me`)).data,

  setPassword: async (newPassword: string): Promise<{ ok: boolean; message?: string }> =>
    (await portalAccountClient.post(`/public/portal/set-password`, { new_password: newPassword })).data,

  listApplications: async (): Promise<PortalApplicationSummary[]> =>
    (await portalAccountClient.get(`/public/portal/applications`)).data,

  getApplication: async (id: string): Promise<PortalApplicationDetail> =>
    (await portalAccountClient.get(`/public/portal/applications/${id}`)).data,

  sign: async (
    id: string,
    payload: {
      signer_name: string;
      method: "typed_name" | "drawn";
      signature_image_b64?: string;
      consent_given: boolean;
    }
  ): Promise<{ success: boolean; signed_at: string }> =>
    (await portalAccountClient.post(`/public/portal/applications/${id}/sign`, payload)).data,

  uploadDocument: async (id: string, file: File): Promise<PortalDocument> => {
    const form = new FormData();
    form.append("file", file);
    return (
      await portalAccountClient.post(`/public/portal/applications/${id}/documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
};

export default portalAccountClient;
