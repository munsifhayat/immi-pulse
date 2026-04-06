import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIModelInfo {
  name: string;
  id: string;
  maxTokens: number;
  operation: string;
}

export interface ScheduledTask {
  name: string;
  interval: string;
  description: string;
}

export interface BusinessRule {
  rule: string;
  explanation: string;
}

export interface AgentMetadata {
  [key: string]: unknown;
  label: string;
  type:
    | "input"
    | "classifier"
    | "resolver"
    | "agent"
    | "database"
    | "scheduler"
    | "shared";
  color: string;
  icon: string;
  description: string;
  /** Plain English summary for non-technical users */
  plainDescription: string;
  /** Step-by-step explanation of how this component works */
  howItWorks: string[];
  roles: string[];
  aiModel?: AIModelInfo;
  inputs?: string[];
  outputs?: string[];
  confidenceThreshold?: number;
  /** What the confidence threshold means in plain English */
  thresholdExplanation?: string;
  conflictRules?: string[];
  actions?: string[];
  scheduledTasks?: ScheduledTask[];
  dbTables?: string[];
  /** Key business rules enforced by this component */
  businessRules?: BusinessRule[];
  /** When/how often this component runs */
  whenRuns?: string;
  /** What connects downstream */
  connectedTo?: string[];
}

export type BoardNode = Node<AgentMetadata>;

// ── Node Definitions ───────────────────────────────────────────────────────

export const initialNodes: BoardNode[] = [
  // Shared Services (top-right, subtle)
  {
    id: "shared-services",
    type: "sharedServices",
    position: { x: 720, y: 0 },
    data: {
      label: "Shared Services",
      type: "shared",
      color: "gray",
      icon: "Layers",
      description:
        "Shared utilities used across all agents for email parsing, attachment processing, and logging.",
      plainDescription:
        "A set of tools that every part of the system shares — like reading emails, opening PDF attachments, and keeping a record of everything the AI does.",
      howItWorks: [
        "When an email arrives, the parser breaks it into structured parts: sender, subject, body text, and any attached files.",
        "If there are PDF attachments, the PDF processor extracts the readable text so the AI can analyze it.",
        "Every time the AI is called, the usage logger records which model was used, how many tokens it consumed, and the estimated cost.",
        "All agent actions (classifications, moves, flags) are written to the activity log for a full audit trail.",
      ],
      roles: [
        "Parse email headers, body, and metadata",
        "Extract and process PDF attachments",
        "Log all AI usage with token counts and costs",
        "Record agent activity for audit trail",
      ],
      inputs: ["Raw email data from Microsoft 365", "File attachments (PDFs, images)"],
      outputs: [
        "Parsed email structure (sender, subject, body, recipients)",
        "Extracted text from PDF attachments",
        "AI usage logs (model, tokens, cost)",
        "Agent activity records (for dashboard & auditing)",
      ],
      dbTables: ["ai_usage_logs", "agent_activity_log"],
      whenRuns: "Automatically — used by every other component whenever they process an email.",
      businessRules: [
        {
          rule: "Attachment text is limited to 2,000 characters",
          explanation:
            "To keep AI costs down and responses fast, only the first 2,000 characters of attachment text are sent to the AI model.",
        },
        {
          rule: "Every AI call is cost-tracked",
          explanation:
            "Each AI request logs the model used, token count, latency, and estimated USD cost — visible on the dashboard for budget monitoring.",
        },
      ],
    },
  },

  // Email Input
  {
    id: "email-input",
    type: "emailInput",
    position: { x: 340, y: 60 },
    data: {
      label: "Email Input",
      type: "input",
      color: "sky",
      icon: "Mail",
      description:
        "Microsoft 365 Graph API webhook endpoint that receives change notifications when new emails arrive in monitored mailboxes.",
      plainDescription:
        "The starting point of the whole system. It watches your Microsoft 365 mailbox and instantly picks up new emails as they arrive, then sends them through the AI pipeline for classification.",
      howItWorks: [
        "Microsoft 365 sends a webhook notification the moment a new email lands in a monitored mailbox.",
        "The system validates the notification is genuine (not spoofed) using a subscription token.",
        "It then fetches the full email — subject, body, sender, recipients, and all attachments — via the Graph API.",
        "The email is checked against a deduplication table to make sure it hasn't already been processed.",
        "If it's new, the email is dispatched into the classification pipeline.",
      ],
      roles: [
        "Listen for Graph API webhook notifications",
        "Validate webhook subscription tokens",
        "Fetch full email content via Graph API",
        "Deduplicate emails to prevent double-processing",
        "Dispatch email to classification pipeline",
      ],
      inputs: [
        "Graph API change notification (from Microsoft 365)",
        "Webhook validation token",
      ],
      outputs: [
        "Full email message (headers, body, attachments)",
        "Mailbox identifier (which inbox it came from)",
      ],
      whenRuns: "Instantly — triggered every time a new email arrives in a monitored mailbox. Also backed up by a polling job every 5 minutes in case a webhook is missed.",
      businessRules: [
        {
          rule: "Deduplication by message ID + mailbox",
          explanation:
            "Each email is only processed once. If the same email triggers multiple webhooks (which can happen), duplicates are skipped automatically.",
        },
        {
          rule: "Polling fallback every 5 minutes",
          explanation:
            "In case Microsoft fails to deliver a webhook notification, a backup job polls the mailbox every 5 minutes to catch any missed emails.",
        },
      ],
      connectedTo: ["Unified Classifier (primary)", "Legacy Agents (fallback)"],
    },
  },

  // Scheduler
  {
    id: "scheduler",
    type: "scheduler",
    position: { x: 720, y: 200 },
    data: {
      label: "Scheduler",
      type: "scheduler",
      color: "teal",
      icon: "Clock",
      description:
        "APScheduler-based job scheduler that runs periodic tasks for SLA monitoring, summary generation, emergent work scanning, and webhook subscription renewal.",
      plainDescription:
        "A background timer that runs important maintenance tasks on a regular schedule — like checking if urgent emails have been responded to on time, generating daily reports, and keeping the Microsoft 365 connection alive.",
      howItWorks: [
        "The scheduler starts automatically when the backend server boots up.",
        "It runs multiple jobs on different schedules — some every few minutes, some daily.",
        "Each job runs independently and logs its results to the activity trail.",
        "If the server restarts, all jobs resume on their configured schedules.",
      ],
      roles: [
        "Run scheduled jobs at configured intervals",
        "Monitor SLA compliance for urgent emails",
        "Generate daily classification summaries",
        "Keep Microsoft 365 webhook subscriptions alive",
      ],
      inputs: ["Cron schedule configuration", "Timezone settings (Australia/Sydney)"],
      outputs: ["Job execution triggers to P1 and Emergent Work agents"],
      scheduledTasks: [
        {
          name: "SLA Check",
          interval: "Every 15 min",
          description: "Checks if any P1 (urgent) emails are approaching or have passed the 1-hour response deadline. Flags overdue items for escalation.",
        },
        {
          name: "Daily Summary",
          interval: "Daily at 4pm",
          description:
            "Generates a daily report summarizing all email classifications — how many P1s, invoices detected, emergent work flagged.",
        },
        {
          name: "Emergent Work Scan",
          interval: "Every 2 hours",
          description:
            "Scans recent email threads in bulk to detect out-of-scope work patterns that individual email analysis might miss.",
        },
        {
          name: "Webhook Renewal",
          interval: "Daily at midnight",
          description: "Renews Microsoft Graph API webhook subscriptions before they expire (every 3 days). Keeps real-time email monitoring active.",
        },
        {
          name: "Email Polling",
          interval: "Every 5 min",
          description: "Backup mechanism that polls mailboxes in case a webhook notification was missed by Microsoft.",
        },
      ],
      whenRuns: "Always running in the background. Individual jobs fire on their own schedules.",
      businessRules: [
        {
          rule: "SLA deadline is 1 hour for P1 emails",
          explanation:
            "Any email classified as P1 (critical) must receive a response within 1 hour. The SLA check runs every 15 minutes to catch items approaching this deadline.",
        },
        {
          rule: "Webhook subscriptions expire after 3 days",
          explanation:
            "Microsoft 365 requires subscriptions to be renewed regularly. The daily midnight job ensures they never lapse, which would stop real-time email monitoring.",
        },
      ],
    },
  },

  // Unified Classifier
  {
    id: "unified-classifier",
    type: "unifiedClassifier",
    position: { x: 340, y: 200 },
    data: {
      label: "Unified Classifier",
      type: "classifier",
      color: "violet",
      icon: "Sparkles",
      description:
        'Single AI call that classifies all 3 dimensions simultaneously — "Classify Once, Act Many". Uses Claude Sonnet for comprehensive multi-dimensional analysis in one request.',
      plainDescription:
        "The brain of the system. Instead of running three separate AI calls for each email (which would be slower and more expensive), it runs one smart AI call that answers three questions at once: Is this an invoice? How urgent is it? Is there out-of-scope work?",
      howItWorks: [
        "Receives the parsed email — subject, body, sender, and any extracted attachment text.",
        "Sends everything to Claude Sonnet in a single, carefully structured prompt that asks for three classifications at once.",
        "The AI returns a structured JSON response with three sections: invoice detection, priority level, and emergent work signals.",
        "Each section includes a confidence score (0–100%) and reasoning explaining why it made that decision.",
        "The AI also flags potential conflicts — for example, if an email is both an invoice AND urgent.",
        "Results are passed to the Conflict Resolver before any actions are taken.",
      ],
      roles: [
        "Classify invoice presence and confidence",
        "Determine priority level (P1–P4) with reasoning",
        "Detect emergent/out-of-scope work indicators",
        "Return structured JSON with all dimensions",
        "Flag potential conflicts between dimensions",
      ],
      aiModel: {
        name: "Claude Sonnet",
        id: "anthropic.claude-sonnet-4-20250514-v1:0",
        maxTokens: 4096,
        operation: "classify_comprehensive",
      },
      inputs: [
        "Parsed email (subject, body, sender, recipients)",
        "Attachment text (extracted from PDFs, max 2,000 chars)",
        "Email thread context (for reply chains)",
      ],
      outputs: [
        "Invoice classification — is_invoice, confidence, invoice_type, reasoning",
        "Priority classification — level (P1–P4), is_urgent, confidence, category, client_name, reasoning",
        "Emergent work signals — has_signals, confidence, signal_description, reasoning",
        "Conflict flags — e.g. invoice_and_urgent, urgent_and_low_confidence",
      ],
      whenRuns: "Every time a new email arrives — triggered by the Email Input component. This is the primary classification path.",
      businessRules: [
        {
          rule: '"Classify Once, Act Many" — one AI call covers all three dimensions',
          explanation:
            "Running a single Sonnet call instead of three separate calls cuts latency by ~60% and reduces AI costs. The AI sees the full picture, which also improves accuracy.",
        },
        {
          rule: "Falls back to legacy agents on any failure",
          explanation:
            "If the unified classifier errors out (AI timeout, malformed response, etc.), the system automatically switches to the legacy path — three independent Haiku calls. No email is ever lost.",
        },
        {
          rule: "Invoice types recognized: invoice, receipt, purchase order, credit note",
          explanation:
            "The AI is trained to distinguish between these document types. Quotes, estimates, and general correspondence about money are NOT classified as invoices.",
        },
        {
          rule: "P1 = safety hazards, service outages, compliance deadlines within 24h, client escalations",
          explanation:
            "The priority system mirrors real facilities management urgency. P1 is reserved for situations that could cause harm, service disruption, or regulatory risk.",
        },
      ],
      connectedTo: ["Conflict Resolver"],
    },
  },

  // Conflict Resolver
  {
    id: "conflict-resolver",
    type: "conflictResolver",
    position: { x: 340, y: 370 },
    data: {
      label: "Conflict Resolver",
      type: "resolver",
      color: "orange",
      icon: "GitMerge",
      description:
        "Pure-logic conflict resolution layer with no AI calls. Handles edge cases where multiple classification dimensions conflict, applying deterministic business rules.",
      plainDescription:
        "A safety layer that checks for conflicts before taking action. For example, if an email contains an invoice but is also flagged as urgent, the system needs to decide: should it auto-move the email to the invoices folder, or keep it visible so someone can respond urgently? The Conflict Resolver applies clear business rules to make these decisions.",
      howItWorks: [
        "Receives the raw classification results from the Unified Classifier — all three dimension scores and any flagged conflicts.",
        "Checks each pair of dimensions against a set of business rules (no AI involved — pure deterministic logic).",
        "For each dimension, outputs a decision: should the action execute? Should it be flagged for human review?",
        "Critical rule: P1 (urgent) emails are NEVER suppressed. They always proceed, even if flagged.",
        "Results are passed to the three downstream handlers (Invoice, P1, Emergent Work) to execute their actions.",
      ],
      roles: [
        "Apply business rules to resolve classification conflicts",
        "Suppress invoice auto-move when email is also urgent (P1)",
        "Flag low-confidence P1 classifications for human review",
        "Output final resolved actions for each dimension",
      ],
      inputs: [
        "Raw unified classification result (all 3 dimensions)",
        "Confidence scores for each dimension",
        "Conflict flags from the classifier",
      ],
      outputs: [
        "Resolved action per dimension — execute, flag, or skip",
        "Flag reasons explaining why an action was modified",
      ],
      conflictRules: [
        "Invoice + P1 urgent → invoice auto-move is suppressed, email flagged for manual review (so urgent emails stay visible in inbox)",
        "Low confidence P1 (below 60%) → P1 is still recorded but flagged for human review before escalation",
        "Invoice + emergent work → both proceed independently, both flagged for review (no conflict, but worth a human check)",
      ],
      whenRuns: "Immediately after the Unified Classifier completes — part of the same real-time pipeline.",
      businessRules: [
        {
          rule: "P1 (urgent) is NEVER suppressed",
          explanation:
            "No matter what conflicts exist, a P1 classification always goes through. This ensures urgent safety or compliance issues are never missed — they can only be flagged for additional review, never silenced.",
        },
        {
          rule: "Invoice confidence must be ≥ 70% to auto-move",
          explanation:
            "The system only auto-moves emails to the invoice folder when it's at least 70% confident. Below that, it flags the email for a human to check.",
        },
        {
          rule: "P1 confidence must be ≥ 60% to proceed without flags",
          explanation:
            "If the AI classifies something as urgent but is less than 60% confident, it still records the P1 but adds a flag saying 'needs human review' to avoid false alarms.",
        },
        {
          rule: "No AI calls — pure deterministic logic",
          explanation:
            "The resolver uses simple if/then business rules, not AI. This makes it fast, predictable, and easy to audit.",
        },
      ],
      connectedTo: ["Invoice Handler", "P1 Classifier", "Emergent Work"],
    },
  },

  // Invoice Handler
  {
    id: "invoice-handler",
    type: "agentNode",
    position: { x: 80, y: 530 },
    data: {
      label: "Invoice Handler",
      type: "agent",
      color: "blue",
      icon: "FileText",
      description:
        "Detects invoice attachments in emails and automatically moves them to a designated folder. Falls back to standalone Haiku classification in legacy mode.",
      plainDescription:
        "Handles the invoice side of email processing. When the AI detects an invoice with high confidence, this handler automatically moves the email into a dedicated invoices folder in your mailbox — saving you from manual sorting.",
      howItWorks: [
        "Receives the pre-classified invoice result from the Conflict Resolver — including whether the action was flagged or suppressed.",
        "If confidence is ≥ 70% and the action isn't flagged: moves the email to the designated invoices folder via the Graph API.",
        "If the action was flagged (e.g., the email is also urgent): records the invoice detection but does NOT move the email, keeping it visible in the inbox.",
        "If confidence is below 70%: records the detection as 'flagged' for human review.",
        "All results — moved, flagged, or skipped — are saved to the database with full details.",
      ],
      roles: [
        "Identify invoice documents in email attachments",
        "Auto-move high-confidence invoices to designated folder",
        "Flag low-confidence or conflicting invoices for human review",
        "Record all detection results with confidence scores",
      ],
      aiModel: {
        name: "Claude Haiku / Sonnet",
        id: "Haiku (legacy) / Sonnet (unified)",
        maxTokens: 4096,
        operation: "classify (legacy) / classify_comprehensive (unified)",
      },
      confidenceThreshold: 0.7,
      thresholdExplanation:
        "The system only auto-moves emails when it's at least 70% confident they contain an invoice. Below that threshold, emails are flagged for a human to verify — preventing false positives from accidentally hiding important emails.",
      inputs: [
        "Pre-classified invoice result from Conflict Resolver",
        "Email attachments and parsed content",
        "Mailbox settings (target folder name)",
      ],
      outputs: [
        "Invoice detection record (saved to database)",
        "Email moved to invoices folder (or flagged/skipped)",
        "Activity log entry",
      ],
      actions: [
        "Move to invoice folder",
        "Record detection",
        "Flag for review",
        "Skip (not an invoice)",
      ],
      dbTables: ["invoice_detections"],
      whenRuns: "Real-time — processes each email as it arrives through the pipeline.",
      businessRules: [
        {
          rule: "Auto-move requires ≥ 70% confidence AND no conflict flags",
          explanation:
            "Both conditions must be met. High confidence alone isn't enough if the email was also flagged as urgent — it stays in the inbox so someone can respond.",
        },
        {
          rule: "Recognized invoice types: invoice, receipt, purchase order, credit note",
          explanation:
            "The AI distinguishes these from quotes, estimates, and general financial correspondence. Only actual payment-related documents trigger the handler.",
        },
        {
          rule: "Excluded mailboxes are skipped",
          explanation:
            "Some mailboxes can be configured to skip invoice processing entirely — useful for mailboxes that should never have emails auto-moved.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // P1 Handler
  {
    id: "p1-handler",
    type: "agentNode",
    position: { x: 340, y: 530 },
    data: {
      label: "P1 Classifier",
      type: "agent",
      color: "red",
      icon: "AlertTriangle",
      description:
        "Classifies email urgency from P1 (critical) to P4 (low). Tracks SLA compliance with a 1-hour response deadline for P1 items and generates daily summaries at 4pm.",
      plainDescription:
        "The priority engine. Every email gets a priority level from P1 (drop everything) to P4 (informational). When an email is classified as P1, a 1-hour countdown starts — if nobody responds in time, the system flags it as an SLA breach.",
      howItWorks: [
        "Receives the pre-classified priority result from the Conflict Resolver.",
        "Creates a P1 job record with: priority level, category (safety, maintenance, compliance, etc.), client name, contract location, and job description.",
        "If the email is P1 (urgent): sets a response deadline = email received time + 1 hour.",
        "The Scheduler's SLA Check (every 15 min) monitors all open P1 jobs and flags any approaching or past their deadline.",
        "At 4pm daily, the Scheduler triggers a summary report of all classifications for the day.",
        "If the P1 was flagged by the Conflict Resolver (low confidence), it's still recorded but marked for human review.",
      ],
      roles: [
        "Assign priority level P1–P4 to each email",
        "Track SLA compliance (1-hour deadline for P1)",
        "Extract client name, location, and job details",
        "Generate daily summary reports at 4pm",
        "Flag overdue P1 items for escalation",
      ],
      aiModel: {
        name: "Claude Haiku / Sonnet",
        id: "Haiku (legacy) / Sonnet (unified)",
        maxTokens: 4096,
        operation: "classify (legacy) / summarize (Sonnet)",
      },
      inputs: [
        "Pre-classified priority result from Conflict Resolver",
        "Email subject, body, sender context",
        "Email received timestamp (for SLA calculation)",
      ],
      outputs: [
        "P1 job record with SLA deadline tracking",
        "Daily summary report (generated at 4pm)",
        "SLA breach alerts for overdue P1 items",
        "Activity log entry with priority details",
      ],
      actions: [
        "Create P1 job",
        "Set SLA deadline (1 hour)",
        "Track response time",
        "Generate daily summary",
        "Escalate overdue P1",
      ],
      dbTables: ["p1_jobs", "daily_summaries"],
      whenRuns: "Real-time for classification. SLA monitoring every 15 minutes. Daily summary at 4pm AEST.",
      businessRules: [
        {
          rule: "P1 = 1-hour SLA response deadline",
          explanation:
            "When an email is classified as P1 (critical), the clock starts immediately. The response deadline is set to exactly 1 hour after the email was received.",
        },
        {
          rule: "Priority levels: P1 (critical) → P2 (high) → P3 (medium) → P4 (low)",
          explanation:
            "P1: Safety hazards (gas leaks, electrical failures, water damage), service outages, compliance deadlines within 24 hours, client escalations. P2: Important but not immediately dangerous. P3: Standard maintenance requests. P4: Informational, non-actionable.",
        },
        {
          rule: "Categories: safety, maintenance, repair, inspection, compliance, general",
          explanation:
            "Each email is also tagged with a category to help filter and report on the types of work coming in.",
        },
        {
          rule: "SLA check runs every 15 minutes",
          explanation:
            "The system doesn't wait for the full hour — it proactively checks every 15 minutes so teams get early warning when a P1 deadline is approaching.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Emergent Work Handler
  {
    id: "emergent-handler",
    type: "agentNode",
    position: { x: 600, y: 530 },
    data: {
      label: "Emergent Work",
      type: "agent",
      color: "amber",
      icon: "TrendingUp",
      description:
        "Analyzes email threads and attachments to detect out-of-scope work patterns. Runs both on incoming emails and on a 2-hour scheduled scan of recent threads.",
      plainDescription:
        "Watches for work that wasn't part of the original maintenance contract — like unplanned repairs, scope changes, or additional site visits. This helps catch and bill for out-of-scope work that might otherwise slip through.",
      howItWorks: [
        "On each incoming email: receives the emergent work signal from the Unified Classifier — a lightweight 'yes/no/maybe' flag.",
        "If signals are detected: records the finding with a description and confidence score.",
        "Every 2 hours: the Scheduler triggers a deeper batch scan that analyzes full email threads (not just individual emails) to catch scope creep patterns.",
        "The batch scan uses Claude Sonnet with the full thread history and attachments for more thorough analysis.",
        "Findings include: description of the out-of-scope work, evidence, estimated impact (low/medium/high), and recommended action.",
      ],
      roles: [
        "Detect out-of-scope work indicators in emails",
        "Analyze email threads for scope creep patterns",
        "Generate emergent work reports for client review",
        "Run deep thread analysis on 2-hour schedule",
      ],
      aiModel: {
        name: "Claude Sonnet",
        id: "anthropic.claude-sonnet-4-20250514-v1:0",
        maxTokens: 4096,
        operation: "analyze",
      },
      confidenceThreshold: 0.6,
      thresholdExplanation:
        "Emergent work detection uses a lower threshold (60%) than invoices because it's better to flag a potential scope change for review than to miss it. False positives are less costly here — a human simply reviews and dismisses if irrelevant.",
      inputs: [
        "Pre-classified emergent signal from Conflict Resolver",
        "Email thread history (for batch scan)",
        "Attachment content (for batch scan)",
      ],
      outputs: [
        "Emergent work item record with evidence",
        "Periodic scan report (every 2 hours)",
        "Impact assessment (low / medium / high)",
        "Recommended action (raise with client / monitor / ignore)",
      ],
      actions: [
        "Record emergent work signal",
        "Generate batch scan report",
        "Flag for client review",
        "Assess impact level",
      ],
      dbTables: ["emergent_work_items", "emergent_work_reports"],
      whenRuns: "Real-time signal detection on each email. Deep thread analysis every 2 hours via Scheduler.",
      businessRules: [
        {
          rule: "Two-tier detection: real-time signals + batch thread analysis",
          explanation:
            "Individual emails get a quick signal check. But scope creep often only becomes visible across a thread — so the 2-hour batch scan looks at entire conversations for patterns.",
        },
        {
          rule: "Emergent work indicators include: scope changes, unplanned repairs, additional site visits, budget overruns",
          explanation:
            "The AI is trained on facilities management patterns — things like third-party damage repairs, mid-job scope increases, or materials beyond standard maintenance contracts.",
        },
        {
          rule: "NOT emergent: routine maintenance, standard repairs, administrative follow-ups",
          explanation:
            "The AI is specifically told to exclude normal contract work from flagging, reducing noise.",
        },
        {
          rule: "Each finding includes impact and recommended action",
          explanation:
            "Not all out-of-scope work is equal. The AI estimates impact (low/medium/high) and suggests whether to raise it with the client, monitor it, or ignore it.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Database
  {
    id: "database",
    type: "database",
    position: { x: 310, y: 700 },
    data: {
      label: "Database",
      type: "database",
      color: "emerald",
      icon: "Database",
      description:
        "PostgreSQL database (asyncpg driver) storing all classification results, reports, and audit logs. Managed via Alembic migrations.",
      plainDescription:
        "The permanent record of everything the system does. Every email classification, every invoice detection, every P1 alert, and every emergent work finding is stored here — along with AI usage costs and a complete activity trail.",
      howItWorks: [
        "All three agent handlers write their results to the database after processing each email.",
        "Writes happen in parallel (all three agents commit at once) for speed.",
        "The database is queried by the frontend dashboard to show real-time stats, activity feeds, and reports.",
        "Schema changes are managed via Alembic migrations — the database auto-updates on each deployment.",
      ],
      roles: [
        "Persist all agent classification results",
        "Store daily summaries and periodic reports",
        "Track AI usage for cost monitoring",
        "Maintain agent activity audit trail",
        "Serve data to frontend dashboard",
      ],
      inputs: ["Classification records from all agents", "Reports from Scheduler jobs", "AI usage logs", "Activity entries"],
      outputs: ["Query results for dashboard, API, and reports"],
      dbTables: [
        "invoice_detections",
        "p1_jobs",
        "daily_summaries",
        "emergent_work_items",
        "emergent_work_reports",
        "ai_usage_logs",
        "agent_activity_log",
      ],
      whenRuns: "Always available — receives writes from all agents in real-time and serves reads to the dashboard.",
      businessRules: [
        {
          rule: "7 tables covering all system data",
          explanation:
            "invoice_detections (invoices found), p1_jobs (priority classifications), daily_summaries (4pm reports), emergent_work_items & reports (scope detection), ai_usage_logs (cost tracking), agent_activity_log (full audit trail).",
        },
        {
          rule: "Deduplication via processed_emails table",
          explanation:
            "A separate tracking table ensures each email (by message_id + mailbox) is only processed once, even if multiple webhooks fire.",
        },
      ],
    },
  },
];

// ── Edge Definitions ───────────────────────────────────────────────────────

const UNIFIED_EDGE_STYLE = {
  stroke: "#8b5cf6",
  strokeWidth: 2,
};

const LEGACY_EDGE_STYLE = {
  stroke: "#94a3b8",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

const SCHEDULER_EDGE_STYLE = {
  stroke: "#14b8a6",
  strokeWidth: 1,
  strokeDasharray: "3 3",
};

const SHARED_EDGE_STYLE = {
  stroke: "#9ca3af",
  strokeWidth: 1,
  strokeDasharray: "2 4",
};

const DB_EDGE_STYLE = {
  stroke: "#10b981",
  strokeWidth: 1.5,
};

export const initialEdges: Edge[] = [
  // Shared services → unified classifier (dotted)
  {
    id: "shared-to-unified",
    source: "shared-services",
    target: "unified-classifier",
    style: SHARED_EDGE_STYLE,
    animated: false,
  },

  // Unified pipeline (solid animated violet)
  {
    id: "email-to-unified",
    source: "email-input",
    target: "unified-classifier",
    style: UNIFIED_EDGE_STYLE,
    animated: true,
    label: "primary path",
    labelStyle: { fontSize: 10, fill: "#8b5cf6" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "unified-to-resolver",
    source: "unified-classifier",
    target: "conflict-resolver",
    style: UNIFIED_EDGE_STYLE,
    animated: true,
  },
  {
    id: "resolver-to-invoice",
    source: "conflict-resolver",
    target: "invoice-handler",
    style: UNIFIED_EDGE_STYLE,
    animated: true,
  },
  {
    id: "resolver-to-p1",
    source: "conflict-resolver",
    target: "p1-handler",
    style: UNIFIED_EDGE_STYLE,
    animated: true,
  },
  {
    id: "resolver-to-emergent",
    source: "conflict-resolver",
    target: "emergent-handler",
    style: UNIFIED_EDGE_STYLE,
    animated: true,
  },

  // Legacy fallback (dashed gray)
  {
    id: "email-to-invoice-legacy",
    source: "email-input",
    target: "invoice-handler",
    style: LEGACY_EDGE_STYLE,
    animated: false,
    label: "fallback",
    labelStyle: { fontSize: 10, fill: "#94a3b8" },
    labelBgStyle: { fill: "transparent" },
  },
  {
    id: "email-to-p1-legacy",
    source: "email-input",
    target: "p1-handler",
    style: LEGACY_EDGE_STYLE,
    animated: false,
  },
  {
    id: "email-to-emergent-legacy",
    source: "email-input",
    target: "emergent-handler",
    style: LEGACY_EDGE_STYLE,
    animated: false,
  },

  // Scheduler → agents (dotted teal)
  {
    id: "scheduler-to-p1",
    source: "scheduler",
    target: "p1-handler",
    style: SCHEDULER_EDGE_STYLE,
    animated: false,
  },
  {
    id: "scheduler-to-emergent",
    source: "scheduler",
    target: "emergent-handler",
    style: SCHEDULER_EDGE_STYLE,
    animated: false,
  },

  // Agents → Database (solid emerald)
  {
    id: "invoice-to-db",
    source: "invoice-handler",
    target: "database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
  {
    id: "p1-to-db",
    source: "p1-handler",
    target: "database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
  {
    id: "emergent-to-db",
    source: "emergent-handler",
    target: "database",
    style: DB_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
  },
];
