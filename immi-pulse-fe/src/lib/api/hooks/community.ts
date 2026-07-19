// React Query hooks for the Community feature.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import {
  getDeviceToken,
  setDeviceToken,
  type CommunityIdentity,
} from "@/lib/community-identity";
import {
  clearCommunityToken,
  getCommunityToken,
  setCommunityToken,
} from "@/lib/community/session";

export type ContentStatus = "active" | "hidden" | "removed";
// The live feed's two reportable surfaces. Legacy forum threads/comments are
// gone (removed with the old spaces system).
export type ReportTargetType = "journey" | "journey_comment";
export type ReportReason =
  | "spam"
  | "harassment"
  | "misleading_advice"
  | "other";
export type ReportStatus = "open" | "actioned" | "dismissed";
export type ThreadSort = "new" | "top" | "trending";

// --- DTOs matching backend schemas ----------------------------------------

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
  // Populated on the admin queue so a moderator sees what was reported.
  target_preview?: string | null;
  target_status?: ContentStatus | null;
  target_handle?: string | null;
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

/**
 * What a community figure is made of.
 *
 * Ships with every community number and must be rendered beside it. Timelines
 * collected from public forums count toward the published statistics on exactly
 * one condition — that the split is always visible — so this is not optional
 * metadata to drop when space is tight. A bare community number is a bug.
 */
export interface Provenance {
  member_reported: number;
  forum_collected: number;
  total: number;
}

export interface CommunityDurationStats {
  sample_size: number;
  pending: number;
  /** False → the percentiles are too thin to present as an answer. */
  sufficient: boolean;
  min_sample: number;
  window_months: number;
  provenance: Provenance;
  provenance_note: string | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  fastest: number | null;
  slowest: number | null;
}

/**
 * The Department of Home Affairs published bands.
 *
 * `as_at` is hand-seeded and `is_live` is always false — nothing ingests these
 * figures on a schedule, so no surface may imply they are checked daily. Render
 * the date with the number, every time.
 */
export interface OfficialFigures {
  p50_days: number | null;
  p90_days: number | null;
  as_at: string | null;
  source: string;
  is_live: boolean;
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
  /** Render `official` and `community` together — never one without the other. */
  official: OfficialFigures;
  community: CommunityDurationStats;
  /** Superseded name of `community`. Still emitted; do not read it. */
  room?: CommunityDurationStats;
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
  sufficient: boolean;
  min_sample: number;
  window_months: number;
  provenance: Provenance;
  provenance_note: string | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  fastest: number | null;
  slowest: number | null;
  official_p50_days: number | null;
  official_p90_days: number | null;
  official_updated: string | null;
  official: OfficialFigures;
  community: CommunityDurationStats;
  /** Superseded name of `community`. Still emitted; do not read it. */
  room?: CommunityDurationStats;
}

export interface SaveWaitCheckPayload {
  subclass_slug: string;
  lodged_on: string; // YYYY-MM-DD
  note?: string;
  milestones?: MilestonePayload[];
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

/**
 * Keep a wait check as your own timeline — privately.
 *
 * Creates an unpublished journey. It is absent from the feed and from every
 * public statistic until `usePublishJourney` is called with explicit consent.
 * Deliberately does NOT invalidate the processing/stats queries: nothing public
 * changed, and refetching them here would suggest otherwise.
 */
export function useSaveWaitCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveWaitCheckPayload) => {
      const { data } = await apiClient.post<JourneyDetailOut>(
        "/community/public/wait-check/save",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.identity() });
    },
  });
}

/**
 * Share a saved timeline with the community.
 *
 * The second consent, and a separate call on purpose — saving privately and
 * publishing publicly are different decisions. The backend rejects this without
 * `consent_public: true`, so the flag is sent from the one place a member has
 * actually agreed.
 */
export function usePublishJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (journeyId: string) => {
      const { data } = await apiClient.post<JourneyDetailOut>(
        `/community/public/journeys/${journeyId}/publish`,
        { consent_public: true }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.processing() });
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

/** Add later steps — medical, s56, the grant — to a timeline you own. */
export function useAddMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      journey_id: string;
      milestones: MilestonePayload[];
      outcome?: TimelineOutcome;
    }) => {
      const { data } = await apiClient.post<JourneyDetailOut>(
        `/community/public/journeys/${payload.journey_id}/milestones`,
        { milestones: payload.milestones, outcome: payload.outcome }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.processing() });
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
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

// Report a live-feed post (journey) or one of its comments. A journey report
// hits /journeys/{id}/report; a comment report hits /comments/{id}/report —
// both let a moderator's Hide/Remove actually act on the row.
export function useReportContent() {
  return useMutation({
    mutationFn: async (payload: {
      target_type: ReportTargetType;
      target_id: string;
      reason: ReportReason;
      description?: string;
    }) => {
      const path =
        payload.target_type === "journey"
          ? `/community/journeys/${payload.target_id}/report`
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
  /** False = a private draft. Only its owner ever receives one. */
  is_published: boolean;
  /**
   * True while an automatic check has parked this post for review. Only ever
   * arrives on the author's own rows — every other reader's feed filters held
   * content out server-side — so it exists purely so their own view can say
   * honestly that it is waiting rather than pretending it is live.
   */
  is_held?: boolean;
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

// --- The community's pseudonymous account: signup, login, inbox, profile ---------

/**
 * The member's own view of their account.
 *
 * `has_email` rather than the address: the backend serializer never carries the
 * value, which is a stronger guarantee than remembering to strip it. Nothing
 * here is ever shown to another member or to a consultant.
 */
export interface CommunityAccount {
  handle: string;
  color: string;
  has_email: boolean;
  email_verified: boolean;
  /** False when no email was given — losing the password loses the account. */
  can_recover: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface CommunitySessionOut {
  token: string;
  expires_at: string;
  account: CommunityAccount;
  device_token?: string | null;
}

export interface SignupPayload {
  password: string;
  email?: string;
  /** Required when no email is given. The "this cannot be recovered" tick. */
  accepted_no_recovery?: boolean;
}

export type NotificationType = "reply_to_post" | "reply_to_comment";

export interface NotificationOut {
  id: string;
  type: NotificationType;
  journey_id: string;
  comment_id?: string | null;
  actor_handle: string;
  actor_color: string;
  actor_initials: string;
  preview: string;
  context_title?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface InboxOut {
  items: NotificationOut[];
  unread_count: number;
}

export interface MyCommentOut {
  id: string;
  journey_id: string;
  journey_title?: string | null;
  body: string;
  upvotes: number;
  created_at: string;
}

export interface AllowanceAction {
  remaining: number;
  limited_by: "ip" | "account";
}

export interface AllowanceOut {
  tier: number;
  tier_name: string;
  actions: Record<string, AllowanceAction>;
}

function accountError(err: unknown, fallback: string): Error {
  return new Error(extractDetail(err, fallback));
}

/**
 * The signed-in member, or null.
 *
 * Returns null rather than throwing when there is no token, so every surface
 * can treat "signed out" as data instead of as an error state. A stale or
 * expired token is cleared here — the alternative is a member stuck looking at
 * a broken inbox with no way to understand why.
 */
export function useCommunityAccount() {
  return useQuery({
    queryKey: queryKeys.community.account(),
    queryFn: async (): Promise<CommunityAccount | null> => {
      if (!getCommunityToken()) return null;
      try {
        const { data } = await apiClient.get<CommunityAccount>(
          "/community/public/auth/me"
        );
        return data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) {
          clearCommunityToken();
          return null;
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Claim this device's existing identity as an account.
 *
 * Claiming, not creating: the handle and every post already made on this device
 * carry straight over, which is why the signup form never asks for a username.
 */
export function useCommunitySignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      try {
        const { data } = await apiClient.post<CommunitySessionOut>(
          "/community/public/auth/signup",
          payload
        );
        return data;
      } catch (err) {
        throw accountError(err, "We couldn't create that account.");
      }
    },
    onSuccess: (session) => {
      setCommunityToken(session.token);
      setDeviceToken(session.device_token);
      qc.setQueryData(queryKeys.community.account(), session.account);
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

export function useCommunityLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { handle: string; password: string }) => {
      try {
        const { data } = await apiClient.post<CommunitySessionOut>(
          "/community/public/auth/login",
          payload
        );
        return data;
      } catch (err) {
        throw accountError(err, "That handle and password don't match.");
      }
    },
    onSuccess: (session) => {
      setCommunityToken(session.token);
      setDeviceToken(session.device_token);
      qc.setQueryData(queryKeys.community.account(), session.account);
      // Ownership cues (is_mine, viewer_voted) and the inbox all change the
      // moment the viewer does, so everything community-scoped is now stale.
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

/**
 * Ask for a recovery link.
 *
 * The backend answers identically whether or not the address is known, so this
 * hook must not try to be more helpful than that. Reporting "no account with
 * that email" would turn the endpoint into an oracle for which addresses belong
 * to members of an immigration forum, which for this audience is a real safety
 * problem rather than a theoretical one.
 */
export function useCommunityRecover() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await apiClient.post<{ detail: string }>(
        "/community/public/auth/recover",
        payload
      );
      return data;
    },
  });
}

/**
 * Consume a recovery token and set a new password.
 *
 * Succeeds straight into a session — the member came here because they were
 * locked out, so making them type the password again on a login screen would
 * be one more chance to lose the account.
 */
export function useCommunityResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      try {
        const { data } = await apiClient.post<CommunitySessionOut>(
          "/community/public/auth/reset",
          payload
        );
        return data;
      } catch (err) {
        throw accountError(err, "That recovery link didn't work.");
      }
    },
    onSuccess: (session) => {
      setCommunityToken(session.token);
      setDeviceToken(session.device_token);
      qc.setQueryData(queryKeys.community.account(), session.account);
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

/**
 * Sign out of the community.
 *
 * Clears the session but deliberately leaves the device token alone: the
 * browser is still the same browser, and wiping it would strand any drafts
 * held against it.
 */
export function useCommunityLogout() {
  const qc = useQueryClient();
  return () => {
    clearCommunityToken();
    qc.setQueryData(queryKeys.community.account(), null);
    qc.invalidateQueries({ queryKey: queryKeys.community.all });
  };
}

/** Replies to your posts and comments, plus the unread badge count. */
export function useInbox(enabled = true) {
  return useQuery({
    queryKey: queryKeys.community.inbox(),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<InboxOut>("/community/me/inbox");
      return data;
    },
    // The badge is the whole reason someone comes back. Keep it warm.
    refetchInterval: 1000 * 60,
    retry: false,
  });
}

export function useMarkInboxRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const { data } = await apiClient.post<{
        marked: number;
        unread_count: number;
      }>("/community/me/inbox/read", { ids: ids ?? null });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.community.inbox() });
    },
  });
}

/**
 * The Posts tab of "You".
 *
 * Includes unpublished drafts on purpose — this is the member's own profile and
 * the only place a saved wait check can be published from. Do not copy this
 * hook as the template for a public listing.
 */
export function useMyPosts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.community.myPosts(),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<JourneyOut[]>("/community/me/posts");
      return data;
    },
    retry: false,
  });
}

/** The Comments tab of "You". */
export function useMyComments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.community.myComments(),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<MyCommentOut[]>(
        "/community/me/comments"
      );
      return data;
    },
    retry: false,
  });
}

/**
 * What is left to write today. Reading it spends nothing.
 *
 * The composer uses this to say "you've written a lot today" up front instead
 * of throwing a 429 once the member has finished typing.
 */
export function useAllowance(enabled = true) {
  return useQuery({
    queryKey: queryKeys.community.allowance(),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<AllowanceOut>(
        "/community/me/allowance"
      );
      return data;
    },
    staleTime: 1000 * 30,
    retry: false,
  });
}

// Re-export so components can import the identity type from the hooks barrel.
export type { CommunityIdentity };

export { getDeviceToken };
