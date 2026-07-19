// React Query hooks for the Community feature.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks/query-keys";
import {
  clearDeviceToken,
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

/**
 * One selectable visa: a subclass **+ stream** pair, as Home Affairs publishes
 * them. 43 programs across 76 rows.
 *
 * Group on `group_key`, never on `code`. Subclass 858 is two different programs
 * — legacy Global Talent and the current National Innovation visa — whose waits
 * differ by 3.5x, and both are streamless, so grouping on "858" would merge them
 * into one entry a member could not tell apart.
 */
export interface VisaSubclassOut {
  slug: string;
  code: string;
  name: string;
  /** Home Affairs' program discriminator: "189", "482-1", "858-3". Not a number. */
  group_key: string;
  stream?: string | null;
  category_slug?: string | null;
  /** 482/870 nomination + sponsorship: lodgement stages, never offered as streams. */
  is_stage?: boolean;
  /**
   * Does this visa have a nominated occupation?
   *
   * Drives whether the occupation picker renders at all. False means **hidden**,
   * not optional — a 600 Tourist or partner-visa applicant has no ANZSCO
   * occupation, and a field they have to guess at pools their timeline into a
   * cohort it does not belong to.
   */
  requires_occupation?: boolean;
  /** "2013" | "2022" | null — which ANZSCO edition this subclass reads. */
  anzsco_version?: string | null;
  /**
   * The rest of the adaptive-form contract, same rule as `requires_occupation`:
   * false means **do not ask**, not "optional".
   */
  requires_state_nomination?: boolean;
  /** Metro vs regional — only the regional visas (190, 491, 494). */
  requires_region?: boolean;
  /** Accredited sponsorship — only 482 and 186. */
  requires_sponsor_type?: boolean;
  /**
   * Are this programme's streams counted separately, or pooled? Lets the UI
   * explain a cohort instead of only presenting it.
   */
  cohort_split_by_stream?: boolean;
  official_p50_days?: number | null;
  official_p90_days?: number | null;
  official_updated?: string | null;
}

/**
 * One ANZSCO occupation from the Home Affairs skilled occupation list.
 *
 * `anzsco_code` is already resolved server-side for the subclass it was
 * requested with — Home Affairs runs ANZSCO 2022 for subclass 186/482 and
 * ANZSCO 2013 for every other skilled subclass. Never pick between
 * `anzsco_2013_code` and `anzsco_2022_code` here: 416 occupations carry both,
 * only 7 differ, so a client-side guess is right 98% of the time and silently
 * wrong forever on the rest.
 */
export interface OccupationOut {
  slug: string;
  name: string;
  anzsco_code?: string | null;
  anzsco_version?: string | null;
  anzsco_2013_code?: string | null;
  anzsco_2022_code?: string | null;
  /** First digit of the code — the picker groups on this. */
  major_group_code?: string | null;
  major_group_name?: string | null;
  /** MLTSSL / STSOL / ROL / CSOL. */
  lists: string[];
  eligible_subclasses: string[];
  assessing_authority?: string | null;
  authority_url?: string | null;
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
 * Ingested from the department's own processing-times feed, so `as_at` and
 * `counted_to` are their labels — and they differ: a figure published on
 * 26 June 2026 counts finalisations only to 31 May 2026. Render the date with
 * the number, every time.
 *
 * `is_live` means "this row came from the feed", not "this row has a date" —
 * a hand-seeded fixture can carry a date too.
 */
export interface OfficialFigures {
  p25_days: number | null;
  p50_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  as_at: string | null;
  /** Finalisations are counted only up to this date, which trails `as_at`. */
  counted_to: string | null;
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

/**
 * The skilled occupation list, filtered to one visa.
 *
 * Fetches the whole filtered set once (457 rows for subclass 186, 212 for 189)
 * and lets the picker filter it locally as the member types. The endpoint also
 * takes a `q`, but round-tripping every keystroke to Akamai-fronted data that
 * changes quarterly would be slower and no more correct.
 *
 * Disabled until a subclass is chosen: the unfiltered list is all 714, which is
 * exactly the flat catalogue this feature exists to replace.
 */
export function useOccupations(subclass?: string | null) {
  return useQuery({
    queryKey: queryKeys.community.occupations(subclass),
    queryFn: async () => {
      const { data } = await apiClient.get<OccupationOut[]>(
        "/community/public/occupations",
        { params: { subclass } }
      );
      return data;
    },
    enabled: !!subclass,
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
    mutationFn: async (
      arg: string | { journeyId: string; occupationSlug?: string | null }
    ) => {
      // Accepts a bare id for the callers that have nothing to add, or an
      // object when the draft still needs its occupation — a wait check is
      // saved from a subclass and a date alone, so a timeline on a visa that
      // nominates an occupation reaches this point uncoded.
      const journeyId = typeof arg === "string" ? arg : arg.journeyId;
      const occupationSlug = typeof arg === "string" ? null : arg.occupationSlug;
      const { data } = await apiClient.post<JourneyDetailOut>(
        `/community/public/journeys/${journeyId}/publish`,
        { consent_public: true, occupation_slug: occupationSlug ?? null }
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
  /** Display name, snapshotted at posting time. */
  occupation?: string | null;
  /** The 6-digit ANZSCO code — the cohort-matching key. */
  occupation_code?: string | null;
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
  /**
   * The occupation's slug from `useOccupations`. Required for every subclass
   * whose `requires_occupation` is true; the server resolves the display name
   * and the ANZSCO code from it. There is deliberately no free-text
   * `occupation` field any more — it made "Nurse", "nurse" and "RN" three
   * cohorts of one.
   */
  occupation_slug?: string | null;
  state?: string | null;
  area?: string | null;
  sponsor_type?: string | null;
  /** Where they were when they lodged — asked of everyone. */
  lodgement_location?: "onshore" | "offshore" | null;
  /**
   * Collected for cohort matching and **never rendered**. It is absent from
   * every read type on purpose — the server does not return it.
   */
  nationality?: string | null;
  lodged_via?: "self" | "agent" | null;
  /**
   * `true` asserts "no case officer contact". Send `null`, never `false`, when
   * the member did not say — the two are different claims.
   */
  direct_grant?: boolean | null;
  outcome?: TimelineOutcome;
  title?: string | null;
  note?: string | null;
  milestones?: MilestonePayload[];
  /**
   * Required, with no default, and the server rejects a payload without it.
   * Consent to publish is stated, never inferred: this used to default to true
   * server-side, so a caller that simply forgot the field published someone's
   * visa timeline to a public feed.
   */
  publish: boolean;
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

/**
 * A session, and nothing else.
 *
 * There is deliberately no `device_token` here any more. Every session issue
 * used to echo the account's token and every caller wrote it to localStorage,
 * which meant signing in *rebound the browser to the account* — two browsers
 * logging into one account collapsed onto a single identity, and a browser that
 * later signed out kept writing under the member's pseudonym. The browser's
 * anonymous identity is now its own concern (`useIdentity`).
 */
export interface CommunitySessionOut {
  token: string;
  expires_at: string;
  account: CommunityAccount;
}

export interface SignupPayload {
  password: string;
  /**
   * Required. Deliberately unverified — the member is signed in immediately and
   * there is no confirmation link. The client retypes it as a typo guard, which
   * is the only protection an unverified address gets.
   */
  email: string;
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
 * Turn this browser's identity into an account.
 *
 * Where the browser's identity is unclaimed the server *adopts* it, so the
 * handle and every post already made here carry straight over — which is why
 * the signup form never asks for a username. Where it already belongs to
 * somebody else a fresh account is minted beside it, so signing up on a shared
 * computer works instead of returning the 409 it used to.
 *
 * Either way the browser's device token is left alone: the account has released
 * its own, and the next `useIdentity` call re-bootstraps this browser as a
 * fresh anonymous visitor behind the session.
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
      // Deliberately does not touch the device token. Logging in says who you
      // are, not whose browser this is; overwriting it here is what used to
      // merge a second browser into the first one's identity.
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
      qc.setQueryData(queryKeys.community.account(), session.account);
      qc.invalidateQueries({ queryKey: queryKeys.community.all });
    },
  });
}

/**
 * Sign out, and become a stranger again.
 *
 * This has to be a round-trip, which is why it is the one auth action that
 * cannot be done client-side: the durable copy of the device token is an
 * HttpOnly cookie that no script can reach, so clearing localStorage alone left
 * the browser still resolving to the identity it just signed out of. On a
 * shared computer that meant the next person's anonymous post was filed under
 * the previous member's pseudonym.
 *
 * The server hands back a brand-new anonymous identity rather than nothing —
 * signing out drops the account, it does not stop you reading and writing.
 */
export function useCommunityLogout() {
  const qc = useQueryClient();
  return async () => {
    // Local copies go first, so a failed round-trip still ends with this
    // browser holding no session and no token of its own.
    clearCommunityToken();
    clearDeviceToken();
    try {
      const { data } = await apiClient.post<CommunityIdentity>(
        "/community/public/auth/logout"
      );
      setDeviceToken(data.device_token);
      qc.setQueryData(queryKeys.community.identity(), data);
    } catch {
      // The cookie is the server's to clear, so if the call failed we cannot
      // know who this browser now resolves to. Drop the cached identity so the
      // next render bootstraps a fresh one instead of trusting a stale answer.
      qc.removeQueries({ queryKey: queryKeys.community.identity() });
    }
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
