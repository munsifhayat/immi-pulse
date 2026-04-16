// React Query hooks for the Community feature.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import {
  MOCK_COMMUNITY_SPACES,
  MOCK_COMMUNITY_STATS,
  MOCK_RECENT_THREADS,
} from "@/lib/api/mock-data";

export type ThreadStatus = "active" | "hidden" | "removed";
export type ReportTargetType = "thread" | "comment";
export type ReportReason =
  | "spam"
  | "harassment"
  | "misleading_advice"
  | "other";
export type ReportStatus = "open" | "actioned" | "dismissed";
export type ThreadSort = "new" | "top" | "trending";

// --- DTOs matching backend schemas ----------------------------------------

export interface CommunitySpaceOut {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  member_count: number;
  thread_count: number;
  created_at: string;
}

export interface ThreadOut {
  id: string;
  space_id: string;
  space_slug?: string | null;
  space_name?: string | null;
  author_display_name?: string | null;
  is_anonymous: boolean;
  title: string;
  body: string;
  upvotes: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  status: ThreadStatus;
  created_at: string;
  updated_at: string;
}

export interface CommentOut {
  id: string;
  thread_id: string;
  parent_comment_id?: string | null;
  author_display_name?: string | null;
  is_anonymous: boolean;
  body: string;
  upvotes: number;
  status: ThreadStatus;
  created_at: string;
}

export interface ThreadWithCommentsOut extends ThreadOut {
  comments: CommentOut[];
}

export interface ReportOut {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

export interface CreateThreadPayload {
  space_slug: string;
  title: string;
  body: string;
  is_anonymous: boolean;
  author_display_name?: string;
}

export interface CommunityStatsOut {
  total_spaces: number;
  total_threads: number;
  total_comments: number;
}

export interface CreateCommentPayload {
  body: string;
  parent_comment_id?: string;
  is_anonymous: boolean;
  author_display_name?: string;
}

// --- Queries ---------------------------------------------------------------

export function useCommunityStats() {
  return useQuery({
    queryKey: queryKeys.community.stats(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<CommunityStatsOut>(
          "/community/public/stats"
        );
        return data;
      } catch {
        return MOCK_COMMUNITY_STATS;
      }
    },
  });
}

export function useRecentThreads(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.community.recentThreads(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ThreadOut[]>(
          "/community/public/threads/recent",
          { params: { limit } }
        );
        return data;
      } catch {
        return MOCK_RECENT_THREADS.slice(0, limit);
      }
    },
  });
}

export function useCommunitySpaces() {
  return useQuery({
    queryKey: queryKeys.community.spaces(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<CommunitySpaceOut[]>(
          "/community/public/spaces"
        );
        return data;
      } catch {
        return MOCK_COMMUNITY_SPACES;
      }
    },
  });
}

export function useCommunitySpace(slug: string | undefined) {
  return useQuery({
    queryKey: slug ? queryKeys.community.space(slug) : ["community", "space", "none"],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await apiClient.get<CommunitySpaceOut>(
        `/community/public/spaces/${slug}`
      );
      return data;
    },
  });
}

export function useSpaceThreads(slug: string | undefined, sort: ThreadSort = "new") {
  return useQuery({
    queryKey: slug
      ? queryKeys.community.threads(slug, sort)
      : ["community", "threads", "none"],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await apiClient.get<ThreadOut[]>(
        `/community/public/spaces/${slug}/threads`,
        { params: { sort } }
      );
      return data;
    },
  });
}

export function useCommunityThread(threadId: string | undefined) {
  return useQuery({
    queryKey: threadId
      ? queryKeys.community.thread(threadId)
      : ["community", "thread", "none"],
    enabled: !!threadId,
    queryFn: async () => {
      const { data } = await apiClient.get<ThreadWithCommentsOut>(
        `/community/public/threads/${threadId}`
      );
      return data;
    },
  });
}

export function useCommunityReports() {
  return useQuery({
    queryKey: queryKeys.community.reports(),
    queryFn: async () => {
      const { data } = await apiClient.get<ReportOut[]>(
        "/community/admin/reports"
      );
      return data;
    },
  });
}

// --- Mutations -------------------------------------------------------------

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateThreadPayload) => {
      const { data } = await apiClient.post<ThreadOut>(
        "/community/threads",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

export function useUpvoteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { data } = await apiClient.post<ThreadOut>(
        `/community/threads/${threadId}/upvote`
      );
      return data;
    },
    onSuccess: (_, threadId) => {
      qc.invalidateQueries({ queryKey: queryKeys.community.thread(threadId) });
    },
  });
}

export function useCreateComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      const { data } = await apiClient.post<CommentOut>(
        `/community/threads/${threadId}/comments`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.thread(threadId) });
    },
  });
}

export function useUpvoteComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await apiClient.post<CommentOut>(
        `/community/comments/${commentId}/upvote`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.thread(threadId) });
    },
  });
}

export function useReportTarget() {
  return useMutation({
    mutationFn: async (payload: {
      target_type: ReportTargetType;
      target_id: string;
      reason: ReportReason;
      description?: string;
    }) => {
      const path =
        payload.target_type === "thread"
          ? `/community/threads/${payload.target_id}/report`
          : `/community/comments/${payload.target_id}/report`;
      const { data } = await apiClient.post<ReportOut>(path, {
        reason: payload.reason,
        description: payload.description,
      });
      return data;
    },
  });
}

export function useActOnReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      report_id: string;
      action: "hide" | "remove" | "dismiss";
      note?: string;
    }) => {
      const { data } = await apiClient.post<ReportOut>(
        `/community/admin/reports/${payload.report_id}/action`,
        { action: payload.action, note: payload.note }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.reports() });
    },
  });
}
