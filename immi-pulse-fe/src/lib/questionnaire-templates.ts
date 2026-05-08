/**
 * Shared questionnaire templates for the consultant builder.
 *
 * Each template seeds a sensible default field set per audience. Consultants
 * pick one as a starting point, then customize. Stable `key` values are
 * provided so renaming labels doesn't break downstream answer mapping.
 *
 * Note: full name, email, and phone are auto-collected on every public form,
 * so templates focus on audience-specific questions only.
 */

import type { QuestionField } from "@/lib/api/services";
import {
  Globe2,
  UserRound,
  Building2,
  PlaneLanding,
  PlaneTakeoff,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type TemplateId =
  | "general"
  | "individual"
  | "employer"
  | "onshore"
  | "offshore"
  | "blank";

export interface QuestionnaireTemplate {
  id: TemplateId;
  audience: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  accent: "purple" | "teal" | "amber" | "rose" | "indigo" | "slate";
  fields: QuestionField[];
}

export const TEMPLATES: QuestionnaireTemplate[] = [
  {
    id: "general",
    audience: "general",
    name: "General intake",
    shortName: "General",
    description:
      "Lightweight first-touch form for any new enquiry. Use it as your default contact form.",
    icon: Globe2,
    accent: "purple",
    fields: [
      {
        key: "visa_situation",
        label: "What is your current visa situation?",
        type: "long_text",
        required: true,
        placeholder:
          "e.g. studying in Australia on a 500 visa, expires next year",
        helper_text: null,
        options: null,
      },
      {
        key: "visa_interest",
        label: "Which Australian visa are you interested in?",
        type: "short_text",
        required: false,
        placeholder: "e.g. 482, 189, partner visa, not sure yet",
        helper_text: "Leave blank if you're unsure — that's why we're here.",
        options: null,
      },
      {
        key: "current_country",
        label: "Which country are you currently in?",
        type: "short_text",
        required: false,
        placeholder: "Country of residence",
        helper_text: null,
        options: null,
      },
      {
        key: "timeline",
        label: "When are you hoping to start the process?",
        type: "single_select",
        required: false,
        options: [
          "ASAP",
          "Within 3 months",
          "3–6 months",
          "6+ months",
          "Just exploring",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder:
          "Family on the visa, prior refusals, dependants, deadlines…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "individual",
    audience: "individual",
    name: "Individual applicant",
    shortName: "Individual",
    description:
      "For people exploring their own pathway — skilled, partner, student, or working holiday.",
    icon: UserRound,
    accent: "indigo",
    fields: [
      {
        key: "dob",
        label: "Date of birth",
        type: "date",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "nationality",
        label: "Country of citizenship",
        type: "short_text",
        required: true,
        placeholder: "e.g. India, Philippines, United Kingdom",
        helper_text: null,
        options: null,
      },
      {
        key: "current_country",
        label: "Country you're currently in",
        type: "short_text",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "current_visa",
        label: "Current Australian visa or status (if any)",
        type: "short_text",
        required: false,
        placeholder: "e.g. 500 student, 482 TSS, none",
        helper_text: null,
        options: null,
      },
      {
        key: "highest_qualification",
        label: "Highest qualification completed",
        type: "single_select",
        required: true,
        options: [
          "High school",
          "Diploma / Certificate",
          "Bachelor's degree",
          "Master's degree",
          "PhD",
          "Other",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "occupation",
        label: "Current occupation",
        type: "short_text",
        required: false,
        placeholder: "e.g. Registered Nurse, Software Engineer",
        helper_text: null,
        options: null,
      },
      {
        key: "english_proficiency",
        label: "English proficiency",
        type: "single_select",
        required: true,
        options: [
          "Native speaker",
          "IELTS / PTE results available",
          "Studying for test",
          "Not yet tested",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: [
          "Skilled (189 / 190 / 491)",
          "Partner",
          "Student",
          "Working Holiday (417 / 462)",
          "Employer-sponsored (482 / 186)",
          "Business / Investor",
          "Not sure",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder:
          "Family situation, prior refusals, deadlines, current employer…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "employer",
    audience: "employer",
    name: "Employer sponsorship",
    shortName: "Employer",
    description:
      "For Australian businesses sponsoring overseas talent — 482, 186, 494, or DAMA pathways.",
    icon: Building2,
    accent: "teal",
    fields: [
      {
        key: "company_name",
        label: "Company name",
        type: "short_text",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "your_role",
        label: "Your role at the company",
        type: "short_text",
        required: true,
        placeholder: "e.g. Director, HR Manager, CFO",
        helper_text: null,
        options: null,
      },
      {
        key: "abn",
        label: "ABN",
        type: "short_text",
        required: false,
        placeholder: "e.g. 12 345 678 901",
        helper_text: null,
        options: null,
      },
      {
        key: "industry",
        label: "Industry",
        type: "short_text",
        required: false,
        placeholder: "e.g. Construction, Hospitality, Tech",
        helper_text: null,
        options: null,
      },
      {
        key: "sbs_status",
        label: "Are you a Standard Business Sponsor?",
        type: "single_select",
        required: true,
        options: [
          "Yes — current sponsorship",
          "Yes — expired",
          "No — need to apply",
          "Not sure",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "positions_count",
        label: "How many positions do you want to sponsor?",
        type: "number",
        required: true,
        placeholder: "e.g. 1, 5, 12",
        helper_text: null,
        options: null,
      },
      {
        key: "occupations",
        label: "Which occupations do you want to sponsor?",
        type: "long_text",
        required: true,
        placeholder:
          "e.g. Software Engineer (ANZSCO 261313), Chef (351311), Civil Engineer",
        helper_text: "Include ANZSCO codes if you know them.",
        options: null,
      },
      {
        key: "candidate_identified",
        label: "Is the candidate already identified?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "candidate_location",
        label: "Where is the candidate located?",
        type: "short_text",
        required: false,
        placeholder: "Country / city",
        helper_text: null,
        options: null,
      },
      {
        key: "start_date",
        label: "Desired start date",
        type: "date",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder:
          "Labour market testing done, prior nominations, urgency, dependants…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "onshore",
    audience: "onshore",
    name: "Onshore applicant",
    shortName: "Onshore",
    description:
      "For applicants already in Australia. Captures expiry, prior visas, and refusals up front.",
    icon: PlaneLanding,
    accent: "amber",
    fields: [
      {
        key: "current_visa",
        label: "Current visa subclass",
        type: "short_text",
        required: true,
        placeholder: "e.g. 500, 482, 408, bridging",
        helper_text: null,
        options: null,
      },
      {
        key: "visa_expiry",
        label: "Current visa expiry date",
        type: "date",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "arrived_date",
        label: "When did you arrive in Australia?",
        type: "date",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "prior_visas",
        label: "Other Australian visas you've held",
        type: "long_text",
        required: false,
        placeholder: "e.g. 600, 500, 485 — list briefly",
        helper_text: null,
        options: null,
      },
      {
        key: "prior_refusal",
        label: "Have you had a visa refused or cancelled?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: "Be honest — it changes which pathways are open.",
        options: null,
      },
      {
        key: "urgency",
        label: "How urgent is your situation?",
        type: "single_select",
        required: true,
        options: [
          "Urgent — visa expiring soon",
          "Important — within 3 months",
          "Standard — planning ahead",
          "Just exploring",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: [
          "Bridging visa",
          "Student",
          "Skilled (189 / 190 / 491)",
          "Partner",
          "Employer-sponsored (482 / 186 / 494)",
          "Permanent residency",
          "Citizenship",
          "Not sure",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder:
          "Dependants on your visa, change of circumstances, deadlines…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "offshore",
    audience: "offshore",
    name: "Offshore applicant",
    shortName: "Offshore",
    description:
      "For applicants outside Australia exploring a move — skilled, student, or working holiday.",
    icon: PlaneTakeoff,
    accent: "rose",
    fields: [
      {
        key: "current_country",
        label: "Country you're currently in",
        type: "short_text",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "nationality",
        label: "Country of citizenship",
        type: "short_text",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "prior_aus_visa",
        label: "Have you previously held an Australian visa?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "prior_refusal",
        label: "Have you had a visa refused or cancelled (any country)?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "highest_qualification",
        label: "Highest qualification completed",
        type: "single_select",
        required: true,
        options: [
          "High school",
          "Diploma / Certificate",
          "Bachelor's degree",
          "Master's degree",
          "PhD",
          "Other",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "english_proficiency",
        label: "English proficiency",
        type: "single_select",
        required: true,
        options: [
          "Native speaker",
          "IELTS / PTE results available",
          "Studying for test",
          "Not yet tested",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: [
          "Skilled (189 / 190 / 491)",
          "Student",
          "Employer-sponsored (482 / 186)",
          "Partner",
          "Working Holiday (417 / 462)",
          "Visitor (600)",
          "Business / Investor",
          "Not sure",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "timeline",
        label: "When are you hoping to migrate by?",
        type: "single_select",
        required: false,
        options: [
          "ASAP",
          "Within 3 months",
          "3–6 months",
          "6+ months",
          "Just exploring",
        ],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder:
          "Family situation, prior refusals, deadlines, occupation in demand…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "blank",
    audience: "general",
    name: "Start from blank",
    shortName: "Blank",
    description: "An empty form. Build every question from scratch your way.",
    icon: FileText,
    accent: "slate",
    fields: [],
  },
];

export const getTemplate = (id: TemplateId): QuestionnaireTemplate =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];

export const ACCENT_CLASSES: Record<
  QuestionnaireTemplate["accent"],
  { iconBg: string; iconFg: string; ring: string; chip: string }
> = {
  purple: {
    iconBg: "bg-[#F2EEFF]",
    iconFg: "text-[#5B3ADB]",
    ring: "hover:border-[#7C5CFC]/50 hover:shadow-[0_18px_40px_-22px_rgba(124,92,252,0.5)]",
    chip: "bg-[#F2EEFF] text-[#5B3ADB]",
  },
  indigo: {
    iconBg: "bg-[#EEF0FF]",
    iconFg: "text-[#4338CA]",
    ring: "hover:border-[#6366F1]/50 hover:shadow-[0_18px_40px_-22px_rgba(99,102,241,0.45)]",
    chip: "bg-[#EEF0FF] text-[#4338CA]",
  },
  teal: {
    iconBg: "bg-[#E5F6F2]",
    iconFg: "text-[#0F766E]",
    ring: "hover:border-[#1B7B6F]/50 hover:shadow-[0_18px_40px_-22px_rgba(27,123,111,0.4)]",
    chip: "bg-[#E5F6F2] text-[#0F766E]",
  },
  amber: {
    iconBg: "bg-[#FEF4E2]",
    iconFg: "text-[#B45309]",
    ring: "hover:border-[#F59E0B]/50 hover:shadow-[0_18px_40px_-22px_rgba(245,158,11,0.4)]",
    chip: "bg-[#FEF4E2] text-[#B45309]",
  },
  rose: {
    iconBg: "bg-[#FFEEF2]",
    iconFg: "text-[#BE123C]",
    ring: "hover:border-[#F43F5E]/50 hover:shadow-[0_18px_40px_-22px_rgba(244,63,94,0.4)]",
    chip: "bg-[#FFEEF2] text-[#BE123C]",
  },
  slate: {
    iconBg: "bg-muted",
    iconFg: "text-muted-foreground",
    ring: "hover:border-foreground/30 hover:shadow-[0_18px_40px_-22px_rgba(15,17,23,0.25)]",
    chip: "bg-muted text-muted-foreground",
  },
};
