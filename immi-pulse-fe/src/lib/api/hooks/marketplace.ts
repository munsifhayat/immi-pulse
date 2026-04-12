// React Query hooks for the Agents Marketplace.
// Public listing + detail use apiClient (console X-API-Key) in MVP —
// rotate to an unauthenticated public client once we strip the header
// for marketplace public routes on the frontend too.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";

export type AgentProfileTier = "basic" | "platinum";
export type AgentProfileStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

// Mirrors backend AgentProfileOut.
export interface AgentProfileOut {
  id: string;
  user_id: string;
  firm_name?: string | null;
  omara_number: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  specializations?: string[] | null;
  languages?: string[] | null;
  years_experience?: number | null;
  consultation_fee?: number | null;
  response_time_hours?: number | null;
  tier: AgentProfileTier;
  status: AgentProfileStatus;
  featured: boolean;
  avatar_color?: string | null;
  rating: number;
  review_count: number;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  email?: string | null;
}

export interface MarketplaceFilters {
  city?: string;
  state?: string;
  visa_type?: string;
  language?: string;
  tier?: AgentProfileTier;
  search?: string;
  sort?: "rating" | "experience" | "response_time";
  limit?: number;
  offset?: number;
}

export interface ApplyAgentProfilePayload {
  email: string;
  first_name: string;
  last_name: string;
  firm_name?: string;
  omara_number: string;
  bio?: string;
  city?: string;
  state?: string;
  specializations?: string[];
  languages?: string[];
  years_experience?: number;
  consultation_fee?: number;
  response_time_hours?: number;
}

// --- Public queries --------------------------------------------------------

export function useMarketplaceAgents(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.marketplace.agents(filters as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentProfileOut[]>(
        "/marketplace/public/agents",
        { params: filters }
      );
      return data;
    },
  });
}

export function useAgentProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: profileId
      ? queryKeys.marketplace.agent(profileId)
      : ["marketplace", "agent", "none"],
    enabled: !!profileId,
    queryFn: async () => {
      const { data } = await apiClient.get<AgentProfileOut>(
        `/marketplace/public/agents/${profileId}`
      );
      return data;
    },
  });
}

// --- Applications ----------------------------------------------------------

export function useApplyAsAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApplyAgentProfilePayload) => {
      const { data } = await apiClient.post<{
        profile: AgentProfileOut;
        message: string;
      }>("/marketplace/agents/apply", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
}

// --- Admin approval queue --------------------------------------------------

export function usePendingAgentProfiles() {
  return useQuery({
    queryKey: queryKeys.marketplace.pendingApplications(),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentProfileOut[]>(
        "/marketplace/admin/pending"
      );
      return data;
    },
  });
}

export function useApproveAgentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      profile_id: string;
      tier?: AgentProfileTier;
      featured?: boolean;
    }) => {
      const { data } = await apiClient.post<AgentProfileOut>(
        `/marketplace/admin/${payload.profile_id}/approve`,
        { tier: payload.tier ?? "basic", featured: payload.featured ?? false }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
}

export function useRejectAgentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { profile_id: string; reason: string }) => {
      const { data } = await apiClient.post<AgentProfileOut>(
        `/marketplace/admin/${payload.profile_id}/reject`,
        { reason: payload.reason }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
}

export function useSetAgentProfileTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      profile_id: string;
      tier: AgentProfileTier;
    }) => {
      const { data } = await apiClient.post<AgentProfileOut>(
        `/marketplace/admin/${payload.profile_id}/set-tier`,
        { tier: payload.tier }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
}
