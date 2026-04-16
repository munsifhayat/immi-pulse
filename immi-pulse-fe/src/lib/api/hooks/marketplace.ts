// React Query hooks for the Agents Marketplace.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import { MOCK_AGENTS } from "@/lib/api/mock-data";

export type AgentProfileTier = "verified" | "recommended" | "highly_recommended";
export type AgentProfileStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";
export type ListingType = "individual" | "company";

export const TIER_LABELS: Record<AgentProfileTier, string> = {
  verified: "Verified",
  recommended: "Recommended",
  highly_recommended: "Highly Recommended",
};

export const TIER_ORDER: AgentProfileTier[] = [
  "verified",
  "recommended",
  "highly_recommended",
];

// Mirrors backend AgentProfileOut.
export interface AgentProfileOut {
  id: string;
  user_id: string;
  listing_type: ListingType;
  firm_name?: string | null;
  omara_number: string;
  bio?: string | null;
  website?: string | null;
  phone?: string | null;
  role?: string | null;
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
  listing_type?: ListingType;
  firm_name?: string;
  omara_number: string;
  bio?: string;
  website?: string;
  phone?: string;
  role?: string;
  city?: string;
  state?: string;
  specializations?: string[];
  languages?: string[];
  years_experience?: number;
  consultation_fee?: number;
  response_time_hours?: number;
}

export interface AdminAddAgentPayload {
  email: string;
  first_name: string;
  last_name: string;
  listing_type?: ListingType;
  firm_name?: string;
  omara_number: string;
  bio?: string;
  website?: string;
  phone?: string;
  role?: string;
  city?: string;
  state?: string;
  specializations?: string[];
  languages?: string[];
  years_experience?: number;
  consultation_fee?: number;
  response_time_hours?: number;
  tier?: AgentProfileTier;
  featured?: boolean;
}

// --- Public queries --------------------------------------------------------

export function useMarketplaceAgents(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.marketplace.agents(filters as Record<string, unknown>),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<AgentProfileOut[]>(
          "/marketplace/public/agents",
          { params: filters }
        );
        return data;
      } catch {
        // Filter mock agents client-side for demo
        let agents = [...MOCK_AGENTS];
        if (filters.city) agents = agents.filter((a) => a.city === filters.city);
        if (filters.language) agents = agents.filter((a) => a.languages?.includes(filters.language!));
        if (filters.tier) agents = agents.filter((a) => a.tier === filters.tier);
        if (filters.search) {
          const q = filters.search.toLowerCase();
          agents = agents.filter(
            (a) =>
              a.display_name?.toLowerCase().includes(q) ||
              a.firm_name?.toLowerCase().includes(q) ||
              a.bio?.toLowerCase().includes(q)
          );
        }
        return agents;
      }
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
      try {
        const { data } = await apiClient.get<AgentProfileOut>(
          `/marketplace/public/agents/${profileId}`
        );
        return data;
      } catch {
        const agent = MOCK_AGENTS.find((a) => a.id === profileId);
        if (!agent) throw new Error("Agent not found");
        return agent;
      }
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
        { tier: payload.tier ?? "verified", featured: payload.featured ?? false }
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

export function useAdminAddAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdminAddAgentPayload) => {
      const { data } = await apiClient.post<AgentProfileOut>(
        "/marketplace/admin/add",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
}
