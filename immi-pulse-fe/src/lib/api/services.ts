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
  qualified_at?: string | null;
  letter_sent_at?: string | null;
  letter_signed_at?: string | null;
  paid_at?: string | null;
  converted_at?: string | null;
  skipped_letter?: string | null;
  skipped_payment?: string | null;
  promoted_case_id?: string | null;
  created_at: string;
}

export interface PreCaseDetail extends PreCaseListItem {
  ai_extracted?: Record<string, unknown> | null;
  questionnaire_id?: string | null;
  questionnaire_fields: QuestionField[];
  answers: Record<string, unknown>;
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

export interface Plan {
  tier: "starter" | "pro" | "enterprise";
  name: string;
  description: string;
  price_per_seat_aud_monthly: number;
  price_label: string;
  is_default_signup: boolean;
  is_custom: boolean;
  features: string[];
}

export interface BillingSummary {
  tier: "starter" | "pro" | "enterprise";
  status: "trial" | "active" | "past_due" | "canceled" | "frozen" | "archived";
  plan_name: string;
  price_label: string;
  price_per_seat_aud_monthly: number;
  is_custom: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  total_seats: number;
  role_counts: Record<string, number>;
  monthly_total_aud: number;
  features: string[];
  pilot_code: string | null;
  pilot_name: string | null;
}

export const orgApi = {
  update: async (
    payload: Partial<{
      name: string;
      niche: string;
      omara_number: string;
      website: string;
      business_phone: string;
      contact_person: string;
      business_hours: string;
      social_links: Record<string, string>;
      abn: string;
      bsb: string;
      bank_account_number: string;
      bank_account_name: string;
      payid: string;
      bpay_biller_code: string;
    }>
  ) => (await apiClient.patch("/org", payload)).data,
  listSeats: async (): Promise<SeatRow[]> => (await apiClient.get("/org/seats")).data,
  invite: async (email: string, role: string): Promise<InviteResponse> =>
    (await apiClient.post("/org/seats/invite", { email, role })).data,
  removeSeat: async (seatId: string) =>
    (await apiClient.delete(`/org/seats/${seatId}`)).data,
  resendInvite: async (seatId: string): Promise<InviteResponse> =>
    (await apiClient.post(`/org/seats/${seatId}/resend`)).data,
  listPlans: async (): Promise<Plan[]> =>
    (await apiClient.get("/org/plans")).data,
  getBilling: async (): Promise<BillingSummary> =>
    (await apiClient.get("/org/billing")).data,
  selectPlan: async (tier: Plan["tier"]): Promise<BillingSummary> =>
    (await apiClient.post("/org/billing/select-plan", { tier })).data,
  redeemPromo: async (
    code: string
  ): Promise<{
    applied: boolean;
    already_applied: boolean;
    credits_added: number;
    pilot_name: string | null;
    billing: BillingSummary;
  }> => (await apiClient.post("/org/billing/redeem-promo", { code })).data,
  resetPromo: async (): Promise<{
    reset: boolean;
    billing: BillingSummary;
  }> => (await apiClient.post("/org/billing/reset-promo")).data,
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
    org_omara_number: string | null;
    org_website: string | null;
    org_business_phone: string | null;
    org_contact_person: string | null;
    org_business_hours: string | null;
    org_social_links: Record<string, string> | null;
    fields: QuestionField[];
  }> => (await apiClient.get(`/public/q/${slug}`)).data,

  submit: async (
    slug: string,
    payload: {
      submitter_email: string;
      submitter_first_name: string;
      submitter_last_name: string;
      submitter_phone: string;
      answers: Record<string, unknown>;
    }
  ): Promise<{ response_id: string; pre_case_id: string; message: string }> =>
    (await apiClient.post(`/public/q/${slug}/submit`, payload)).data,
};

// ---- Pre-Cases ----

export interface PreCaseListResponse {
  items: PreCaseListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PreCaseListParams {
  status?: string;
  group?: "inbox" | "precase" | "terminal";
  q?: string;
  limit?: number;
  offset?: number;
}

export const preCasesApi = {
  list: async (params?: PreCaseListParams): Promise<PreCaseListResponse> =>
    (
      await apiClient.get("/precases", {
        params,
      })
    ).data,
  get: async (id: string): Promise<PreCaseDetail> =>
    (await apiClient.get(`/precases/${id}`)).data,
  archive: async (id: string) =>
    (await apiClient.post(`/precases/${id}/archive`)).data,
  qualify: async (id: string, note?: string): Promise<PreCaseDetail> =>
    (await apiClient.post(`/precases/${id}/qualify`, { note })).data,
  transition: async (
    id: string,
    targetStatus: "in_review" | "qualified" | "letter_sent" | "letter_signed" | "paid"
  ): Promise<PreCaseDetail> =>
    (await apiClient.post(`/precases/${id}/transition`, { target_status: targetStatus })).data,
  promote: async (id: string): Promise<{ case_id: string }> =>
    (await apiClient.post(`/precases/${id}/promote`)).data,
  forceConvert: async (
    id: string,
    payload: { reason: string; visa_subclass?: string; visa_name?: string }
  ): Promise<{ case_id: string }> =>
    (await apiClient.post(`/precases/${id}/force-convert`, payload)).data,
  retriggerAi: async (id: string) =>
    (await apiClient.post(`/precases/${id}/retrigger-ai`)).data,
};

// ---- Clients ----

export interface ClientListItem {
  id: string;
  primary_email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  first_seen_at?: string | null;
  last_activity_at?: string | null;
  query_count: number;
  precase_count: number;
  case_count: number;
  archived_count: number;
  latest_status: "query" | "precase" | "case" | "none";
}

export interface ClientHistoryItem {
  kind: "query" | "precase" | "letter_sent" | "letter_signed" | "payment" | "case_opened" | "case_stage" | "manual_note";
  occurred_at: string;
  title: string;
  detail?: string | null;
  ref_id?: string | null;
}

export interface ClientDetail {
  id: string;
  primary_email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  first_seen_at?: string | null;
  created_at: string;
  queries: Array<Record<string, unknown>>;
  precases: Array<Record<string, unknown>>;
  cases: Array<Record<string, unknown>>;
  history: ClientHistoryItem[];
}

export const clientsApi = {
  list: async (search?: string): Promise<ClientListItem[]> =>
    (await apiClient.get("/clients", { params: search ? { search } : undefined })).data,
  get: async (id: string): Promise<ClientDetail> =>
    (await apiClient.get(`/clients/${id}`)).data,
  create: async (payload: {
    primary_email: string;
    name?: string;
    phone?: string;
    country?: string;
  }): Promise<ClientListItem> => (await apiClient.post("/clients", payload)).data,
  patch: async (
    id: string,
    payload: Partial<{ name: string; phone: string; country: string }>
  ): Promise<ClientDetail> => (await apiClient.patch(`/clients/${id}`, payload)).data,
  sendQuestionnaire: async (
    id: string,
    payload: { questionnaire_id: string; personal_note?: string }
  ): Promise<{ public_link: string; note: string }> =>
    (await apiClient.post(`/clients/${id}/send-questionnaire`, payload)).data,
  openCaseDirect: async (
    id: string,
    payload: { visa_subclass?: string; visa_name?: string; notes?: string; skip_reason?: string }
  ): Promise<{ case_id: string }> =>
    (await apiClient.post(`/clients/${id}/open-case`, payload)).data,
};

// ---- Engagement Letters ----

export interface FeeDefaults {
  professional_fee?: string | number;
  disbursements?: string | number;
  retainer?: string | number;
  currency?: string;
}

export interface FeeLine {
  label: string;
  amount_aud: string | number;
  kind: "professional_fee" | "disbursement" | "retainer" | "balance" | "other";
}

export interface LetterTemplate {
  id: string;
  org_id: string;
  name: string;
  body_md: string;
  fee_defaults?: FeeDefaults | null;
  is_default: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface LetterOut {
  id: string;
  pre_case_id: string;
  template_id?: string | null;
  rendered_body_md: string;
  fee_lines: FeeLine[];
  status: string;
  sent_at?: string | null;
  signed_at?: string | null;
  sign_url?: string | null;
  sign_pin?: string | null;
  sign_link_expires_at?: string | null;
  created_at: string;
}

export interface PublicLetterView {
  letter_id: string;
  firm_name: string;
  omara_number?: string | null;
  abn?: string | null;
  rendered_body_md: string;
  rendered_html?: string | null;
  fee_lines: FeeLine[];
  status: string;
}

export type EmailDeliveryStatus = "sent" | "failed" | "skipped";

export interface SendLetterResponse {
  letter_id: string;
  sign_url: string;
  sign_pin: string;
  expires_at: string;
  client_email: string | null;
  email_status: EmailDeliveryStatus;
  email_error: string | null;
}

export interface ResendReminderResponse {
  letter_id: string;
  client_email: string | null;
  email_status: EmailDeliveryStatus;
  email_error: string | null;
}

export const lettersApi = {
  listTemplates: async (): Promise<LetterTemplate[]> =>
    (await apiClient.get("/engagement-letters/templates")).data,
  getDefaultTemplate: async (): Promise<LetterTemplate> =>
    (await apiClient.get("/engagement-letters/templates/default")).data,
  createTemplate: async (payload: {
    name?: string;
    body_md: string;
    fee_defaults?: FeeDefaults;
    is_default?: boolean;
  }): Promise<LetterTemplate> =>
    (await apiClient.post("/engagement-letters/templates", payload)).data,
  patchTemplate: async (
    id: string,
    payload: Partial<{ name: string; body_md: string; fee_defaults: FeeDefaults; is_default: boolean }>
  ): Promise<LetterTemplate> =>
    (await apiClient.patch(`/engagement-letters/templates/${id}`, payload)).data,
  deleteTemplate: async (id: string) =>
    (await apiClient.delete(`/engagement-letters/templates/${id}`)).data,

  getForPreCase: async (preCaseId: string): Promise<LetterOut | null> =>
    (await apiClient.get(`/engagement-letters/by-precase/${preCaseId}`)).data,
  send: async (
    preCaseId: string,
    payload: {
      compose: {
        template_id?: string;
        visa_subclass?: string;
        visa_name?: string;
        scope?: string;
        fee_lines: FeeLine[];
        extra_md?: string;
      };
      expires_in_days?: number;
    }
  ): Promise<SendLetterResponse> =>
    (await apiClient.post(`/engagement-letters/by-precase/${preCaseId}/send`, payload)).data,
  markSignedManually: async (
    preCaseId: string,
    payload: { signer_name: string; method?: "manual_upload" | "consultant_attest"; reason: string; uploaded_pdf_s3_key?: string }
  ): Promise<LetterOut> =>
    (await apiClient.post(`/engagement-letters/by-precase/${preCaseId}/mark-signed-manually`, payload)).data,
  void: async (letterId: string) =>
    (await apiClient.post(`/engagement-letters/${letterId}/void`)).data,
  resendReminder: async (letterId: string): Promise<ResendReminderResponse> =>
    (await apiClient.post(`/engagement-letters/${letterId}/resend-reminder`)).data,
};

export const publicLettersApi = {
  get: async (signToken: string): Promise<PublicLetterView> =>
    (await apiClient.get(`/public/letters/${signToken}`)).data,
  sign: async (
    signToken: string,
    payload: {
      pin: string;
      consent_given: boolean;
      signer_name: string;
      method: "typed_name" | "drawn";
      signature_image_b64?: string;
    }
  ): Promise<{ success: boolean; signed_at: string; download_url: string | null }> =>
    (await apiClient.post(`/public/letters/${signToken}/sign`, payload)).data,
};

// ---- Payments ----

export type PaymentMethod =
  | "stripe_card"
  | "stripe_becs"
  | "bank_transfer"
  | "payid"
  | "bpay"
  | "cash"
  | "cheque"
  | "waived"
  | "other";

export interface PaymentRecord {
  id: string;
  checkpoint_id?: string | null;
  pre_case_id?: string | null;
  case_id?: string | null;
  method: PaymentMethod;
  amount_aud: string;
  reference?: string | null;
  received_at: string;
  notes?: string | null;
  receipt_number?: string | null;
  created_at: string;
}

export const paymentsApi = {
  list: async (params: {
    pre_case_id?: string;
    case_id?: string;
    checkpoint_id?: string;
  }): Promise<PaymentRecord[]> =>
    (await apiClient.get("/payments", { params })).data,
  record: async (payload: {
    checkpoint_id?: string;
    pre_case_id?: string;
    case_id?: string;
    method: PaymentMethod;
    amount_aud: string | number;
    reference?: string;
    received_at: string;
    notes?: string;
  }): Promise<PaymentRecord> => (await apiClient.post("/payments", payload)).data,
  skip: async (payload: {
    pre_case_id: string;
    reason: string;
  }): Promise<{ payment_record_id: string; pre_case_id: string; new_status: string }> =>
    (await apiClient.post("/payments/skip", payload)).data,
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
