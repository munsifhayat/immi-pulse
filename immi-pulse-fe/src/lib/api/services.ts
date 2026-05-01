/**
 * Typed API services for the multi-tenant console.
 *
 * One thin wrapper per resource — keeps fetch logic out of components.
 * All call apiClient which auto-injects X-API-Key + Authorization: Bearer.
 */

import apiClient from "./client";

// ---- Types ----

export type FieldType =
  | "short_text"
  | "long_text"
  | "yes_no"
  | "single_select"
  | "multi_select"
  | "number"
  | "date"
  | "email"
  | "phone";

export interface QuestionField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[] | null;
  placeholder?: string | null;
  helper_text?: string | null;
}

export interface QuestionnaireListItem {
  id: string;
  name: string;
  slug: string;
  audience: string;
  is_active: boolean;
  created_at: string;
  field_count: number;
  response_count: number;
}

export interface Questionnaire {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  audience: string;
  is_active: boolean;
  created_at: string;
  fields: QuestionField[];
  response_count: number;
  public_url?: string;
}

export interface SeatRow {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
  omara_number: string | null;
  invited_at: string | null;
  joined_at: string | null;
  user_email: string | null;
  user_name: string | null;
}

export interface InviteResponse {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  invite_link: string;
}

export interface PreCaseListItem {
  id: string;
  status: string;
  ai_status: string;
  ai_summary?: string | null;
  ai_suggested_outcome?: string | null;
  ai_confidence?: number | null;
  questionnaire_name?: string | null;
  client_id?: string | null;
  client_email?: string | null;
  client_name?: string | null;
  submitted_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface PreCaseDetail extends PreCaseListItem {
  ai_extracted?: Record<string, unknown> | null;
  questionnaire_id?: string | null;
  questionnaire_fields: QuestionField[];
  answers: Record<string, unknown>;
  promoted_case_id?: string | null;
}

export interface Checkpoint {
  id: string;
  case_id?: string | null;
  pre_case_id?: string | null;
  type: string;
  title: string;
  description?: string | null;
  amount_aud: string;
  blocking: boolean;
  status: string;
  payment_link_url?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  created_at: string;
}

// ---- Auth / Org ----

export const authApi = {
  me: async () => (await apiClient.get("/auth/me")).data,
};

export const orgApi = {
  update: async (payload: Partial<{ name: string; niche: string; omara_number: string }>) =>
    (await apiClient.patch("/org", payload)).data,
  listSeats: async (): Promise<SeatRow[]> => (await apiClient.get("/org/seats")).data,
  invite: async (email: string, role: string): Promise<InviteResponse> =>
    (await apiClient.post("/org/seats/invite", { email, role })).data,
  removeSeat: async (seatId: string) =>
    (await apiClient.delete(`/org/seats/${seatId}`)).data,
};

// ---- Questionnaires ----

export const questionnairesApi = {
  list: async (): Promise<QuestionnaireListItem[]> =>
    (await apiClient.get("/questionnaires")).data,
  get: async (id: string): Promise<Questionnaire> =>
    (await apiClient.get(`/questionnaires/${id}`)).data,
  create: async (payload: {
    name: string;
    description?: string;
    audience: string;
    fields: QuestionField[];
  }): Promise<Questionnaire> =>
    (await apiClient.post("/questionnaires", payload)).data,
  update: async (
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      audience: string;
      is_active: boolean;
      fields: QuestionField[];
    }>
  ): Promise<Questionnaire> =>
    (await apiClient.patch(`/questionnaires/${id}`, payload)).data,
  delete: async (id: string) =>
    (await apiClient.delete(`/questionnaires/${id}`)).data,
};

// ---- Public form (no auth, but X-API-Key still sent) ----

export const publicQuestionnairesApi = {
  get: async (
    slug: string
  ): Promise<{
    id: string;
    name: string;
    description: string | null;
    org_name: string;
    fields: QuestionField[];
  }> => (await apiClient.get(`/public/q/${slug}`)).data,

  submit: async (
    slug: string,
    payload: { submitter_email: string; submitter_name?: string; answers: Record<string, unknown> }
  ): Promise<{ response_id: string; pre_case_id: string; message: string }> =>
    (await apiClient.post(`/public/q/${slug}/submit`, payload)).data,
};

// ---- Pre-Cases ----

export const preCasesApi = {
  list: async (status?: string): Promise<PreCaseListItem[]> =>
    (
      await apiClient.get("/precases", {
        params: status ? { status } : undefined,
      })
    ).data,
  get: async (id: string): Promise<PreCaseDetail> =>
    (await apiClient.get(`/precases/${id}`)).data,
  archive: async (id: string) =>
    (await apiClient.post(`/precases/${id}/archive`)).data,
  promote: async (id: string): Promise<{ case_id: string }> =>
    (await apiClient.post(`/precases/${id}/promote`)).data,
  retriggerAi: async (id: string) =>
    (await apiClient.post(`/precases/${id}/retrigger-ai`)).data,
};

// ---- Checkpoints ----

export const checkpointsApi = {
  list: async (params: { case_id?: string; pre_case_id?: string }): Promise<Checkpoint[]> =>
    (await apiClient.get("/checkpoints", { params })).data,
  create: async (payload: {
    case_id?: string;
    pre_case_id?: string;
    type: string;
    title: string;
    description?: string;
    amount_aud: number | string;
    blocking?: boolean;
  }): Promise<Checkpoint> => (await apiClient.post("/checkpoints", payload)).data,
  send: async (id: string): Promise<Checkpoint> =>
    (await apiClient.post(`/checkpoints/${id}/send`)).data,
  markPaid: async (id: string): Promise<Checkpoint> =>
    (await apiClient.post(`/checkpoints/${id}/mark-paid`)).data,
  cancel: async (id: string) =>
    (await apiClient.post(`/checkpoints/${id}/cancel`)).data,
};
