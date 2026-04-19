// Client-portal React Query hooks — consumed by (client-portal) route group.
// Uses portalClient which injects the Authorization: Bearer <session_jwt>
// header from sessionStorage.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import portalClient, { PORTAL_SESSION_STORAGE_KEY } from "@/lib/api/portal-client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import type {
  CaseChecklistItem,
  CaseDocumentOut,
  CaseStage,
} from "@/lib/types/immigration";

export interface PortalCase {
  id: string;
  client_name: string;
  visa_subclass?: string | null;
  visa_name?: string | null;
  stage: CaseStage;
  documents: CaseDocumentOut[];
  checklist?: CaseChecklistItem[] | null;
}

export interface PortalVerifyResponse {
  session_jwt: string;
  expires_at: string;
  case_id: string;
}

// --- Mutations -------------------------------------------------------------

export function usePortalVerify() {
  return useMutation({
    mutationFn: async (payload: { token: string; pin: string }) => {
      const { data } = await portalClient.post<PortalVerifyResponse>(
        "/client-portal/verify",
        payload
      );
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PORTAL_SESSION_STORAGE_KEY, data.session_jwt);
      }
      return data;
    },
  });
}

export function usePortalUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await portalClient.post<CaseDocumentOut>(
        "/client-portal/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.portal.case() });
    },
  });
}

// --- Queries ---------------------------------------------------------------

export function usePortalCase(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.portal.case(),
    enabled,
    queryFn: async () => {
      const { data } = await portalClient.get<PortalCase>("/client-portal/case");
      return data;
    },
    refetchInterval: 15_000, // client portal polls while analysis runs
  });
}
