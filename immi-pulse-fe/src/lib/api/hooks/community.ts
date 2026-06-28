// React Query hooks for the Community feature.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import {
  getDeviceToken,
  setDeviceToken,
  type CommunityIdentity,
} from "@/lib/community-identity";

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

// --- Processing times & timelines -----------------------------------------

export type TimelineOutcome = "waiting" | "granted" | "refused";
export type Trend = "faster" | "slower" | "steady";
export type WaitTier = "on_track" | "normal" | "longer" | "outlier" | "unknown";

export interface VisaSubclassOut {
  slug: string;
  code: string;
  name: string;
  stream?: string | null;
  category_slug?: string | null;
}

export interface CommunityDurationStats {
  sample_size: number;
  pending: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  fastest: number | null;
  slowest: number | null;
}

export interface ProcessingStatOut {
  slug: string;
  code: string;
  name: string;
  stream?: string | null;
  category_slug?: string | null;
  official_p50_days: number | null;
  official_p90_days: number | null;
  official_updated: string | null;
  community: CommunityDurationStats;
  trend: Trend;
}

export type WaitBasis = "community" | "official" | "none";

export interface WaitCheckOut {
  subclass_slug: string;
  subclass_label: string;
  elapsed_days: number;
  tier: WaitTier;
  basis: WaitBasis;
  headline: string;
  detail: string;
  share_decided_within: number | null;
  sample_size: number;
  pending: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  fastest: number | null;
  slowest: number | null;
  official_p50_days: number | null;
  official_p90_days: number | null;
  official_updated: string | null;
}

export interface SubmitTimelinePayload {
  subclass_slug: string;
  lodged_on: string; // YYYY-MM-DD
  outcome: TimelineOutcome;
  decided_on?: string | null;
  country?: string;
  note?: string;
}

export interface TimelineOut {
  id: string;
  subclass_slug: string;
  lodged_on: string;
  decided_on?: string | null;
  outcome: TimelineOutcome;
  processing_days?: number | null;
  country?: string | null;
  note?: string | null;
  created_at: string;
}

// --- Queries ---------------------------------------------------------------

export function useCommunityStats() {
  return useQuery({
    queryKey: queryKeys.community.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<CommunityStatsOut>(
        "/community/public/stats"
      );
      return data;
    },
  });
}

export function useRecentThreads(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.community.recentThreads(),
    queryFn: async () => {
      const { data } = await apiClient.get<ThreadOut[]>(
        "/community/public/threads/recent",
        { params: { limit } }
      );
      return data;
    },
  });
}

export function useCommunitySpaces() {
  return useQuery({
    queryKey: queryKeys.community.spaces(),
    queryFn: async () => {
      const { data } = await apiClient.get<CommunitySpaceOut[]>(
        "/community/public/spaces"
      );
      return data;
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

export function useVisaSubclasses() {
  return useQuery({
    queryKey: queryKeys.community.subclasses(),
    queryFn: async () => {
      const { data } = await apiClient.get<VisaSubclassOut[]>(
        "/community/public/subclasses"
      );
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useProcessingStats() {
  return useQuery({
    queryKey: queryKeys.community.processing(),
    queryFn: async () => {
      const { data } = await apiClient.get<ProcessingStatOut[]>(
        "/community/public/processing"
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useWaitCheck(
  subclassSlug: string | undefined,
  lodgedOn: string | undefined
) {
  return useQuery({
    queryKey:
      subclassSlug && lodgedOn
        ? queryKeys.community.waitCheck(subclassSlug, lodgedOn)
        : ["community", "wait-check", "none"],
    enabled: !!subclassSlug && !!lodgedOn,
    queryFn: async () => {
      const { data } = await apiClient.get<WaitCheckOut>(
        "/community/public/wait-check",
        { params: { subclass: subclassSlug, lodged_on: lodgedOn } }
      );
      return data;
    },
  });
}

export function useSubmitTimeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitTimelinePayload) => {
      const { data } = await apiClient.post<TimelineOut>(
        "/community/timelines",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.processing() });
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
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

// --- Community feed v2: journeys, identity, votes, comments ----------------

export type PostType = "timeline" | "question";

export const MILESTONE_TYPES = [
  "Skills Assessment Lodged",
  "Skills Assessment Approved",
  "English Test Completed",
  "EOI Submitted",
  "Invitation Received",
  "Nomination Lodged",
  "Nomination Approved",
  "State Nomination",
  "Visa Lodged",
  "Medical Examination",
  "Police Checks",
  "S56 Request Received",
  "S56 Response Submitted",
  "Visa Granted",
  "Other",
] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export interface MilestoneOut {
  id: string;
  milestone_type: MilestoneType;
  occurred_on: string;
  ordinal: number;
  label?: string | null;
}

export interface JourneyOut {
  id: string;
  post_type: PostType;
  subclass_slug?: string | null;
  category_slug?: string | null;
  subclass_code?: string | null;
  subclass_name?: string | null;
  category_name?: string | null;
  stream?: string | null;
  occupation?: string | null;
  state?: string | null;
  area?: string | null;
  sponsor_type?: string | null;
  outcome: TimelineOutcome;
  title?: string | null;
  note?: string | null;
  handle: string;
  color: string;
  initials: string;
  upvotes: number;
  comment_count: number;
  is_sample: boolean;
  is_mine: boolean;
  viewer_voted: boolean;
  processing_days?: number | null;
  elapsed_days?: number | null;
  milestones: MilestoneOut[];
  created_at: string;
}

export interface JourneyReply {
  id: string;
  handle: string;
  color: string;
  initials: string;
  body: string;
  upvotes: number;
  is_op: boolean;
  viewer_voted: boolean;
  reply_to?: string | null;
  created_at: string;
}

export interface JourneyMessage {
  id: string;
  handle: string;
  color: string;
  initials: string;
  body: string;
  upvotes: number;
  is_op: boolean;
  viewer_voted: boolean;
  created_at: string;
  replies: JourneyReply[];
}

export interface JourneyDetailOut extends JourneyOut {
  messages: JourneyMessage[];
}

export interface FeedSummaryOut {
  all: number;
  questions: number;
  timelines: number;
  waiting: number;
  granted: number;
  by_category: Record<string, number>;
}

export interface VoteResultOut {
  target_type: "journey" | "comment";
  target_id: string;
  upvotes: number;
  voted: boolean;
}

export interface MilestonePayload {
  milestone_type: MilestoneType;
  occurred_on: string;
  label?: string;
}

export interface CreateJourneyPayload {
  post_type: PostType;
  subclass_slug?: string | null;
  category_slug?: string | null;
  stream?: string | null;
  occupation?: string | null;
  state?: string | null;
  area?: string | null;
  sponsor_type?: string | null;
  outcome?: TimelineOutcome;
  title?: string | null;
  note?: string | null;
  milestones?: MilestonePayload[];
}

export interface JourneyFeedParams {
  type?: PostType;
  category?: string;
  subclass?: string;
  status?: "waiting" | "granted";
  sort?: ThreadSort;
  limit?: number;
}

/** Raised when an anonymous device has used its one-timeline allowance. */
export class JourneyCapError extends Error {}

function extractDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

// Bootstrap (or return) the device's anonymous identity. Persists the device
// token so subsequent writes resolve to the same "temporary user".
export function useIdentity() {
  return useQuery({
    queryKey: queryKeys.community.identity(),
    queryFn: async () => {
      const { data } = await apiClient.post<CommunityIdentity>(
        "/community/public/identity"
      );
      setDeviceToken(data.device_token);
      return data;
    },
    staleTime: Infinity,
    retry: 1,
  });
}

export function useRerollIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<CommunityIdentity>(
        "/community/public/identity/reroll"
      );
      setDeviceToken(data.device_token);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.community.identity(), data);
    },
  });
}

export function useFeedSummary() {
  return useQuery({
    queryKey: queryKeys.community.feedSummary(),
    queryFn: async () => {
      const { data } = await apiClient.get<FeedSummaryOut>(
        "/community/public/feed-summary"
      );
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useJourneys(params: JourneyFeedParams = {}) {
  return useQuery({
    queryKey: queryKeys.community.journeys(params as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get<JourneyOut[]>(
        "/community/public/journeys",
        { params: { ...params, limit: params.limit ?? 40 } }
      );
      return data;
    },
  });
}

export function useJourney(journeyId: string | undefined) {
  return useQuery({
    queryKey: journeyId
      ? queryKeys.community.journey(journeyId)
      : ["community", "journey", "none"],
    enabled: !!journeyId,
    queryFn: async () => {
      const { data } = await apiClient.get<JourneyDetailOut>(
        `/community/public/journeys/${journeyId}`
      );
      return data;
    },
  });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateJourneyPayload) => {
      try {
        const { data } = await apiClient.post<JourneyDetailOut>(
          "/community/journeys",
          payload
        );
        return data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 409) {
          throw new JourneyCapError(
            extractDetail(err, "You've already shared a timeline. Sign in to add more.")
          );
        }
        throw new Error(extractDetail(err, "Something went wrong. Please try again."));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

export function useToggleJourneyVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (journeyId: string) => {
      const { data } = await apiClient.post<VoteResultOut>(
        `/community/journeys/${journeyId}/upvote`
      );
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.community.journey(data.target_id) });
      qc.invalidateQueries({ queryKey: queryKeys.community.journeys() });
    },
  });
}

export function useToggleCommentVote(journeyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await apiClient.post<VoteResultOut>(
        `/community/comments/${commentId}/upvote`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.journey(journeyId) });
    },
  });
}

export function usePostJourneyComment(journeyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { body: string; parent_comment_id?: string }) => {
      const { data } = await apiClient.post(
        `/community/journeys/${journeyId}/comments`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.journey(journeyId) });
      qc.invalidateQueries({ queryKey: queryKeys.community.journeys() });
    },
  });
}

// Re-export so components can import the identity type from the hooks barrel.
export type { CommunityIdentity };

export { getDeviceToken };
