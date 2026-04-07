import type { JourneyStageKey } from "@/lib/types/immigration";

export interface JourneyStageConfig {
  key: JourneyStageKey;
  step: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: string; // lucide icon name
  colorDot: string; // tailwind classes for the dot/circle
  colorBg: string; // tailwind classes for background highlights
  colorText: string; // tailwind classes for text
}

export const JOURNEY_STAGES: JourneyStageConfig[] = [
  {
    key: "inquiry",
    step: 1,
    label: "Inquiry Received",
    shortLabel: "Inquiry",
    description:
      "Client reached out via email, referral, or web form. Basic contact details captured and case file initiated.",
    icon: "inbox",
    colorDot: "bg-slate-500",
    colorBg: "bg-slate-100 dark:bg-slate-900/40",
    colorText: "text-slate-700 dark:text-slate-300",
  },
  {
    key: "consultation",
    step: 2,
    label: "Initial Consultation",
    shortLabel: "Consultation",
    description:
      "First meeting with the client to discuss immigration goals, background, eligibility, and potential visa pathways.",
    icon: "users",
    colorDot: "bg-blue-500",
    colorBg: "bg-blue-100 dark:bg-blue-900/40",
    colorText: "text-blue-700 dark:text-blue-300",
  },
  {
    key: "visa_pathway",
    step: 3,
    label: "Visa Pathway Confirmed",
    shortLabel: "Visa Pathway",
    description:
      "AI assessment and consultant review complete. Recommended visa subclass confirmed with the client. Eligibility criteria validated.",
    icon: "route",
    colorDot: "bg-indigo-500",
    colorBg: "bg-indigo-100 dark:bg-indigo-900/40",
    colorText: "text-indigo-700 dark:text-indigo-300",
  },
  {
    key: "checklist",
    step: 4,
    label: "Checklist & Requirements",
    shortLabel: "Checklist",
    description:
      "AI-generated document checklist tailored to the visa subclass. Sent to client with clear instructions on what to provide.",
    icon: "clipboard-list",
    colorDot: "bg-amber-500",
    colorBg: "bg-amber-100 dark:bg-amber-900/40",
    colorText: "text-amber-700 dark:text-amber-300",
  },
  {
    key: "document_collection",
    step: 5,
    label: "Document Collection",
    shortLabel: "Collecting",
    description:
      "Client is uploading required documents — passport, skills assessment, English test results, police checks, and more.",
    icon: "upload",
    colorDot: "bg-orange-500",
    colorBg: "bg-orange-100 dark:bg-orange-900/40",
    colorText: "text-orange-700 dark:text-orange-300",
  },
  {
    key: "document_review",
    step: 6,
    label: "Document Review & Validation",
    shortLabel: "Review",
    description:
      "AI validates each document for completeness, expiry dates, name consistency, and visa-specific requirements. Issues flagged for consultant review.",
    icon: "scan-search",
    colorDot: "bg-purple-500",
    colorBg: "bg-purple-100 dark:bg-purple-900/40",
    colorText: "text-purple-700 dark:text-purple-300",
  },
  {
    key: "application_prep",
    step: 7,
    label: "Application Preparation",
    shortLabel: "Preparation",
    description:
      "All documents validated. Consultant prepares the final application — forms, statements, cover letter, and declarations ready for submission.",
    icon: "file-check",
    colorDot: "bg-teal-500",
    colorBg: "bg-teal-100 dark:bg-teal-900/40",
    colorText: "text-teal-700 dark:text-teal-300",
  },
  {
    key: "lodgement",
    step: 8,
    label: "Application Lodged",
    shortLabel: "Lodged",
    description:
      "Visa application formally submitted to the Department of Home Affairs via ImmiAccount. Application reference number recorded.",
    icon: "send",
    colorDot: "bg-cyan-500",
    colorBg: "bg-cyan-100 dark:bg-cyan-900/40",
    colorText: "text-cyan-700 dark:text-cyan-300",
  },
  {
    key: "post_lodgement",
    step: 9,
    label: "Post-Lodgement Processing",
    shortLabel: "Processing",
    description:
      "Application is being processed by DHA. May include health examinations, biometrics, s56 requests for information, or additional police checks.",
    icon: "timer",
    colorDot: "bg-violet-500",
    colorBg: "bg-violet-100 dark:bg-violet-900/40",
    colorText: "text-violet-700 dark:text-violet-300",
  },
  {
    key: "decision",
    step: 10,
    label: "Decision & Outcome",
    shortLabel: "Decision",
    description:
      "Final decision received from DHA — visa granted, refused, or withdrawn. Grant letter issued or review/appeal options provided.",
    icon: "shield-check",
    colorDot: "bg-emerald-500",
    colorBg: "bg-emerald-100 dark:bg-emerald-900/40",
    colorText: "text-emerald-700 dark:text-emerald-300",
  },
];

export const JOURNEY_STAGE_MAP = Object.fromEntries(
  JOURNEY_STAGES.map((s) => [s.key, s])
) as Record<JourneyStageKey, JourneyStageConfig>;

export function getStageIndex(key: JourneyStageKey): number {
  return JOURNEY_STAGES.findIndex((s) => s.key === key);
}

export function getCompletionPercentage(currentStage: JourneyStageKey): number {
  const idx = getStageIndex(currentStage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / JOURNEY_STAGES.length) * 100);
}
