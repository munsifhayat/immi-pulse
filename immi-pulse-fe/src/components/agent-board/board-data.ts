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
  /** Short pill labels rendered on the node card (overrides AI-specific defaults) */
  badges?: string[];
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
        "Shared utilities used across all agents for email parsing, document processing, and logging.",
      plainDescription:
        "A set of tools that every part of the system shares — like reading emails, processing immigration documents (passports, skills assessments, English test results), and keeping a record of everything the AI does.",
      howItWorks: [
        "When an email arrives, the parser breaks it into structured parts: sender, subject, body text, and any attached files.",
        "If there are document attachments (PDFs, images), the processor extracts readable text and metadata so the AI can analyze passports, skills assessments, English test scores, and other immigration documents.",
        "Every time the AI is called, the usage logger records which model was used, how many tokens it consumed, and the estimated cost.",
        "All agent actions (classifications, case updates, flags) are written to the activity log for a full audit trail.",
      ],
      roles: [
        "Parse email headers, body, and metadata",
        "Extract and process document attachments (PDFs, images)",
        "Log all AI usage with token counts and costs",
        "Record agent activity for audit trail",
      ],
      inputs: ["Raw email data from Microsoft 365", "Document attachments (PDFs, images — passports, test results, forms)"],
      outputs: [
        "Parsed email structure (sender, subject, body, recipients)",
        "Extracted text from document attachments",
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
        "The starting point of the whole system. It watches your Microsoft 365 mailbox and instantly picks up new client inquiries, document submissions, and case updates as they arrive, then sends them through the AI pipeline for classification.",
      howItWorks: [
        "Microsoft 365 sends a webhook notification the moment a new email lands in a monitored mailbox.",
        "The system validates the notification is genuine (not spoofed) using a subscription token.",
        "It then fetches the full email — subject, body, sender, recipients, and all attachments (visa documents, passports, skills assessments) — via the Graph API.",
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
      connectedTo: ["Unified Classifier (primary)", "Individual Agents (fallback)"],
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
        "APScheduler-based job scheduler that runs periodic tasks for deadline monitoring, summary generation, document review scanning, and webhook subscription renewal.",
      plainDescription:
        "A background timer that runs important tasks on a regular schedule — like checking visa lodgement deadlines, scanning for pending document reviews, generating daily case reports, and keeping the Microsoft 365 connection alive.",
      howItWorks: [
        "The scheduler starts automatically when the backend server boots up.",
        "It runs multiple jobs on different schedules — some every few minutes, some daily.",
        "Each job runs independently and logs its results to the activity trail.",
        "If the server restarts, all jobs resume on their configured schedules.",
      ],
      roles: [
        "Run scheduled jobs at configured intervals",
        "Monitor visa lodgement deadlines and compliance dates",
        "Generate daily case classification summaries",
        "Keep Microsoft 365 webhook subscriptions alive",
      ],
      inputs: ["Cron schedule configuration", "Timezone settings (Australia/Sydney)"],
      outputs: ["Job execution triggers to Visa Classifier and Document Reviewer agents"],
      scheduledTasks: [
        {
          name: "Deadline Monitor",
          interval: "Every 15 min",
          description: "Checks if any visa lodgement deadlines, bridging visa expiries, or compliance dates are approaching or overdue. Flags urgent items for consultant action.",
        },
        {
          name: "Daily Summary",
          interval: "Daily at 4pm",
          description:
            "Generates a daily report summarizing all case activity — new inquiries received, visa types classified, documents reviewed, deadlines approaching.",
        },
        {
          name: "Document Review Scan",
          interval: "Every 2 hours",
          description:
            "Scans recent email threads in bulk to detect unprocessed document attachments and incomplete submissions that individual email analysis might miss.",
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
          rule: "Visa lodgement deadlines are tracked to the day",
          explanation:
            "Each case with an upcoming lodgement deadline is monitored. The deadline monitor runs every 15 minutes to catch items approaching their due date and alert consultants.",
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
        "The brain of the system. Instead of running three separate AI calls for each email (which would be slower and more expensive), it runs one smart AI call that answers four questions at once: Is this a new case inquiry? What visa type applies? Are there document attachments? What's the urgency?",
      howItWorks: [
        "Receives the parsed email — subject, body, sender, and any extracted attachment text (passports, skills assessments, English test results).",
        "Sends everything to Claude Sonnet in a single, carefully structured prompt that asks for three classifications at once.",
        "The AI returns a structured JSON response with three sections: case inquiry detection (new vs. existing case match), visa type classification, and document attachment analysis.",
        "Each section includes a confidence score (0–100%) and reasoning explaining why it made that decision.",
        "The AI also flags potential conflicts — for example, if an email matches an existing case but contains a new visa type inquiry.",
        "Results are passed to the Conflict Resolver before any actions are taken.",
      ],
      roles: [
        "Detect new case inquiries and match to existing cases",
        "Classify visa type and stream (employer-sponsored, skilled independent, family, etc.)",
        "Detect document attachments requiring validation",
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
        "Attachment text (extracted from documents, max 2,000 chars)",
        "Email thread context (for reply chains)",
      ],
      outputs: [
        "Case inquiry classification — is_new_inquiry, existing_case_match, confidence, reasoning",
        "Visa classification — visa_subclass, stream (employer-sponsored, skilled independent, family, etc.), confidence, reasoning",
        "Document detection — has_attachments, document_types (passport, skills assessment, English test, etc.), reasoning",
        "Conflict flags — e.g. new_inquiry_and_existing_case, multiple_visa_types_detected",
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
          rule: "Visa subclasses recognized: 189, 190, 491, 186, 482, 500, 600, 820/801, 309/100, and more",
          explanation:
            "The AI identifies Australian visa subclasses from client communications. It distinguishes between skilled, employer-sponsored, student, visitor, partner, and other visa categories.",
        },
        {
          rule: "Streams: employer-sponsored, skilled independent, state-nominated, family, student, visitor",
          explanation:
            "Each visa inquiry is categorized into a stream to route to the correct consultant workflow and checklist template.",
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
        "A safety layer that checks for conflicts before taking action. For example, if an email appears to be a new client inquiry but also matches an existing case, the system needs to decide: should it create a new case or link to the existing one? The Conflict Resolver applies clear business rules to make these decisions.",
      howItWorks: [
        "Receives the raw classification results from the Unified Classifier — all three dimension scores and any flagged conflicts.",
        "Checks each pair of dimensions against a set of business rules (no AI involved — pure deterministic logic).",
        "For each dimension, outputs a decision: should the action execute? Should it be flagged for consultant review?",
        "Critical rule: new inquiries with document attachments are NEVER suppressed. They always proceed for intake processing.",
        "Results are passed to the three downstream handlers (Email Intake, Visa Classifier, Document Reviewer) to execute their actions.",
      ],
      roles: [
        "Apply business rules to resolve classification conflicts",
        "Flag new inquiry + existing case match for consultant review",
        "Flag low-confidence visa classifications for manual verification",
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
        "New inquiry + existing case match → flag for consultant review (consultant decides: new case or link to existing)",
        "Low confidence visa classification (below 60%) → visa type is recorded but flagged for consultant verification before checklist generation",
        "Multiple visa types detected → all proceed independently, flagged for review (client may need guidance on best pathway)",
      ],
      whenRuns: "Immediately after the Unified Classifier completes — part of the same real-time pipeline.",
      businessRules: [
        {
          rule: "New inquiries with documents are NEVER suppressed",
          explanation:
            "No matter what conflicts exist, a new client inquiry with attached documents always goes through intake. This ensures potential clients and their submissions are never missed — they can only be flagged for additional review, never silenced.",
        },
        {
          rule: "Case matching confidence must be ≥ 70% to auto-link",
          explanation:
            "The system only auto-links an email to an existing case when it's at least 70% confident of the match. Below that, it flags for a consultant to verify.",
        },
        {
          rule: "Visa classification confidence must be ≥ 60% to proceed without flags",
          explanation:
            "If the AI classifies a visa type but is less than 60% confident, it still records the classification but adds a flag saying 'needs consultant review' to avoid incorrect checklist generation.",
        },
        {
          rule: "No AI calls — pure deterministic logic",
          explanation:
            "The resolver uses simple if/then business rules, not AI. This makes it fast, predictable, and easy to audit.",
        },
      ],
      connectedTo: ["Email Intake", "Visa Classifier", "Document Reviewer"],
    },
  },

  // Email Intake (node ID: invoice-handler kept for React Flow stability)
  {
    id: "invoice-handler",
    type: "agentNode",
    position: { x: 80, y: 530 },
    data: {
      label: "Email Intake",
      type: "agent",
      color: "blue",
      icon: "FileText",
      description:
        "Detects new client inquiries, matches them to existing cases, and identifies document attachments. Falls back to standalone Haiku classification in legacy mode.",
      plainDescription:
        "Handles the intake side of email processing. When the AI detects a new client inquiry with high confidence, this handler creates a new case or links to an existing one — and flags any attached documents for the Document Reviewer.",
      howItWorks: [
        "Receives the pre-classified inquiry result from the Conflict Resolver — including whether the action was flagged or suppressed.",
        "If confidence is ≥ 70% and no existing case match: creates a new case record with client details extracted from the email.",
        "If an existing case match is found (≥ 70% confidence): links the email to that case and updates the case timeline.",
        "If confidence is below 70%: records the inquiry as 'flagged' for consultant review.",
        "All results — new case, linked, flagged, or skipped — are saved to the database with full details.",
      ],
      roles: [
        "Detect new client inquiries from incoming emails",
        "Match inquiries to existing cases by client name, email, or reference",
        "Flag document attachments for downstream processing",
        "Record all intake results with confidence scores",
      ],
      aiModel: {
        name: "Claude Haiku / Sonnet",
        id: "Haiku (legacy) / Sonnet (unified)",
        maxTokens: 4096,
        operation: "classify (legacy) / classify_comprehensive (unified)",
      },
      confidenceThreshold: 0.7,
      thresholdExplanation:
        "The system only auto-creates or auto-links cases when it's at least 70% confident of the match. Below that threshold, inquiries are flagged for a consultant to verify — preventing incorrect case assignments.",
      inputs: [
        "Pre-classified inquiry result from Conflict Resolver",
        "Email content and parsed sender details",
        "Existing case records for matching",
      ],
      outputs: [
        "Case intake record (saved to database)",
        "New case created or linked to existing case",
        "Activity log entry",
      ],
      actions: [
        "Create new case",
        "Link to existing case",
        "Flag for consultant review",
        "Skip (not a client inquiry)",
      ],
      dbTables: ["case_inquiries"],
      whenRuns: "Real-time — processes each email as it arrives through the pipeline.",
      businessRules: [
        {
          rule: "Auto-intake requires ≥ 70% confidence AND no conflict flags",
          explanation:
            "Both conditions must be met. High confidence alone isn't enough if the email also matches an existing case — it's flagged so a consultant can decide whether to create a new case or link to the existing one.",
        },
        {
          rule: "Inquiry types recognized: new visa inquiry, document submission, case follow-up, general question",
          explanation:
            "The AI distinguishes between these communication types. Marketing emails, spam, and non-client correspondence are NOT classified as inquiries.",
        },
        {
          rule: "Excluded mailboxes are skipped",
          explanation:
            "Some mailboxes can be configured to skip intake processing entirely — useful for internal mailboxes that should never auto-create cases.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Visa Classifier (node ID: p1-handler kept for React Flow stability)
  {
    id: "p1-handler",
    type: "agentNode",
    position: { x: 340, y: 530 },
    data: {
      label: "Visa Classifier",
      type: "agent",
      color: "red",
      icon: "AlertTriangle",
      description:
        "Classifies visa type and stream from client communications. Identifies the applicable visa subclass, migration stream, and generates daily case summaries at 4pm.",
      plainDescription:
        "The visa identification engine. Every client inquiry gets a visa subclass and stream classification. The AI analyzes the client's situation — skills, sponsorship, family ties, study plans — to determine the most likely visa pathway and flag cases needing urgent attention (expiring visas, approaching deadlines).",
      howItWorks: [
        "Receives the pre-classified visa result from the Conflict Resolver.",
        "Creates a visa classification record with: visa subclass, stream (employer-sponsored, skilled independent, state-nominated, family, student, visitor), client details, and confidence reasoning.",
        "If the case involves an expiring visa or approaching deadline: flags it for urgent consultant attention.",
        "The Scheduler's Deadline Monitor (every 15 min) tracks all cases with upcoming lodgement or compliance deadlines.",
        "At 4pm daily, the Scheduler triggers a summary report of all visa classifications for the day.",
        "If the classification was flagged by the Conflict Resolver (low confidence), it's still recorded but marked for consultant verification.",
      ],
      roles: [
        "Identify visa subclass from client communications",
        "Determine migration stream (employer-sponsored, skilled independent, etc.)",
        "Extract client details and eligibility indicators",
        "Generate daily summary reports at 4pm",
        "Flag cases with approaching deadlines for urgent attention",
      ],
      aiModel: {
        name: "Claude Haiku / Sonnet",
        id: "Haiku (legacy) / Sonnet (unified)",
        maxTokens: 4096,
        operation: "classify (legacy) / summarize (Sonnet)",
      },
      inputs: [
        "Pre-classified visa result from Conflict Resolver",
        "Email subject, body, sender context",
        "Client details and existing case history",
      ],
      outputs: [
        "Visa classification record with subclass and stream",
        "Daily summary report (generated at 4pm)",
        "Deadline alerts for cases with approaching dates",
        "Activity log entry with classification details",
      ],
      actions: [
        "Create visa classification",
        "Assign visa subclass and stream",
        "Flag approaching deadlines",
        "Generate daily summary",
        "Escalate urgent cases",
      ],
      dbTables: ["visa_classifications", "daily_summaries"],
      whenRuns: "Real-time for classification. Deadline monitoring every 15 minutes. Daily summary at 4pm AEST.",
      businessRules: [
        {
          rule: "Visa subclass identification with stream detection",
          explanation:
            "Each inquiry is classified with a specific visa subclass (e.g., 189, 190, 482, 500) and a broader stream (employer-sponsored, skilled independent, state-nominated, family, student, visitor) to route to the correct workflow.",
        },
        {
          rule: "Streams: employer-sponsored, skilled independent, state-nominated, family, student, visitor",
          explanation:
            "Employer-sponsored: 482, 494, 186. Skilled independent: 189, 190, 491. Family: 820/801, 309/100. Student: 500. Visitor: 600. Each stream has its own checklist template and consultant workflow.",
        },
        {
          rule: "Categories: skills assessment, English proficiency, sponsorship, health & character, lodgement, general",
          explanation:
            "Each case is tagged with the primary category of work needed, helping consultants filter and prioritize their caseload.",
        },
        {
          rule: "Deadline monitor runs every 15 minutes",
          explanation:
            "The system proactively checks every 15 minutes for cases with approaching visa expiry dates, bridging visa deadlines, or lodgement windows so consultants get early warning.",
        },
      ],
      connectedTo: ["Database"],
    },
  },

  // Document Reviewer (node ID: emergent-handler kept for React Flow stability)
  {
    id: "emergent-handler",
    type: "agentNode",
    position: { x: 600, y: 530 },
    data: {
      label: "Document Reviewer",
      type: "agent",
      color: "amber",
      icon: "TrendingUp",
      description:
        "Performs OCR + AI validation of immigration documents attached to emails. Runs both on incoming emails and on a 2-hour scheduled scan for unprocessed submissions.",
      plainDescription:
        "Validates immigration documents that clients submit — passports, skills assessments, English test results, health checks, police clearances. It checks for expiry dates, score thresholds, name consistency, and form completeness to flag issues before lodgement.",
      howItWorks: [
        "On each incoming email: receives the document detection signal from the Unified Classifier — identifying what types of documents are attached.",
        "If documents are detected: extracts text via OCR, validates key fields (expiry dates, scores, names), and records findings with confidence scores.",
        "Every 2 hours: the Scheduler triggers a deeper batch scan that reviews full email threads for unprocessed or incomplete document submissions.",
        "The batch scan uses Claude Sonnet with full attachment content for thorough document validation.",
        "Findings include: document type, validation status (pass/fail/needs review), specific issues found (e.g., passport expiring within 6 months, IELTS score below threshold), and recommended action.",
      ],
      roles: [
        "Validate immigration documents via OCR + AI analysis",
        "Check passport expiry dates and validity periods",
        "Verify English test scores against visa requirements",
        "Detect name mismatches across documents",
        "Run deep document review scan on 2-hour schedule",
      ],
      aiModel: {
        name: "Claude Sonnet",
        id: "anthropic.claude-sonnet-4-20250514-v1:0",
        maxTokens: 4096,
        operation: "analyze",
      },
      confidenceThreshold: 0.6,
      thresholdExplanation:
        "Document validation uses a lower threshold (60%) than case matching because it's better to flag a potential document issue for consultant review than to miss it. False positives are less costly here — a consultant simply reviews and dismisses if irrelevant.",
      inputs: [
        "Pre-classified document signal from Conflict Resolver",
        "Email thread history (for batch scan)",
        "Document attachments (passports, test results, forms)",
      ],
      outputs: [
        "Document validation record with findings",
        "Periodic scan report (every 2 hours)",
        "Validation status (pass / fail / needs review)",
        "Recommended action (accept / request resubmission / flag for consultant)",
      ],
      actions: [
        "Validate document fields",
        "Generate batch review report",
        "Flag issues for consultant",
        "Check completeness against checklist",
      ],
      dbTables: ["document_reviews", "document_review_reports"],
      whenRuns: "Real-time document detection on each email. Deep document review scan every 2 hours via Scheduler.",
      businessRules: [
        {
          rule: "Two-tier validation: real-time detection + batch document review",
          explanation:
            "Individual emails get a quick document check. But complete submission validation often requires cross-referencing multiple documents — so the 2-hour batch scan reviews entire case submissions for completeness.",
        },
        {
          rule: "Document checks include: passport expiry (≥ 6 months), IELTS/PTE score thresholds, name matching across documents, form completeness",
          explanation:
            "The AI is trained on immigration document patterns — things like passport validity periods, minimum English test scores per visa subclass, and consistent name spelling across all documents.",
        },
        {
          rule: "NOT flagged: duplicate submissions of already-validated documents, general correspondence without attachments",
          explanation:
            "The AI is specifically told to exclude re-submissions of already-validated documents and non-document emails, reducing noise.",
        },
        {
          rule: "Each finding includes validation status and recommended action",
          explanation:
            "Not all document issues are equal. The AI categorizes each as pass, fail, or needs review, and suggests whether to accept, request resubmission, or escalate to the consultant.",
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
        "PostgreSQL database (asyncpg driver) storing all case records, visa classifications, document reviews, and audit logs. Managed via Alembic migrations.",
      plainDescription:
        "The permanent record of everything the system does. Every case inquiry, every visa classification, every document review, and every deadline alert is stored here — along with AI usage costs and a complete activity trail.",
      howItWorks: [
        "All three agent handlers write their results to the database after processing each email.",
        "Writes happen in parallel (all three agents commit at once) for speed.",
        "The database is queried by the frontend dashboard to show real-time stats, activity feeds, and reports.",
        "Schema changes are managed via Alembic migrations — the database auto-updates on each deployment.",
      ],
      roles: [
        "Persist all agent classification and review results",
        "Store daily summaries and periodic reports",
        "Track AI usage for cost monitoring",
        "Maintain agent activity audit trail",
        "Serve data to frontend dashboard",
      ],
      inputs: ["Classification and review records from all agents", "Reports from Scheduler jobs", "AI usage logs", "Activity entries"],
      outputs: ["Query results for dashboard, API, and reports"],
      dbTables: [
        "cases",
        "clients",
        "visa_classifications",
        "documents",
        "checklists",
        "document_reviews",
        "daily_summaries",
        "ai_usage_logs",
        "agent_activity_log",
      ],
      whenRuns: "Always available — receives writes from all agents in real-time and serves reads to the dashboard.",
      businessRules: [
        {
          rule: "9 tables covering all system data",
          explanation:
            "cases (client cases), clients (client profiles), visa_classifications (visa type assignments), documents (uploaded immigration documents), checklists (per-visa requirements), document_reviews (validation results), daily_summaries (4pm reports), ai_usage_logs (cost tracking), agent_activity_log (full audit trail).",
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
