// Consultant-facing React Query hooks for the Cases feature.
// Uses the console axios client (X-API-Key). Paths mirror the backend
// router: src/app/agents/immigration/cases/router.py

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import type {
  CaseChecklistItem,
  CaseDocumentOut,
  CaseOut,
  CasePriority,
  CaseStage,
  ChecklistItemStatus,
} from "@/lib/types/immigration";

export interface CaseFilters {
  stage?: CaseStage;
  priority?: CasePriority;
  visa_subclass?: string;
  search?: string;
  limit?: number;
}

export interface CreateCasePayload {
  client_name: string;
  client_email?: string;
  client_phone?: string;
  visa_subclass?: string;
  visa_name?: string;
  stage?: CaseStage;
  priority?: CasePriority;
  notes?: string;
}

export interface UpdateCasePayload {
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  visa_subclass?: string | null;
  visa_name?: string | null;
  stage?: CaseStage;
  priority?: CasePriority;
  consultant_id?: string | null;
  lodgement_date?: string | null;
  decision_date?: string | null;
  notes?: string | null;
}

export interface CaseTimelineEvent {
  id: string;
  case_id: string;
  actor_type: "system" | "consultant" | "client";
  actor_user_id?: string | null;
  event_type: string;
  event_payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratePortalLinkResponse {
  url: string;
  pin: string;
  expires_at: string;
  token_id: string;
  email_sent: boolean;
}

// --- Queries ---------------------------------------------------------------

export function useCases(filters: CaseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.cases.list(filters as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get<CaseOut[]>("/cases", {
        params: filters,
      });
      return data;
    },
  });
}

export function useCase(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? queryKeys.cases.detail(caseId) : ["cases", "detail", "none"],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await apiClient.get<CaseOut>(`/cases/${caseId}`);
      return data;
    },
  });
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? queryKeys.cases.documents(caseId) : ["cases", "documents", "none"],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await apiClient.get<CaseDocumentOut[]>(
        `/cases/${caseId}/documents`
      );
      return data;
    },
  });
}

export function useCaseTimeline(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? queryKeys.cases.timeline(caseId) : ["cases", "timeline", "none"],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await apiClient.get<CaseTimelineEvent[]>(
        `/cases/${caseId}/timeline`
      );
      return data;
    },
  });
}

// --- Mutations -------------------------------------------------------------

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCasePayload) => {
      const { data } = await apiClient.post<CaseOut>("/cases", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.all });
    },
  });
}

export function useUpdateCase(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateCasePayload) => {
      const { data } = await apiClient.patch<CaseOut>(`/cases/${caseId}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) });
      qc.invalidateQueries({ queryKey: queryKeys.cases.all });
    },
  });
}

export function useGeneratePortalLink(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { send_email?: boolean; expires_in_days?: number } = {}) => {
      const { data } = await apiClient.post<GeneratePortalLinkResponse>(
        `/cases/${caseId}/generate-portal-link`,
        {
          send_email: opts.send_email ?? true,
          expires_in_days: opts.expires_in_days,
        }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
    },
  });
}

export function useRevokePortalLink(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      await apiClient.post(`/cases/${caseId}/portal-links/${tokenId}/revoke`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
    },
  });
}

export function useReviewDocument(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      document_id: string;
      status: "validated" | "flagged" | "rejected";
      review_notes?: string;
    }) => {
      const { data } = await apiClient.post<CaseDocumentOut>(
        `/cases/${caseId}/documents/${payload.document_id}/review`,
        { status: payload.status, review_notes: payload.review_notes }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.documents(caseId) });
      qc.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
    },
  });
}

// --- Checklist -------------------------------------------------------------

export function useGenerateChecklist(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { visa_subclass?: string } = {}) => {
      const { data } = await apiClient.post<CaseChecklistItem[]>(
        `/cases/${caseId}/generate-checklist`,
        { visa_subclass: opts.visa_subclass }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) });
      qc.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
    },
  });
}

export function useUpdateChecklistItem(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      item_id: string;
      status?: ChecklistItemStatus;
      document_id?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.patch<CaseChecklistItem>(
        `/cases/${caseId}/checklist/${payload.item_id}`,
        {
          status: payload.status,
          document_id: payload.document_id,
          notes: payload.notes,
        }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) });
    },
  });
}

export function useDownloadDocumentUrl() {
  return useMutation({
    mutationFn: async (payload: { caseId: string; documentId: string }) => {
      const { data } = await apiClient.get<{ url: string; expires_in_seconds: number }>(
        `/cases/${payload.caseId}/documents/${payload.documentId}/download`
      );
      return data;
    },
  });
}
