// React Query hooks for the lawyer-showcase demo endpoints.
// Backend router: src/app/demo/router.py

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import type { CaseOut, DemoInboxEmail } from "@/lib/types/immigration";

export const demoKeys = {
  all: ["demo"] as const,
  inbox: () => [...demoKeys.all, "inbox"] as const,
  status: () => [...demoKeys.all, "status"] as const,
};

export function useDemoInbox() {
  return useQuery({
    queryKey: demoKeys.inbox(),
    queryFn: async () => {
      const { data } = await apiClient.get<DemoInboxEmail[]>("/demo/inbox");
      return data;
    },
    refetchOnWindowFocus: false,
  });
}

export function useCreateCaseFromEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email_id: string;
      assign_checklist?: boolean;
    }) => {
      const { data } = await apiClient.post<CaseOut>(
        `/demo/emails/${payload.email_id}/create-case`,
        { assign_checklist: payload.assign_checklist ?? true }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demoKeys.inbox() });
      qc.invalidateQueries({ queryKey: queryKeys.cases.all });
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ deleted_cases: number }>(
        "/demo/reset"
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: demoKeys.all });
      qc.invalidateQueries({ queryKey: queryKeys.cases.all });
    },
  });
}
