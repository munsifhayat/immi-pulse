import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { AgentMetadata } from "./board-data";

export type CommunityNode = Node<AgentMetadata>;

// ── Node Definitions ───────────────────────────────────────────────────────

export const communityNodes: CommunityNode[] = [
  // Visitor Enters Space
  {
    id: "cm-visitor-enters",
    type: "agentNode",
    position: { x: 340, y: 60 },
    data: {
      label: "Visitor Enters Space",
      type: "input",
      color: "sky",
      icon: "Users",
      badges: ["Public", "No Login"],
      description:
        "A visitor lands on a community space page — e.g. Skilled Migration, Partner Visas, Student Visas.",
      plainDescription:
        "The starting point of the community. Anyone — prospective visa applicants, current clients, curious browsers — can land on a space without signing up. Spaces are organised by visa type (Skilled Migration, Partner Visas, Student Visas, Employer Sponsored, Family/Parent, General) so conversations stay focused and easy to find.",
      howItWorks: [
        "A visitor opens the public /community page.",
        "They see a list of spaces — one per visa category — ranked by thread count so the liveliest ones are at the top.",
        "They click into a space to read its threads.",
        "From there they can read, upvote, comment, start their own thread, or report problematic content.",
        "No signup required at any step — the whole community is public-read and anonymous-write.",
      ],
      roles: [
        "Render the list of community spaces",
        "Let visitors enter any space without auth",
        "Surface thread counts and recent activity",
      ],
      inputs: ["A visitor navigates to /community or /community/{slug}"],
      outputs: [
        "The space landing page with a thread list",
        "Thread detail pages on click",
      ],
      whenRuns: "Any time a visitor opens a community page.",
      businessRules: [
        {
          rule: "Seeded spaces: Skilled Migration, Partner Visas, Student Visas, Employer Sponsored, Family/Parent, General",
          explanation:
            "Pre-created spaces keep the community focused on the specific immigration topics IMMI-PULSE supports. Admins can add new spaces later via an admin endpoint.",
        },
        {
          rule: "Spaces are ranked by thread_count",
          explanation:
            "The most active spaces surface first so visitors see living conversations rather than empty rooms.",
        },
      ],
      connectedTo: ["Post Thread", "Engagement"],
    },
  },

  // Post Thread (left)
  {
    id: "cm-post-thread",
    type: "agentNode",
    position: { x: 120, y: 220 },
    data: {
      label: "Post Thread Anonymously",
      type: "agent",
      color: "violet",
      icon: "MessageSquare",
      badges: ["Anonymous", "Public"],
      description:
        "A visitor creates a new thread inside a space. Can optionally supply a display name; otherwise stays anonymous.",
      plainDescription:
        "Where conversations start. A visitor writes a thread — title, body, the space it belongs to — and optionally picks a display name. If they don't, the thread is posted anonymously, which is the default. This lets people ask sensitive immigration questions (visa refusals, family situations, work issues) without having to expose their identity.",
      howItWorks: [
        "The visitor opens the new-thread form in their chosen space.",
        "They enter a title and a body. They can optionally set a display name; if left blank, the thread is marked anonymous.",
        "Before saving, the thread goes through the Rate Limit Shield — which checks the visitor's hashed IP against the per-day thread cap.",
        "If the cap isn't exceeded, a community_thread row is created with status = active.",
        "The space's thread_count is incremented and the thread is instantly visible in the space.",
      ],
      roles: [
        "Capture thread title, body, and display name",
        "Default to anonymous when no display name is given",
        "Hand off to the rate limiter before writing",
      ],
      inputs: [
        "Title, body, space slug",
        "Optional author_display_name",
        "Visitor IP (hashed for rate limiting)",
      ],
      outputs: [
        "New community_thread with status = active",
        "Incremented space.thread_count",
      ],
      whenRuns: "Whenever a visitor submits the new-thread form.",
      businessRules: [
        {
          rule: "Anonymity is the default",
          explanation:
            "If the visitor leaves display name blank, the post shows as anonymous. This is a deliberate design choice — anonymous posting lowers the barrier for people to share sensitive immigration situations.",
        },
        {
          rule: "No login required",
          explanation:
            "Threads never carry a user_id. Attribution is only via the optional display name and the hashed IP (for rate limiting only, never shown).",
        },
      ],
      connectedTo: ["Rate Limit Shield"],
    },
  },

  // Engagement (right)
  {
    id: "cm-engagement",
    type: "agentNode",
    position: { x: 560, y: 220 },
    data: {
      label: "Upvote & Comment",
      type: "agent",
      color: "blue",
      icon: "MessageSquare",
      badges: ["Nested Replies", "Upvotes"],
      description:
        "Other visitors read threads, upvote them, and reply with nested comments. Comments share the same anonymity and rate-limit rules as threads.",
      plainDescription:
        "Where the conversation unfolds. Readers upvote threads and comments they find helpful, and reply with their own comments — which can be nested under other comments to form threaded discussions. Every comment also goes through the rate limiter to stop spam bursts. The upvote and view counts feed back into how threads are ranked in the space.",
      howItWorks: [
        "A visitor reads a thread — the view_count is incremented on open.",
        "They can click upvote, which is a simple counter — no login, so upvotes are cheap but directionally useful.",
        "They can write a comment, optionally replying under an existing comment (nested via parent_comment_id).",
        "Each comment passes through the Rate Limit Shield with the 'comment' action cap.",
        "Comments are written to community_comments with status = active and the thread's reply_count is updated.",
      ],
      roles: [
        "Increment thread view_count on read",
        "Accept thread and comment upvotes",
        "Let visitors reply, including nested replies under other comments",
      ],
      inputs: [
        "Thread id + optional parent_comment_id",
        "Comment body",
        "Visitor IP (hashed for rate limiting)",
      ],
      outputs: [
        "New community_comment records",
        "Updated upvotes and view_count on the parent thread",
      ],
      whenRuns: "Real-time — on each read, upvote, or comment.",
      businessRules: [
        {
          rule: "Comments can be nested via parent_comment_id",
          explanation:
            "Replies under a top-level comment form threads, so a single question can have layered discussion without losing context.",
        },
        {
          rule: "Upvotes don't require an account",
          explanation:
            "Any visitor can upvote. The trade-off is that upvotes are directional hints, not reputation. Spam upvoting is bounded by the rate limiter.",
        },
      ],
      connectedTo: ["Rate Limit Shield", "Report Content"],
    },
  },

  // Rate Limit Shield (gates both post and comment)
  {
    id: "cm-rate-limit",
    type: "conflictResolver",
    position: { x: 340, y: 380 },
    data: {
      label: "Rate Limit Shield",
      type: "resolver",
      color: "orange",
      icon: "Shield",
      badges: ["IP-Hashed", "Per-Day Caps"],
      description:
        "In-memory rate limiter keyed on a SHA256 hash of the visitor IP. Enforces per-day caps for threads (10), comments (50), and reports (20).",
      plainDescription:
        "The spam shield. Every thread, comment, or report goes through here before it hits the database. The shield doesn't look at the content — just at how many of each action the same IP has done in the last 24 hours. If you're under the cap, your action goes through instantly. If you're over, you get a friendly 'try again tomorrow' message. This is deliberately simple on purpose — it's the lightest-weight anti-spam measure that still bounds abuse.",
      howItWorks: [
        "An incoming post, comment, or report request carries the visitor's IP.",
        "The IP is hashed with SHA256 and truncated to 32 chars, so the raw IP is never stored.",
        "The shield looks up the hash + action type in an in-memory counter.",
        "Timestamps older than 24 hours are evicted.",
        "If the remaining count is under the cap, the new action is recorded and allowed to proceed.",
        "If the count is at or over the cap, the shield raises CommunityRateLimitError and the request is rejected with a clear message.",
      ],
      roles: [
        "Hash visitor IPs to protect privacy",
        "Enforce per-day caps for threads, comments, and reports",
        "Reject over-quota requests before they touch the database",
        "Keep the community usable without heavy-weight moderation",
      ],
      inputs: [
        "Action type (thread | comment | report)",
        "Hashed visitor IP",
        "Current in-memory counter state",
      ],
      outputs: [
        "Allow (action proceeds) or block (error raised to caller)",
      ],
      conflictRules: [
        "Threads capped at 10 per IP hash per 24 hours",
        "Comments capped at 50 per IP hash per 24 hours",
        "Reports capped at 20 per IP hash per 24 hours",
      ],
      whenRuns:
        "Synchronously, before every thread, comment, or report write.",
      businessRules: [
        {
          rule: "Raw IPs are never stored — only SHA256 hashes",
          explanation:
            "Privacy by design: we track quota by hash, so the real IP never lives in our database or in-memory state.",
        },
        {
          rule: "Single-process in-memory counter today",
          explanation:
            "The current limiter lives in the backend process. When the backend runs in multiple workers or behind a load balancer, this graduates to Redis. Good enough for now, clear upgrade path.",
        },
        {
          rule: "Caps are per action, not shared",
          explanation:
            "Threads, comments, and reports each have their own counter. Someone who's hit the thread cap can still comment and report — they just can't start more threads until tomorrow.",
        },
      ],
      connectedTo: ["Report Content", "Database"],
    },
  },

  // Report Content
  {
    id: "cm-report-content",
    type: "agentNode",
    position: { x: 340, y: 540 },
    data: {
      label: "Report Content",
      type: "agent",
      color: "amber",
      icon: "Flag",
      badges: ["Spam", "Harassment", "Misleading"],
      description:
        "Visitors flag threads or comments for review. Creates a community_report with reason and optional description.",
      plainDescription:
        "The community's own line of defence. If a visitor sees something that shouldn't be there — spam, harassment, misleading immigration advice — they click report and pick a reason. No login needed. Reports are rate-limited like posts and comments to prevent report-bombing, and every one lands in the moderation queue for an admin to look at.",
      howItWorks: [
        "A visitor clicks report on a thread or a comment.",
        "They pick a reason: spam, harassment, misleading_advice, or other.",
        "They can optionally add a short description giving context.",
        "The report passes through the Rate Limit Shield with the 'report' action cap.",
        "If allowed, a community_report is written with status = open, target_type (thread | comment), and the target id.",
        "The report is now visible in the admin moderation queue.",
      ],
      roles: [
        "Capture reports of threads and comments",
        "Record the reason and optional description",
        "Tie the report to a specific thread or comment id",
      ],
      inputs: [
        "Target type (thread | comment)",
        "Target id",
        "Reason and optional description",
        "Visitor IP (hashed for rate limiting)",
      ],
      outputs: [
        "New community_report with status = open",
      ],
      actions: [
        "Report thread",
        "Report comment",
        "Add context description",
      ],
      whenRuns:
        "Whenever a visitor flags a thread or comment.",
      businessRules: [
        {
          rule: "Reasons: spam | harassment | misleading_advice | other",
          explanation:
            "A short, fixed set of reasons so admins can triage fast. Edge cases go into 'other' with a required description.",
        },
        {
          rule: "Reports are rate-limited just like posts",
          explanation:
            "Without a cap, bad actors could mass-report legitimate content to knock it down. The 20/day cap per IP hash keeps report floods out.",
        },
      ],
      connectedTo: ["Moderation Queue"],
    },
  },

  // Moderation Queue
  {
    id: "cm-moderation-queue",
    type: "agentNode",
    position: { x: 340, y: 700 },
    data: {
      label: "Moderation Queue",
      type: "resolver",
      color: "orange",
      icon: "Inbox",
      badges: ["Admin Only", "Open Reports"],
      description:
        "List of all community_reports with status = open, ordered by created_at.",
      plainDescription:
        "The admin's inbox for community moderation. Every open report lives here until an admin acts on it. The queue shows who or what was reported, why, when, and any context the reporter added. Admins work the queue to keep the community healthy without needing any AI moderation layer.",
      howItWorks: [
        "An admin opens /admin/reports in the console.",
        "They see every report with status = open, ordered oldest-first.",
        "Each row shows target_type, target_id, reason, description, created_at, and a preview of the reported content.",
        "The admin picks a report and decides how to act: hide, remove, or dismiss.",
        "On action, the report status flips to actioned or dismissed and it leaves the queue.",
      ],
      roles: [
        "Hold all open community_reports",
        "Order by created_at for FIFO triage",
        "Let admins open and act on individual reports",
      ],
      inputs: [
        "New community_report records from the Report Content step",
      ],
      outputs: [
        "A paginated queue view for the admin console",
      ],
      whenRuns: "Always — this is a persistent view, not a scheduled job.",
      businessRules: [
        {
          rule: "No auto-moderation today",
          explanation:
            "There's no AI pre-filtering or automated takedowns. Every report is seen by a human. This is an intentional starting point — auto-moderation can be layered on later once we see what reports actually look like in the wild.",
        },
        {
          rule: "Open reports never expire",
          explanation:
            "If a report sits unactioned, it stays in the queue indefinitely. Admins must clear it explicitly by hide, remove, or dismiss.",
        },
      ],
      connectedTo: ["Admin Action"],
    },
  },

  // Admin Action (hide | remove | dismiss)
  {
    id: "cm-admin-action",
    type: "agentNode",
    position: { x: 340, y: 860 },
    data: {
      label: "Admin Action",
      type: "agent",
      color: "violet",
      icon: "Gavel",
      badges: ["Hide", "Remove", "Dismiss"],
      description:
        "Admin resolves a report with one of three actions: hide (status = hidden, still visible to author), remove (status = removed, hidden from all), or dismiss (content unchanged, report closed).",
      plainDescription:
        "Where the admin actually makes the call. Three choices, each with a clear meaning. Hide is a soft action — the content is blurred for the public but the author can still see it, useful for borderline posts. Remove is a hard takedown — the content is gone from public view entirely. Dismiss means the report was unfounded — nothing happens to the content, the report is closed. Every action is logged with resolved_at, resolved_by, and an optional resolution note, so the audit trail is complete.",
      howItWorks: [
        "The admin opens a specific report from the Moderation Queue.",
        "They review the reported content (thread or comment) and the reason the reporter gave.",
        "They pick an action: hide, remove, or dismiss.",
        "On hide or remove, the target thread or comment's status is updated (hidden or removed).",
        "On dismiss, the target content is untouched.",
        "In all cases, the community_report row is stamped with status = actioned or dismissed, resolved_at, resolved_by, and an optional resolution_note.",
      ],
      roles: [
        "Resolve reports with a clear, recorded decision",
        "Update target thread/comment status when needed",
        "Record who resolved the report and when",
        "Keep an auditable moderation history",
      ],
      inputs: [
        "Report id",
        "Action choice (hide | remove | dismiss)",
        "Optional resolution note",
      ],
      outputs: [
        "Updated thread or comment status",
        "Closed community_report with resolution metadata",
      ],
      actions: [
        "Hide (soft — author can still see)",
        "Remove (hard — hidden from all)",
        "Dismiss (report unfounded)",
      ],
      whenRuns: "Whenever an admin acts on a pending report.",
      businessRules: [
        {
          rule: "Content statuses: active | hidden | removed",
          explanation:
            "A thread or comment is always in exactly one of these states. Hidden is soft (still visible to author), removed is hard (hidden from everyone).",
        },
        {
          rule: "Report statuses: open | actioned | dismissed",
          explanation:
            "Reports are open until the admin resolves them. Actioned means the admin took a takedown action. Dismissed means the report was unfounded.",
        },
        {
          rule: "Every resolution is attributed",
          explanation:
            "resolved_by stores the admin user id, resolved_at stores the timestamp, and resolution_note can capture their reasoning. Together these form a complete audit trail.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Pin Thread (parallel admin action)
  {
    id: "cm-pin-thread",
    type: "agentNode",
    position: { x: 620, y: 700 },
    data: {
      label: "Pin Thread",
      type: "scheduler",
      color: "teal",
      icon: "Pin",
      badges: ["Admin Only", "Space Elevation"],
      description:
        "Dedicated admin endpoint to toggle a thread's is_pinned flag, elevating it to the top of the space.",
      plainDescription:
        "A second admin tool — separate from moderation. Sometimes a thread is great and deserves to be pinned to the top of its space so new visitors see it first. Pinning is a single toggle: no AI, no review, just an admin decision. Great for FAQ threads, community guidelines, or important announcements about visa policy changes.",
      howItWorks: [
        "An admin opens a thread in the console.",
        "They click pin (or unpin if already pinned).",
        "The backend toggles the is_pinned flag on the community_thread record.",
        "The thread immediately floats to the top of its space, above all non-pinned threads.",
      ],
      roles: [
        "Let admins elevate helpful threads",
        "Toggle is_pinned on community_thread",
      ],
      inputs: ["Thread id", "Admin authentication"],
      outputs: ["Updated community_thread.is_pinned flag"],
      actions: ["Pin thread", "Unpin thread"],
      whenRuns: "Whenever an admin decides to pin or unpin a thread.",
      businessRules: [
        {
          rule: "Pinned threads always appear above non-pinned threads",
          explanation:
            "Regardless of sort order (new, top, trending), pinned threads render first within their space. This is how admins give permanent shelf space to the most useful content.",
        },
        {
          rule: "Pinning is cheap and reversible",
          explanation:
            "No approval workflow, no review cycle. An admin can pin something on a whim and unpin it the next day. That's the right level of friction for space curation.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Database
  {
    id: "cm-database",
    type: "database",
    position: { x: 340, y: 1020 },
    data: {
      label: "Database",
      type: "database",
      color: "emerald",
      icon: "Database",
      description:
        "PostgreSQL store for community spaces, threads, comments, and reports.",
      plainDescription:
        "The record of everything said and done in the community. Four tables — spaces, threads, comments, reports — cover the whole surface. Writes come from visitor posting actions (after passing the Rate Limit Shield) and admin moderation actions. Reads serve the public space and thread pages as well as the admin moderation queue.",
      howItWorks: [
        "New threads and comments are written after the Rate Limit Shield approves them.",
        "Reports are written when a visitor flags content.",
        "Admin actions update thread/comment status fields and close reports with resolution metadata.",
        "The public community pages read threads and comments where status = active.",
        "The admin moderation queue reads reports where status = open.",
      ],
      roles: [
        "Persist community spaces, threads, comments, and reports",
        "Serve public read traffic for space and thread pages",
        "Feed the admin moderation queue",
        "Maintain full history for audit",
      ],
      inputs: [
        "New threads, comments, reports",
        "Admin moderation actions and pin toggles",
      ],
      outputs: [
        "Query results for public pages and admin views",
      ],
      dbTables: [
        "community_spaces",
        "community_threads",
        "community_comments",
        "community_reports",
      ],
      whenRuns: "Always available — real-time reads and writes.",
      businessRules: [
        {
          rule: "Threads and comments never carry user_id",
          explanation:
            "Attribution is only by optional display name. This is a deliberate anonymity guarantee — even if a user later signs up for IMMI-PULSE, their anonymous community history cannot be linked back to them.",
        },
        {
          rule: "Status fields drive visibility, not deletion",
          explanation:
            "Content is never hard-deleted. Hidden and removed records stay in the database with their status set accordingly, so audit and recovery are always possible.",
        },
      ],
    },
  },
];

// ── Edge Definitions ───────────────────────────────────────────────────────

const MAIN_EDGE_STYLE = { stroke: "#8b5cf6", strokeWidth: 2 };
const BLOCKED_EDGE_STYLE = {
  stroke: "#f97316",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};
const ADMIN_EDGE_STYLE = {
  stroke: "#14b8a6",
  strokeWidth: 1,
  strokeDasharray: "3 3",
};
const DB_EDGE_STYLE = { stroke: "#10b981", strokeWidth: 1.5 };

export const communityEdges: Edge[] = [
  // Visitor → post and engagement (primary paths)
  {
    id: "cm-visitor-to-post",
    source: "cm-visitor-enters",
    target: "cm-post-thread",
    style: MAIN_EDGE_STYLE,
    animated: true,
    label: "new thread",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "cm-visitor-to-engagement",
    source: "cm-visitor-enters",
    target: "cm-engagement",
    style: MAIN_EDGE_STYLE,
    animated: true,
    label: "read / upvote",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },

  // Both post and engagement pass through rate limiter
  {
    id: "cm-post-to-rate",
    source: "cm-post-thread",
    target: "cm-rate-limit",
    style: MAIN_EDGE_STYLE,
    animated: true,
  },
  {
    id: "cm-engagement-to-rate",
    source: "cm-engagement",
    target: "cm-rate-limit",
    style: MAIN_EDGE_STYLE,
    animated: true,
  },

  // Rate limiter → DB (successful writes)
  {
    id: "cm-rate-to-db",
    source: "cm-rate-limit",
    target: "cm-database",
    style: DB_EDGE_STYLE,
    animated: false,
    label: "allowed writes",
    labelStyle: { fontSize: 10, fill: "#10b981" },
    labelBgStyle: { fill: "transparent" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },

  // Engagement → report (reader spots problem)
  {
    id: "cm-engagement-to-report",
    source: "cm-engagement",
    target: "cm-report-content",
    style: BLOCKED_EDGE_STYLE,
    animated: false,
    label: "flag content",
    labelStyle: { fontSize: 10, fill: "#f97316" },
    labelBgStyle: { fill: "transparent" },
  },

  // Report → rate-limit (reports are also rate-limited)
  {
    id: "cm-report-to-rate",
    source: "cm-report-content",
    target: "cm-rate-limit",
    style: BLOCKED_EDGE_STYLE,
    animated: false,
    label: "rate check",
    labelStyle: { fontSize: 10, fill: "#f97316" },
    labelBgStyle: { fill: "transparent" },
  },

  // Report → moderation queue
  {
    id: "cm-report-to-queue",
    source: "cm-report-content",
    target: "cm-moderation-queue",
    style: MAIN_EDGE_STYLE,
    animated: true,
  },

  // Moderation queue → admin action
  {
    id: "cm-queue-to-action",
    source: "cm-moderation-queue",
    target: "cm-admin-action",
    style: MAIN_EDGE_STYLE,
    animated: true,
  },

  // Admin action → DB
  {
    id: "cm-action-to-db",
    source: "cm-admin-action",
    target: "cm-database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },

  // Pin thread (parallel admin action)
  {
    id: "cm-queue-to-pin",
    source: "cm-moderation-queue",
    target: "cm-pin-thread",
    style: ADMIN_EDGE_STYLE,
    animated: false,
    label: "also: curate",
    labelStyle: { fontSize: 10, fill: "#14b8a6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "cm-pin-to-db",
    source: "cm-pin-thread",
    target: "cm-database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
];
