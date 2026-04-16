import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { AgentMetadata } from "./board-data";

export type MarketplaceNode = Node<AgentMetadata>;

// ── Node Definitions ───────────────────────────────────────────────────────

export const marketplaceNodes: MarketplaceNode[] = [
  // Agent Applies (public form entry)
  {
    id: "mp-agent-applies",
    type: "agentNode",
    position: { x: 340, y: 60 },
    data: {
      label: "Agent Applies",
      type: "input",
      color: "sky",
      icon: "UserPlus",
      badges: ["Public Form", "OMARA"],
      description:
        "Public application form where OMARA-registered immigration consultants submit their profile for marketplace listing.",
      plainDescription:
        "The front door for immigration consultants who want to be listed on the IMMI-PULSE marketplace. Agents fill out a public form with their OMARA number, firm details, specialisations, languages, experience, fees, and bio — no account required upfront, which keeps the barrier low and the top of the funnel wide.",
      howItWorks: [
        "A consultant visits the public /find-consultants/apply page and fills out the application form.",
        "They provide their OMARA registration number, firm name, city, state, specialisations (e.g. skilled visas, partner visas), languages spoken, years of experience, consultation fee, typical response time, and a short bio.",
        "On submission, the backend creates a new user account (if one doesn't already exist) and attaches a fresh agent_profile linked to that user.",
        "The profile's status is set to pending_review and dropped into the admin queue.",
        "The consultant receives a confirmation that their application is being reviewed.",
      ],
      roles: [
        "Collect OMARA registration and verification details",
        "Capture specialisations, languages, and experience",
        "Create the user + agent profile records",
        "Enter the profile into the pending_review queue",
      ],
      inputs: [
        "Consultant name, email, OMARA number",
        "Firm name, city, state",
        "Specialisations, languages, years of experience",
        "Consultation fee, response-time commitment, bio",
      ],
      outputs: [
        "New user record (if first-time)",
        "New agent_profile in status = pending_review",
      ],
      whenRuns:
        "On demand — any time a consultant submits the public application form.",
      businessRules: [
        {
          rule: "OMARA number is required and must be unique",
          explanation:
            "Every approved consultant must be a registered migration agent. The OMARA number is stored and indexed so duplicates are caught at submission time.",
        },
        {
          rule: "No upfront login — applications are public",
          explanation:
            "Consultants don't need an IMMI-PULSE account to apply. The system creates the user record on submission. This removes friction for prospects who are still evaluating the platform.",
        },
        {
          rule: "All new submissions land in pending_review",
          explanation:
            "No profile ever goes live directly. Every application is manually reviewed by an IMMI-PULSE admin before it becomes visible to applicants.",
        },
      ],
      connectedTo: ["Application Queue"],
    },
  },

  // Applicant Search (visa seeker side)
  {
    id: "mp-applicant-search",
    type: "agentNode",
    position: { x: 700, y: 60 },
    data: {
      label: "Applicant Searches",
      type: "input",
      color: "sky",
      icon: "Search",
      badges: ["Public Directory", "Filters"],
      description:
        "Public-facing search on the /find-consultants directory with filters by city, state, visa type, language, and tier.",
      plainDescription:
        "The other side of the marketplace — where visa applicants come looking for help. They filter consultants by location, visa type, language, and sort by rating, experience, or response time. The search queries the live directory of approved consultants.",
      howItWorks: [
        "A visa applicant visits the public /find-consultants page.",
        "They pick filters: city, state, visa type they need help with, language they speak.",
        "They choose how to sort the results — by rating, by years of experience, or by fastest response time.",
        "The backend returns only approved profiles that match, ranked by the Ranking Engine rules.",
        "Applicants can click into any profile to see full details and contact the consultant.",
      ],
      roles: [
        "Let applicants filter the consultant directory",
        "Accept sort preferences (rating, experience, response time)",
        "Return only approved profiles",
        "Feed queries into the Profile Directory",
      ],
      inputs: [
        "Filter: city, state, visa_type, language, tier",
        "Sort key: rating | experience | response_time",
      ],
      outputs: [
        "A ranked list of matching approved consultants",
        "Profile detail pages when an applicant clicks through",
      ],
      whenRuns: "Any time an applicant opens or filters the public directory.",
      businessRules: [
        {
          rule: "Only approved profiles are searchable",
          explanation:
            "Pending, rejected, and suspended profiles are never shown in search results. Applicants only see consultants who have been vetted by admin.",
        },
        {
          rule: "Search is public — no account required",
          explanation:
            "Applicants can browse the directory without signing up, reducing friction and helping them find help quickly.",
        },
      ],
      connectedTo: ["Profile Directory"],
    },
  },

  // Application Queue
  {
    id: "mp-application-queue",
    type: "agentNode",
    position: { x: 340, y: 220 },
    data: {
      label: "Application Queue",
      type: "resolver",
      color: "amber",
      icon: "Inbox",
      badges: ["Pending Review", "FIFO"],
      description:
        "The pending_review queue of agent_profiles awaiting admin moderation.",
      plainDescription:
        "A waiting room for new consultant applications. Every submission — whether a brand-new application or a re-submission from an existing consultant who edited their profile — lands here and waits for a human admin to review it.",
      howItWorks: [
        "New profiles enter this queue with status = pending_review.",
        "Existing approved profiles re-enter the queue if the consultant changes material fields like OMARA number, firm name, bio, specialisations, or years of experience.",
        "The queue is ordered first-in-first-out by submitted_at, so nobody waits longer than they need to.",
        "An admin opens the /marketplace/admin/pending view to see everything awaiting review.",
        "Once an admin takes action (approve or reject), the profile leaves the queue.",
      ],
      roles: [
        "Hold applications awaiting admin review",
        "Maintain FIFO order by submitted_at",
        "Accept both new applications and re-submissions",
      ],
      inputs: [
        "New agent_profile records from the public application form",
        "Existing profiles reset to pending_review after a material edit",
      ],
      outputs: [
        "A chronological list of profiles for the admin review view",
      ],
      whenRuns: "Always — this is a persistent queue view on the admin panel.",
      businessRules: [
        {
          rule: "No profile in pending_review is ever shown publicly",
          explanation:
            "Applicants only ever see consultants that have explicitly cleared review. Anything in the queue is invisible to the public directory.",
        },
        {
          rule: "Material edits re-enter the queue",
          explanation:
            "If an approved consultant changes OMARA, firm, bio, specialisations, or years of experience, the profile is reset to pending_review. Cosmetic changes (e.g. response_time_hours) don't trigger re-review.",
        },
      ],
      connectedTo: ["Admin Reviews"],
    },
  },

  // Admin Reviews
  {
    id: "mp-admin-reviews",
    type: "agentNode",
    position: { x: 340, y: 380 },
    data: {
      label: "Admin Reviews",
      type: "agent",
      color: "violet",
      icon: "ShieldCheck",
      badges: ["Human in the Loop", "OMARA Check"],
      description:
        "An IMMI-PULSE admin opens the pending queue and evaluates each profile for authenticity, completeness, and fit.",
      plainDescription:
        "The quality gate. A real human admin at IMMI-PULSE opens each pending application and checks: is this a genuine OMARA-registered agent? Are the specialisations credible? Is the bio professional? Does the firm actually exist? This is how we keep the marketplace trustworthy — applicants see only vetted consultants.",
      howItWorks: [
        "The admin opens /marketplace/admin/pending to see all waiting profiles.",
        "For each profile, they review all submitted fields: OMARA number, firm name, bio, specialisations, languages, experience, fees.",
        "They verify the OMARA registration against the public OMARA register.",
        "They make a decision: approve with a tier, approve as featured, or reject with a reason.",
        "Rejections are recorded with a reason and the profile leaves the pending queue but can be re-submitted later.",
      ],
      roles: [
        "Manually verify OMARA registration",
        "Assess profile completeness and credibility",
        "Decide tier assignment (Verified / Recommended / Highly Recommended)",
        "Decide whether to mark as featured",
        "Write rejection reasons when declining",
      ],
      inputs: [
        "A profile from the pending queue with all submitted fields",
        "The OMARA public register for verification",
      ],
      outputs: [
        "An approval decision with tier + featured flag",
        "OR a rejection with a stored reason",
      ],
      whenRuns:
        "As often as the admin chooses to clear the queue — typically daily.",
      businessRules: [
        {
          rule: "Every approval is attributed to a specific admin",
          explanation:
            "The approving admin's user id is stored on the profile (approved_by) along with approved_at timestamp, for accountability and audit.",
        },
        {
          rule: "Rejections must include a reason",
          explanation:
            "If an admin rejects a profile, they write a reason that's stored on the record. The consultant can be shown this reason when they re-apply.",
        },
        {
          rule: "No AI classification here — pure human judgement",
          explanation:
            "Unlike the InPulse pipeline, marketplace approval is fully manual. Trust and reputation are too important to hand to an AI at this stage.",
        },
      ],
      connectedTo: ["Approve & Assign Tier", "Application Queue (on reject)"],
    },
  },

  // Approve & Assign Tier
  {
    id: "mp-approve-tier",
    type: "agentNode",
    position: { x: 340, y: 540 },
    data: {
      label: "Approve & Assign Tier",
      type: "agent",
      color: "emerald",
      icon: "BadgeCheck",
      badges: ["Verified / Recommended / Highly Recommended", "Featured Flag"],
      description:
        "The approve action — sets status to approved, records the admin, assigns tier (Verified | Recommended | Highly Recommended), and optionally flips the featured flag.",
      plainDescription:
        "The moment a consultant goes live. When the admin clicks approve, the profile flips from pending_review to approved, the tier is stamped on (Verified, Recommended, or Highly Recommended), and the featured flag is optionally set. From this moment the profile is visible in the public directory.",
      howItWorks: [
        "The admin selects a tier for the profile: Verified (standard listing), Recommended (priority placement), or Highly Recommended (top-of-directory placement).",
        "The admin optionally flips the featured flag to give the profile extra visibility within its tier.",
        "The backend sets status = approved, writes approved_at = now(), and records approved_by = the admin's user id.",
        "The profile immediately becomes visible in the public directory.",
        "The consultant can be notified that their application has been approved.",
      ],
      roles: [
        "Flip profile status to approved",
        "Stamp tier (Verified | Recommended | Highly Recommended)",
        "Stamp featured flag",
        "Record approved_at and approved_by for audit",
      ],
      inputs: [
        "Profile id",
        "Tier choice (Verified | Recommended | Highly Recommended)",
        "Featured flag (boolean)",
      ],
      outputs: [
        "Updated agent_profile with status = approved",
        "Profile is now queryable by the public directory",
      ],
      actions: [
        "Set tier to Verified",
        "Upgrade tier to Recommended or Highly Recommended",
        "Toggle featured flag",
        "Re-tier an already approved profile later",
      ],
      whenRuns: "Whenever an admin approves a pending profile.",
      businessRules: [
        {
          rule: "Tier can be changed later without re-review",
          explanation:
            "Admin has a dedicated set-tier endpoint to upgrade or downgrade an already-approved profile. This lets us promote profiles to Highly Recommended without sending them back to the queue.",
        },
        {
          rule: "Tiers: Verified (standard listing), Recommended (priority placement), Highly Recommended (top placement)",
          explanation:
            "Basic gets standard directory presence. Platinum is sorted to the top of search results regardless of other filters.",
        },
      ],
      connectedTo: ["Profile Directory"],
    },
  },

  // Ranking Engine (sorting rules)
  {
    id: "mp-ranking",
    type: "agentNode",
    position: { x: 700, y: 540 },
    data: {
      label: "Ranking Engine",
      type: "resolver",
      color: "orange",
      icon: "Star",
      badges: ["Pure Logic", "Tier First"],
      description:
        "Pure-logic sort layer applied to directory search. Highly Recommended tier always first, then Recommended, then Verified, featured flag within tier, then the chosen sort key.",
      plainDescription:
        "The rulebook that decides who shows up at the top when an applicant searches. No AI — just clear, predictable sorting rules. Highly Recommended consultants always come first, then Recommended, then Verified. Inside each tier, featured profiles get a boost. After that, the applicant's chosen sort (rating, experience, or response time) decides the order.",
      howItWorks: [
        "Applicant search filters are applied first — only profiles matching city, state, visa type, language, etc. survive.",
        "The surviving list is then sorted in three layers.",
        "Layer 1: Highly Recommended profiles float to the top, then Recommended, then Verified.",
        "Layer 2: Within each tier, profiles with the featured flag come before non-featured ones.",
        "Layer 3: Within that grouping, the applicant's chosen sort key is applied — rating descending, years of experience descending, or response time ascending.",
      ],
      roles: [
        "Apply tier-first sort to directory results",
        "Apply featured flag as a secondary boost",
        "Apply applicant's sort preference last",
      ],
      inputs: [
        "Filtered list of approved profiles",
        "Applicant's chosen sort key",
      ],
      outputs: ["A deterministically ranked list for the directory view"],
      whenRuns: "Every time an applicant runs a search on the directory.",
      businessRules: [
        {
          rule: "Highly Recommended always wins tier 1",
          explanation:
            "This is the commercial promise of the Highly Recommended tier — top placement on every search. No exceptions, so consultants know what they're getting.",
        },
        {
          rule: "Default sort is rating descending",
          explanation:
            "If the applicant doesn't pick a sort, rating is the default. Since ratings start at 0.0, newer profiles fall back to stable ordering until reviews come in.",
        },
        {
          rule: "No AI calls — pure deterministic logic",
          explanation:
            "Like the InPulse conflict resolver, ranking is simple if/then rules. Fast, predictable, easy to audit, easy to explain to consultants who ask why they're ranked where they are.",
        },
      ],
      connectedTo: ["Profile Directory"],
    },
  },

  // Profile Directory (public live listing)
  {
    id: "mp-profile-directory",
    type: "agentNode",
    position: { x: 340, y: 700 },
    data: {
      label: "Profile Directory",
      type: "agent",
      color: "blue",
      icon: "Globe",
      badges: ["Public", "Live"],
      description:
        "The public directory at /find-consultants listing all approved agent profiles with full filtering and ranking.",
      plainDescription:
        "What the world sees. The final public directory of every approved, live consultant. Applicants land here to find help, filter by their needs, see ranked results, and click through to individual profile pages. This is the page that turns marketplace listings into actual client engagements.",
      howItWorks: [
        "When an applicant hits /find-consultants, the backend fetches all approved profiles that match their filter query.",
        "The Ranking Engine sorts the results.",
        "Each profile card shows name, firm, city, specialisations, languages, years of experience, fee, response time, and tier badge.",
        "Clicking a profile opens the detail page with the full bio, contact details, and any extra context.",
        "Every view is logged for analytics (which profiles get the most clicks per visa type).",
      ],
      roles: [
        "Render the public directory of approved consultants",
        "Surface filter and sort controls",
        "Show individual profile detail pages",
        "Log views for analytics",
      ],
      inputs: [
        "Applicant filter query",
        "Ranked list from the Ranking Engine",
      ],
      outputs: [
        "Rendered directory page",
        "Profile detail page on click",
        "View-count updates to the database",
      ],
      dbTables: ["agent_profiles", "users"],
      whenRuns: "Live — served on every visit to /find-consultants.",
      businessRules: [
        {
          rule: "Only status = approved profiles are shown",
          explanation:
            "Pending, rejected, or suspended profiles never appear here, even if an admin has acted on them partially.",
        },
        {
          rule: "Tier badges are visible to applicants",
          explanation:
            "Recommended and Highly Recommended profiles are marked with badges so applicants can see the consultant's tier.",
        },
      ],
      connectedTo: ["Database", "Agent Edits Profile"],
    },
  },

  // Agent Edits Profile (feedback loop)
  {
    id: "mp-agent-edits",
    type: "agentNode",
    position: { x: 40, y: 380 },
    data: {
      label: "Agent Edits Profile",
      type: "agent",
      color: "orange",
      icon: "Pencil",
      badges: ["Self-Serve", "Material Edit Loop"],
      description:
        "Consultants can edit their own profile. Material edits (OMARA, firm, bio, specialisations, experience) reset status back to pending_review.",
      plainDescription:
        "Consultants keep their own profiles up to date. They can tweak cosmetic fields like response time or consultation fee at any time — those go live instantly. But if they change something material — their OMARA number, firm, bio, specialisations, or experience — the profile flips back to pending_review and has to be re-approved. This is how we keep the directory accurate without overwhelming admins with every tiny edit.",
      howItWorks: [
        "A consultant logs in and edits their own profile via the marketplace self-serve endpoint.",
        "The backend compares the incoming fields to the stored profile.",
        "If only cosmetic fields changed (response_time_hours, consultation_fee), the edit is saved and the profile stays approved.",
        "If any material field changed (omara_number, firm_name, bio, specializations, years_experience), the profile is reset to pending_review and sent back to the Application Queue.",
        "The consultant is informed that material edits require re-approval.",
      ],
      roles: [
        "Let consultants self-edit their live profile",
        "Detect material vs cosmetic edits",
        "Reset status to pending_review when needed",
        "Prevent silent quality drift on approved profiles",
      ],
      inputs: [
        "PATCH request from consultant with new field values",
        "Current profile snapshot for comparison",
      ],
      outputs: [
        "Updated agent_profile",
        "Status reset to pending_review (if material edit)",
      ],
      whenRuns: "Whenever a consultant edits their own profile.",
      businessRules: [
        {
          rule: "Material fields: omara_number, firm_name, bio, specializations, years_experience",
          explanation:
            "These are the fields that materially affect how applicants evaluate the consultant. Changing any of them requires a fresh admin review.",
        },
        {
          rule: "Cosmetic fields go live instantly",
          explanation:
            "Consultation fee, response time, languages — these can be updated by the consultant directly without re-review, so the directory stays current.",
        },
      ],
      connectedTo: ["Application Queue"],
    },
  },

  // Database
  {
    id: "mp-database",
    type: "database",
    position: { x: 340, y: 860 },
    data: {
      label: "Database",
      type: "database",
      color: "emerald",
      icon: "Database",
      description:
        "PostgreSQL store for agent profiles, users, and all marketplace audit data.",
      plainDescription:
        "The source of truth for the marketplace. Every application, every approval, every edit, every tier change is written here and queried from here. Also stores user accounts and audit trails for accountability.",
      howItWorks: [
        "The public application form writes a new user + agent_profile row.",
        "Admin approve/reject actions update the profile with status, tier, featured, approved_at, approved_by, and rejection_reason.",
        "Consultant self-edits update profile fields and may reset status back to pending_review.",
        "The public directory reads approved profiles for search and display.",
      ],
      roles: [
        "Persist agent profiles and user accounts",
        "Record approval history and rejection reasons",
        "Serve the public directory",
        "Maintain audit trails for admin actions",
      ],
      inputs: [
        "New applications from the public form",
        "Approval / rejection actions from admin",
        "Self-edits from consultants",
      ],
      outputs: [
        "Query results for the public directory and admin queue",
      ],
      dbTables: ["agent_profiles", "users"],
      whenRuns: "Always available — writes and reads happen in real-time.",
      businessRules: [
        {
          rule: "agent_profile.status: pending_review | approved | rejected | suspended",
          explanation:
            "Every profile is always in exactly one of these states. Only approved ones are visible to applicants.",
        },
        {
          rule: "OMARA number is indexed and unique",
          explanation:
            "Prevents two different profiles from claiming the same OMARA registration.",
        },
      ],
    },
  },
];

// ── Edge Definitions ───────────────────────────────────────────────────────

const MAIN_EDGE_STYLE = { stroke: "#8b5cf6", strokeWidth: 2 };
const REJECT_EDGE_STYLE = {
  stroke: "#f97316",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};
const RANKING_EDGE_STYLE = {
  stroke: "#14b8a6",
  strokeWidth: 1,
  strokeDasharray: "3 3",
};
const SEARCH_EDGE_STYLE = {
  stroke: "#0ea5e9",
  strokeWidth: 1.5,
  strokeDasharray: "4 3",
};
const DB_EDGE_STYLE = { stroke: "#10b981", strokeWidth: 1.5 };
const EDIT_EDGE_STYLE = {
  stroke: "#f97316",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

export const marketplaceEdges: Edge[] = [
  {
    id: "mp-apply-to-queue",
    source: "mp-agent-applies",
    target: "mp-application-queue",
    style: MAIN_EDGE_STYLE,
    animated: true,
    label: "submitted",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-queue-to-review",
    source: "mp-application-queue",
    target: "mp-admin-reviews",
    style: MAIN_EDGE_STYLE,
    animated: true,
  },
  {
    id: "mp-review-to-approve",
    source: "mp-admin-reviews",
    target: "mp-approve-tier",
    style: MAIN_EDGE_STYLE,
    animated: true,
    label: "approve",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-review-to-queue-reject",
    source: "mp-admin-reviews",
    target: "mp-application-queue",
    style: REJECT_EDGE_STYLE,
    animated: false,
    label: "rejected / resubmit",
    labelStyle: { fontSize: 10, fill: "#f97316" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-approve-to-directory",
    source: "mp-approve-tier",
    target: "mp-profile-directory",
    style: MAIN_EDGE_STYLE,
    animated: true,
    label: "goes live",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-ranking-to-directory",
    source: "mp-ranking",
    target: "mp-profile-directory",
    style: RANKING_EDGE_STYLE,
    animated: false,
    label: "sort rules",
    labelStyle: { fontSize: 10, fill: "#14b8a6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-search-to-directory",
    source: "mp-applicant-search",
    target: "mp-profile-directory",
    style: SEARCH_EDGE_STYLE,
    animated: false,
    label: "search",
    labelStyle: { fontSize: 10, fill: "#0ea5e9" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-directory-to-edits",
    source: "mp-profile-directory",
    target: "mp-agent-edits",
    style: EDIT_EDGE_STYLE,
    animated: false,
    label: "consultant manages",
    labelStyle: { fontSize: 10, fill: "#f97316" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-edits-to-queue",
    source: "mp-agent-edits",
    target: "mp-application-queue",
    style: EDIT_EDGE_STYLE,
    animated: false,
    label: "material edit",
    labelStyle: { fontSize: 10, fill: "#f97316" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "mp-directory-to-db",
    source: "mp-profile-directory",
    target: "mp-database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
];
