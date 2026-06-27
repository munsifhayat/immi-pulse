/**
 * Shared questionnaire templates for the consultant builder.
 *
 * Two kinds:
 *   1. Standard templates — flat field lists, no conditional logic. Best for
 *      consultants who just want to ship a sensible intake form quickly.
 *   2. Logic recipes — pre-wired with conditional rules (show/hide, urgent
 *      flags, etc.). Only surfaced in Advanced mode in the builder.
 *
 * Note: first name, last name, email, and phone are auto-collected on every
 * public form, so templates focus on audience-specific questions only.
 */

import type { QuestionField } from "@/lib/api/services";
import {
  Globe2,
  UserRound,
  Building2,
  PlaneLanding,
  PlaneTakeoff,
  FileText,
  GraduationCap,
  Heart,
  Users,
  AlertTriangle,
  Briefcase,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type TemplateId =
  | "general"
  | "individual"
  | "employer"
  | "onshore"
  | "offshore"
  | "student"
  | "partner"
  | "family"
  | "blank"
  // Logic recipes (Advanced mode)
  | "recipe_482"
  | "recipe_skilled"
  | "recipe_unlawful";

export type TemplateKind = "standard" | "recipe";

export interface QuestionnaireTemplate {
  id: TemplateId;
  kind: TemplateKind;
  audience: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  accent: "purple" | "teal" | "amber" | "rose" | "indigo" | "slate";
  fields: QuestionField[];
  /** Rough time-to-publish estimate, shown on the picker card. */
  estimatedMinutes?: number;
  /** Logic recipes have a count of branches surfaced on the card. */
  branchCount?: number;
}

export const TEMPLATES: QuestionnaireTemplate[] = [
  /* ───────────────  Standard templates  ─────────────── */
  {
    id: "general",
    kind: "standard",
    audience: "general",
    name: "General intake",
    shortName: "General",
    description:
      "Lightweight first-touch form for any new enquiry. Use it as your default contact form.",
    icon: Globe2,
    accent: "purple",
    estimatedMinutes: 1,
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
    kind: "standard",
    audience: "individual",
    name: "Individual applicant",
    shortName: "Individual",
    description:
      "For people exploring their own pathway — skilled, partner, student, or working holiday.",
    icon: UserRound,
    accent: "indigo",
    estimatedMinutes: 2,
    fields: [
      { key: "dob", label: "Date of birth", type: "date", required: true, placeholder: null, helper_text: null, options: null },
      { key: "nationality", label: "Country of citizenship", type: "short_text", required: true, placeholder: "e.g. India, Philippines, United Kingdom", helper_text: null, options: null },
      { key: "current_country", label: "Country you're currently in", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "current_visa", label: "Current Australian visa or status (if any)", type: "short_text", required: false, placeholder: "e.g. 500 student, 482 TSS, none", helper_text: null, options: null },
      {
        key: "highest_qualification",
        label: "Highest qualification completed",
        type: "single_select",
        required: true,
        options: ["High school", "Diploma / Certificate", "Bachelor's degree", "Master's degree", "PhD", "Other"],
        placeholder: null,
        helper_text: null,
      },
      { key: "occupation", label: "Current occupation", type: "short_text", required: false, placeholder: "e.g. Registered Nurse, Software Engineer", helper_text: null, options: null },
      {
        key: "english_proficiency",
        label: "English proficiency",
        type: "single_select",
        required: true,
        options: ["Native speaker", "IELTS / PTE results available", "Studying for test", "Not yet tested"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: ["Skilled (189 / 190 / 491)", "Partner", "Student", "Working Holiday (417 / 462)", "Employer-sponsored (482 / 186)", "Business / Investor", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Family situation, prior refusals, deadlines, current employer…", helper_text: null, options: null },
    ],
  },
  {
    id: "employer",
    kind: "standard",
    audience: "employer",
    name: "Employer sponsorship",
    shortName: "Employer",
    description:
      "For Australian businesses sponsoring overseas talent — 482, 186, 494, or DAMA pathways.",
    icon: Building2,
    accent: "teal",
    estimatedMinutes: 3,
    fields: [
      { key: "company_name", label: "Company name", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "your_role", label: "Your role at the company", type: "short_text", required: true, placeholder: "e.g. Director, HR Manager, CFO", helper_text: null, options: null },
      { key: "abn", label: "ABN", type: "short_text", required: false, placeholder: "e.g. 12 345 678 901", helper_text: null, options: null },
      { key: "industry", label: "Industry", type: "short_text", required: false, placeholder: "e.g. Construction, Hospitality, Tech", helper_text: null, options: null },
      {
        key: "sbs_status",
        label: "Are you a Standard Business Sponsor?",
        type: "single_select",
        required: true,
        options: ["Yes — current sponsorship", "Yes — expired", "No — need to apply", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      { key: "positions_count", label: "How many positions do you want to sponsor?", type: "number", required: true, placeholder: "e.g. 1, 5, 12", helper_text: null, options: null },
      { key: "occupations", label: "Which occupations do you want to sponsor?", type: "long_text", required: true, placeholder: "e.g. Software Engineer (ANZSCO 261313), Chef (351311), Civil Engineer", helper_text: "Include ANZSCO codes if you know them.", options: null },
      { key: "candidate_identified", label: "Is the candidate already identified?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "candidate_location", label: "Where is the candidate located?", type: "short_text", required: false, placeholder: "Country / city", helper_text: null, options: null },
      { key: "start_date", label: "Desired start date", type: "date", required: false, placeholder: null, helper_text: null, options: null },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Labour market testing done, prior nominations, urgency, dependants…", helper_text: null, options: null },
    ],
  },
  {
    id: "onshore",
    kind: "standard",
    audience: "onshore",
    name: "Onshore applicant",
    shortName: "Onshore",
    description:
      "For applicants already in Australia. Captures expiry, prior visas, and refusals up front.",
    icon: PlaneLanding,
    accent: "amber",
    estimatedMinutes: 2,
    fields: [
      { key: "current_visa", label: "Current visa subclass", type: "short_text", required: true, placeholder: "e.g. 500, 482, 408, bridging", helper_text: null, options: null },
      { key: "visa_expiry", label: "Current visa expiry date", type: "date", required: true, placeholder: null, helper_text: null, options: null },
      { key: "arrived_date", label: "When did you arrive in Australia?", type: "date", required: false, placeholder: null, helper_text: null, options: null },
      { key: "prior_visas", label: "Other Australian visas you've held", type: "long_text", required: false, placeholder: "e.g. 600, 500, 485 — list briefly", helper_text: null, options: null },
      { key: "prior_refusal", label: "Have you had a visa refused or cancelled?", type: "yes_no", required: true, placeholder: null, helper_text: "Be honest — it changes which pathways are open.", options: null },
      {
        key: "urgency",
        label: "How urgent is your situation?",
        type: "single_select",
        required: true,
        options: ["Urgent — visa expiring soon", "Important — within 3 months", "Standard — planning ahead", "Just exploring"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: ["Bridging visa", "Student", "Skilled (189 / 190 / 491)", "Partner", "Employer-sponsored (482 / 186 / 494)", "Permanent residency", "Citizenship", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Dependants on your visa, change of circumstances, deadlines…", helper_text: null, options: null },
    ],
  },
  {
    id: "offshore",
    kind: "standard",
    audience: "offshore",
    name: "Offshore applicant",
    shortName: "Offshore",
    description:
      "For applicants outside Australia exploring a move — skilled, student, or working holiday.",
    icon: PlaneTakeoff,
    accent: "rose",
    estimatedMinutes: 2,
    fields: [
      { key: "current_country", label: "Country you're currently in", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "nationality", label: "Country of citizenship", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "prior_aus_visa", label: "Have you previously held an Australian visa?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "prior_refusal", label: "Have you had a visa refused or cancelled (any country)?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      {
        key: "highest_qualification",
        label: "Highest qualification completed",
        type: "single_select",
        required: true,
        options: ["High school", "Diploma / Certificate", "Bachelor's degree", "Master's degree", "PhD", "Other"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "english_proficiency",
        label: "English proficiency",
        type: "single_select",
        required: true,
        options: ["Native speaker", "IELTS / PTE results available", "Studying for test", "Not yet tested"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_pathways",
        label: "Visa pathway(s) you're considering",
        type: "multi_select",
        required: false,
        options: ["Skilled (189 / 190 / 491)", "Student", "Employer-sponsored (482 / 186)", "Partner", "Working Holiday (417 / 462)", "Visitor (600)", "Business / Investor", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      { key: "timeline", label: "When are you hoping to migrate by?", type: "single_select", required: false, options: ["ASAP", "Within 3 months", "3–6 months", "6+ months", "Just exploring"], placeholder: null, helper_text: null },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Family situation, prior refusals, deadlines, occupation in demand…", helper_text: null, options: null },
    ],
  },
  {
    id: "student",
    kind: "standard",
    audience: "individual",
    name: "Student visa",
    shortName: "Student",
    description:
      "Genuine student criteria, course of study, financial capacity, and English requirements.",
    icon: GraduationCap,
    accent: "indigo",
    estimatedMinutes: 2,
    fields: [
      { key: "nationality", label: "Country of citizenship", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "current_country", label: "Country you're currently in", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "course_of_interest", label: "Course or field of study", type: "short_text", required: true, placeholder: "e.g. Master of IT, Bachelor of Nursing", helper_text: null, options: null },
      {
        key: "level_of_study",
        label: "Level of study",
        type: "single_select",
        required: true,
        options: ["ELICOS / English course", "VET / Certificate / Diploma", "Bachelor's", "Master's", "PhD"],
        placeholder: null,
        helper_text: null,
      },
      { key: "institution_chosen", label: "Have you chosen an institution?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "institution_name", label: "Institution name", type: "short_text", required: false, placeholder: "e.g. UNSW, Monash, RMIT", helper_text: null, options: null },
      {
        key: "english_test",
        label: "Latest English test result",
        type: "single_select",
        required: true,
        options: ["IELTS 6.5+", "IELTS 5.5–6.0", "Below 5.5", "Native English", "Not yet tested"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "financial_capacity",
        label: "Funds available for tuition + living",
        type: "single_select",
        required: true,
        options: ["AUD 30,000+", "AUD 20,000–30,000", "AUD 10,000–20,000", "Less than AUD 10,000", "Scholarship / sponsor"],
        placeholder: null,
        helper_text: null,
      },
      { key: "intends_pr", label: "Are you also considering PR pathways after study?", type: "yes_no", required: false, placeholder: null, helper_text: null, options: null },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Family on the visa, deadlines, prior refusals…", helper_text: null, options: null },
    ],
  },
  {
    id: "partner",
    kind: "standard",
    audience: "individual",
    name: "Partner visa",
    shortName: "Partner",
    description:
      "Captures the relationship pillars: financial, social, household, and commitment evidence.",
    icon: Heart,
    accent: "rose",
    estimatedMinutes: 3,
    fields: [
      {
        key: "relationship_type",
        label: "Relationship type",
        type: "single_select",
        required: true,
        options: ["Married", "De facto (12+ months)", "De facto (less than 12 months)", "Engaged (prospective marriage)"],
        placeholder: null,
        helper_text: null,
      },
      { key: "relationship_start", label: "When did the relationship begin?", type: "date", required: true, placeholder: null, helper_text: null, options: null },
      { key: "cohabitation_start", label: "When did you start living together?", type: "date", required: false, placeholder: null, helper_text: null, options: null },
      {
        key: "sponsor_status",
        label: "Sponsor's current status",
        type: "single_select",
        required: true,
        options: ["Australian citizen", "Permanent resident", "Eligible NZ citizen"],
        placeholder: null,
        helper_text: null,
      },
      { key: "applicant_location", label: "Where is the applicant currently?", type: "short_text", required: true, placeholder: "Onshore / Offshore + country", helper_text: null, options: null },
      { key: "previous_marriage", label: "Has either partner been previously married?", type: "yes_no", required: true, placeholder: null, helper_text: "Includes both partners.", options: null },
      { key: "children", label: "Are there children of the relationship?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "prior_refusal", label: "Any prior visa refusals or cancellations?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "evidence_strength", label: "How much relationship evidence do you have ready?", type: "single_select", required: false, options: ["Lots — joint bank, lease, photos", "Some", "Very little", "Not sure what counts"], placeholder: null, helper_text: null },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Joint finances, household details, urgency, prior visa history…", helper_text: null, options: null },
    ],
  },
  {
    id: "family",
    kind: "standard",
    audience: "individual",
    name: "Family stream",
    shortName: "Family",
    description:
      "Parent, child, remaining relative, carer — for family-based sponsorship enquiries.",
    icon: Users,
    accent: "amber",
    estimatedMinutes: 2,
    fields: [
      {
        key: "relationship_to_sponsor",
        label: "Relationship to the Australian sponsor",
        type: "single_select",
        required: true,
        options: ["Parent", "Child / Adopted child", "Carer", "Remaining relative", "Aged dependent relative", "Orphan relative"],
        placeholder: null,
        helper_text: null,
      },
      { key: "sponsor_status", label: "Sponsor's current status", type: "single_select", required: true, options: ["Australian citizen", "Permanent resident", "Eligible NZ citizen"], placeholder: null, helper_text: null },
      { key: "applicant_age", label: "Applicant's age", type: "number", required: true, placeholder: null, helper_text: null, options: null },
      { key: "applicant_country", label: "Country applicant currently lives in", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      {
        key: "balance_of_family",
        label: "(Parent visa only) Do you meet the balance-of-family test?",
        type: "single_select",
        required: false,
        options: ["Yes", "No", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      { key: "prior_refusal", label: "Any prior visa refusals or cancellations?", type: "yes_no", required: true, placeholder: null, helper_text: null, options: null },
      { key: "urgency", label: "How urgent is this?", type: "single_select", required: false, options: ["Critical (health/age)", "Important", "Standard"], placeholder: null, helper_text: null },
      { key: "notes", label: "Anything else we should know?", type: "long_text", required: false, placeholder: "Health concerns, financial situation, other family members on the visa…", helper_text: null, options: null },
    ],
  },

  /* ───────────────  Logic recipes (Advanced mode)  ─────────────── */
  {
    id: "recipe_482",
    kind: "recipe",
    audience: "employer",
    name: "482 Employer Sponsorship",
    shortName: "482 Recipe",
    description:
      "Routes the form by candidate vs employer perspective and surfaces sponsorship-specific follow-ups only when relevant.",
    icon: Briefcase,
    accent: "teal",
    estimatedMinutes: 3,
    branchCount: 4,
    fields: [
      {
        key: "filling_as",
        label: "Are you the employer or the candidate?",
        type: "single_select",
        required: true,
        options: ["Employer", "Candidate (employee)"],
        placeholder: null,
        helper_text: null,
      },
      // Employer branch
      {
        key: "company_name",
        label: "Company name",
        type: "short_text",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "filling_as", operator: "equals", value: "Employer" }] },
          required_if: [{ field_key: "filling_as", operator: "equals", value: "Employer" }],
        },
      },
      {
        key: "sbs_status",
        label: "Are you a Standard Business Sponsor?",
        type: "single_select",
        required: false,
        options: ["Yes — current", "Yes — expired", "No — need to apply", "Not sure"],
        placeholder: null,
        helper_text: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "filling_as", operator: "equals", value: "Employer" }] },
          required_if: [{ field_key: "filling_as", operator: "equals", value: "Employer" }],
        },
      },
      // Candidate branch
      {
        key: "current_visa",
        label: "Your current visa",
        type: "short_text",
        required: false,
        placeholder: "e.g. 482, 500, bridging",
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "filling_as", operator: "equals", value: "Candidate (employee)" }] },
          required_if: [{ field_key: "filling_as", operator: "equals", value: "Candidate (employee)" }],
        },
      },
      {
        key: "visa_expiry",
        label: "Your visa expiry date",
        type: "date",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "filling_as", operator: "equals", value: "Candidate (employee)" }] },
        },
      },
      // Shared
      {
        key: "anzsco_code",
        label: "Occupation (with ANZSCO code if known)",
        type: "short_text",
        required: true,
        placeholder: "e.g. 261313 Software Engineer",
        helper_text: null,
        options: null,
      },
      {
        key: "is_186_pathway",
        label: "Is this a pathway to 186 PR?",
        type: "yes_no",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "186_target_stream",
        label: "Which 186 stream?",
        type: "single_select",
        required: false,
        options: ["Temporary Residence Transition", "Direct Entry", "Not sure"],
        placeholder: null,
        helper_text: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "is_186_pathway", operator: "equals", value: "yes" }] },
        },
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder: "LMT done, urgency, dependants, family on the visa…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "recipe_skilled",
    kind: "recipe",
    audience: "individual",
    name: "Skilled Migration Eligibility",
    shortName: "Skilled Recipe",
    description:
      "Walks an applicant through 189 / 190 / 491 eligibility, branching on visa interest and adding state nomination questions only when needed.",
    icon: MapPin,
    accent: "indigo",
    estimatedMinutes: 4,
    branchCount: 5,
    fields: [
      { key: "dob", label: "Date of birth", type: "date", required: true, placeholder: null, helper_text: null, options: null },
      { key: "nationality", label: "Country of citizenship", type: "short_text", required: true, placeholder: null, helper_text: null, options: null },
      { key: "occupation", label: "Nominated occupation (ANZSCO if known)", type: "short_text", required: true, placeholder: "e.g. 261313 Software Engineer", helper_text: null, options: null },
      {
        key: "years_experience",
        label: "Years of post-qualification experience",
        type: "single_select",
        required: true,
        options: ["0–2", "3–4", "5–7", "8+"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "english_score",
        label: "English ability",
        type: "single_select",
        required: true,
        options: ["Superior (IELTS 8+)", "Proficient (IELTS 7+)", "Competent (IELTS 6+)", "Not yet tested"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "visa_interest",
        label: "Which skilled visa(s) interest you?",
        type: "multi_select",
        required: true,
        options: ["189 (Independent)", "190 (State-nominated PR)", "491 (Regional)", "Not sure"],
        placeholder: null,
        helper_text: null,
      },
      // 190 branch
      {
        key: "state_nomination_target",
        label: "Which state would you like nomination from?",
        type: "single_select",
        required: false,
        options: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT", "Open to any"],
        placeholder: null,
        helper_text: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "visa_interest", operator: "contains", value: "190 (State-nominated PR)" }] },
          required_if: [{ field_key: "visa_interest", operator: "contains", value: "190 (State-nominated PR)" }],
        },
      },
      // 491 branch
      {
        key: "willing_regional",
        label: "Are you willing to live in a designated regional area for 3+ years?",
        type: "yes_no",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "visa_interest", operator: "contains", value: "491 (Regional)" }] },
          required_if: [{ field_key: "visa_interest", operator: "contains", value: "491 (Regional)" }],
        },
      },
      // 189 branch
      {
        key: "eoi_submitted",
        label: "Have you submitted an Expression of Interest (EOI)?",
        type: "yes_no",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "visa_interest", operator: "contains", value: "189 (Independent)" }] },
        },
      },
      {
        key: "eoi_date",
        label: "EOI submitted on",
        type: "date",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "eoi_submitted", operator: "equals", value: "yes" }] },
        },
      },
      {
        key: "skills_assessment",
        label: "Do you have a positive skills assessment?",
        type: "single_select",
        required: true,
        options: ["Yes", "In progress", "Not yet started", "Don't know what this is"],
        placeholder: null,
        helper_text: null,
      },
      {
        key: "notes",
        label: "Anything else we should know?",
        type: "long_text",
        required: false,
        placeholder: "Dependants, age waivers, prior refusals…",
        helper_text: null,
        options: null,
      },
    ],
  },
  {
    id: "recipe_unlawful",
    kind: "recipe",
    audience: "onshore",
    name: "Bridging / Unlawful Triage",
    shortName: "Unlawful Recipe",
    description:
      "Fast triage for clients without a valid visa. Auto-flags as URGENT and surfaces detention/refusal history conditionally.",
    icon: AlertTriangle,
    accent: "rose",
    estimatedMinutes: 2,
    branchCount: 3,
    fields: [
      {
        key: "current_status",
        label: "Your current status in Australia",
        type: "single_select",
        required: true,
        options: ["Bridging visa", "Unlawful (no visa)", "Visa expiring within 7 days", "Visa expiring within 30 days", "Other"],
        placeholder: null,
        helper_text: "Be honest — we'll keep this confidential and it's the only way to find the right pathway.",
      },
      {
        key: "urgent_flag_note",
        label: "Urgent: tell us briefly what happened",
        type: "long_text",
        required: false,
        placeholder: "e.g. visa expired while I was overseas, application not lodged in time, etc.",
        helper_text: null,
        options: null,
        logic: {
          visibility: {
            mode: "show_if",
            rules: [{ field_key: "current_status", operator: "is_one_of", value: ["Unlawful (no visa)", "Visa expiring within 7 days"] }],
          },
          required_if: [{ field_key: "current_status", operator: "is_one_of", value: ["Unlawful (no visa)", "Visa expiring within 7 days"] }],
        },
        flags: ["urgent"],
      },
      {
        key: "last_visa_expiry",
        label: "When did your last substantive visa expire?",
        type: "date",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "current_status", operator: "equals", value: "Unlawful (no visa)" }] },
          required_if: [{ field_key: "current_status", operator: "equals", value: "Unlawful (no visa)" }],
        },
      },
      {
        key: "ever_detained",
        label: "Have you ever been in immigration detention?",
        type: "yes_no",
        required: false,
        placeholder: null,
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "current_status", operator: "is_one_of", value: ["Unlawful (no visa)", "Bridging visa"] }] },
        },
      },
      {
        key: "prior_refusal",
        label: "Have you had a visa refused or cancelled?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "refusal_details",
        label: "What was the refusal/cancellation reason?",
        type: "long_text",
        required: false,
        placeholder: "Brief summary if you remember",
        helper_text: null,
        options: null,
        logic: {
          visibility: { mode: "show_if", rules: [{ field_key: "prior_refusal", operator: "equals", value: "yes" }] },
        },
      },
      {
        key: "dependants_in_aus",
        label: "Are there family members in Australia who depend on you?",
        type: "yes_no",
        required: true,
        placeholder: null,
        helper_text: null,
        options: null,
      },
      {
        key: "notes",
        label: "Anything else we need to know right now?",
        type: "long_text",
        required: false,
        placeholder: "Health, work, court matters, anything time-sensitive.",
        helper_text: null,
        options: null,
      },
    ],
  },

  /* ───────────────  Blank  ─────────────── */
  {
    id: "blank",
    kind: "standard",
    audience: "general",
    name: "Start from blank",
    shortName: "Blank",
    description: "An empty form. Build every question from scratch your way.",
    icon: FileText,
    accent: "slate",
    estimatedMinutes: undefined,
    fields: [],
  },
];

export const getTemplate = (id: TemplateId): QuestionnaireTemplate =>
  TEMPLATES.find((t) => t.id === id) ??
  TEMPLATES[TEMPLATES.length - 1]!;

export const STANDARD_TEMPLATES = TEMPLATES.filter(
  (t) => t.kind === "standard" && t.id !== "blank",
);
export const RECIPE_TEMPLATES = TEMPLATES.filter((t) => t.kind === "recipe");
export const BLANK_TEMPLATE = TEMPLATES.find((t) => t.id === "blank")!;

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
