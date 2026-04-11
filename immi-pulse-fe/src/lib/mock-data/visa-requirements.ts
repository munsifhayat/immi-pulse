// ── Visa-specific document requirements for Australian visa subclasses ──
// Used by the Checklist stage to generate requirements based on selected visa

import type { ChecklistRequirement, VisaRecommendation } from "@/lib/types/journey-wizard";

let _id = 0;
const makeId = () => `req_${++_id}`;

export interface VisaRequirementsConfig {
  subclass: string;
  name: string;
  category: "skilled" | "family" | "student" | "visitor";
  requirements: Omit<ChecklistRequirement, "id" | "status" | "notes" | "deadline">[];
}

export const VISA_REQUIREMENTS: Record<string, VisaRequirementsConfig> = {
  "482": {
    subclass: "482",
    name: "Temporary Skill Shortage",
    category: "skilled",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — all pages including blank pages", required: true },
      { category: "Identity", documentType: "Birth Certificate", description: "Certified copy of birth certificate", required: true },
      { category: "Identity", documentType: "Passport Photos", description: "Two recent passport-size photographs", required: true },
      { category: "Employment", documentType: "Nomination Approval", description: "Approved employer nomination (subclass 482)", required: true },
      { category: "Employment", documentType: "Employment Contract", description: "Signed employment contract or offer letter from sponsoring employer", required: true },
      { category: "Employment", documentType: "Resume/CV", description: "Current resume showing relevant work experience", required: true },
      { category: "Employment", documentType: "Employment References", description: "Reference letters from previous employers (min 2 years relevant experience)", required: true },
      { category: "Skills", documentType: "Skills Assessment", description: "Positive skills assessment from relevant assessing authority (if applicable)", required: false },
      { category: "Skills", documentType: "Qualifications", description: "Certified copies of degrees, diplomas, or trade certificates", required: true },
      { category: "English", documentType: "English Test Results", description: "IELTS (min 5.0 each band) or equivalent PTE/TOEFL/Cambridge scores", required: true },
      { category: "Health", documentType: "Health Examination", description: "Medical examination by Bupa Medical Visa Services panel physician", required: true },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance from each country lived in 12+ months in the last 10 years", required: true },
      { category: "Insurance", documentType: "Health Insurance", description: "Adequate health insurance arrangement for duration of stay", required: true },
    ],
  },
  "186": {
    subclass: "186",
    name: "Employer Nomination Scheme",
    category: "skilled",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — all pages", required: true },
      { category: "Identity", documentType: "Birth Certificate", description: "Certified copy of birth certificate", required: true },
      { category: "Identity", documentType: "Passport Photos", description: "Two recent passport-size photographs", required: true },
      { category: "Employment", documentType: "Nomination Approval", description: "Approved employer nomination (subclass 186)", required: true },
      { category: "Employment", documentType: "Employment Contract", description: "Permanent employment contract or offer from nominating employer", required: true },
      { category: "Employment", documentType: "Resume/CV", description: "Current resume showing at least 3 years relevant work experience", required: true },
      { category: "Employment", documentType: "Employment References", description: "Detailed reference letters confirming role, duties, and duration", required: true },
      { category: "Skills", documentType: "Skills Assessment", description: "Positive skills assessment from relevant assessing authority", required: true },
      { category: "Skills", documentType: "Qualifications", description: "Certified copies of degrees, diplomas, or trade certificates", required: true },
      { category: "English", documentType: "English Test Results", description: "IELTS (min 6.0 each band) or equivalent — Competent English", required: true },
      { category: "Health", documentType: "Health Examination", description: "Medical examination by Bupa panel physician", required: true },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance from each country lived in 12+ months in the last 10 years", required: true },
      { category: "Character", documentType: "AFP Check", description: "Australian Federal Police check (if currently in Australia)", required: false },
      { category: "Financial", documentType: "Payslips", description: "Recent payslips showing salary meets TSMIT threshold", required: true },
    ],
  },
  "189": {
    subclass: "189",
    name: "Skilled Independent",
    category: "skilled",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — all pages", required: true },
      { category: "Identity", documentType: "Birth Certificate", description: "Certified copy of birth certificate", required: true },
      { category: "Identity", documentType: "National ID", description: "National identity card (if applicable)", required: false },
      { category: "Skills", documentType: "Skills Assessment", description: "Positive skills assessment for nominated occupation on MLTSSL", required: true },
      { category: "Skills", documentType: "Qualifications", description: "Certified copies of all degrees, diplomas, and transcripts", required: true },
      { category: "Employment", documentType: "Employment References", description: "Statutory declarations or reference letters for all claimed work experience", required: true },
      { category: "Employment", documentType: "Resume/CV", description: "Detailed resume matching SkillSelect EOI claims", required: true },
      { category: "Employment", documentType: "Tax Records", description: "Tax returns or payment summaries to verify employment periods", required: false },
      { category: "English", documentType: "English Test Results", description: "IELTS (min 6.0 each band) or equivalent — Competent English (higher for points)", required: true },
      { category: "Points", documentType: "Age Evidence", description: "Passport or birth certificate proving age for points claim", required: true },
      { category: "Points", documentType: "Partner Skills", description: "Partner skills assessment and English test (if claiming partner points)", required: false },
      { category: "Health", documentType: "Health Examination", description: "Medical examination by Bupa panel physician", required: true },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance from each country lived in 12+ months in the last 10 years", required: true },
      { category: "EOI", documentType: "SkillSelect EOI", description: "Expression of Interest lodged in SkillSelect with valid invitation", required: true },
    ],
  },
  "500": {
    subclass: "500",
    name: "Student Visa",
    category: "student",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — all pages", required: true },
      { category: "Identity", documentType: "Birth Certificate", description: "Certified copy of birth certificate", required: true },
      { category: "Identity", documentType: "Passport Photos", description: "Two recent passport-size photographs", required: true },
      { category: "Enrolment", documentType: "CoE", description: "Confirmation of Enrolment (CoE) from registered education provider", required: true },
      { category: "Enrolment", documentType: "Offer Letter", description: "Unconditional offer letter from education provider", required: true },
      { category: "English", documentType: "English Test Results", description: "IELTS Academic (min 5.5 overall) or equivalent, unless exempt", required: true },
      { category: "Financial", documentType: "Financial Evidence", description: "Proof of funds — 12 months tuition + $24,505 AUD living costs + travel", required: true },
      { category: "Financial", documentType: "Bank Statements", description: "3-6 months bank statements showing sufficient funds", required: true },
      { category: "Financial", documentType: "Scholarship Letter", description: "Scholarship award letter (if applicable)", required: false },
      { category: "Insurance", documentType: "OSHC", description: "Overseas Student Health Cover for duration of visa", required: true },
      { category: "Health", documentType: "Health Examination", description: "Medical examination (if required based on country/duration)", required: false },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance (if over 16 years old)", required: true },
      { category: "GTE", documentType: "GTE Statement", description: "Genuine Temporary Entrant statement explaining study plans and intentions", required: true },
      { category: "GTE", documentType: "Academic Transcripts", description: "Previous academic records and transcripts", required: true },
    ],
  },
  "820": {
    subclass: "820",
    name: "Partner (Onshore)",
    category: "family",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — all pages", required: true },
      { category: "Identity", documentType: "Birth Certificate", description: "Certified copy of birth certificate (both applicant and sponsor)", required: true },
      { category: "Identity", documentType: "Passport Photos", description: "Two recent passport-size photographs", required: true },
      { category: "Relationship", documentType: "Marriage Certificate", description: "Registered marriage certificate or registered relationship certificate", required: true },
      { category: "Relationship", documentType: "Relationship Statement", description: "Joint statutory declarations detailing relationship history", required: true },
      { category: "Relationship", documentType: "Cohabitation Evidence", description: "Evidence of shared living — lease, utility bills, mail to same address", required: true },
      { category: "Relationship", documentType: "Financial Evidence", description: "Joint bank accounts, shared expenses, financial commitments", required: true },
      { category: "Relationship", documentType: "Social Evidence", description: "Photos together, travel records, joint social activities", required: true },
      { category: "Relationship", documentType: "Statutory Declarations", description: "Declarations from family/friends confirming the relationship (Form 888)", required: true },
      { category: "Sponsor", documentType: "Sponsor ID", description: "Sponsor's passport and Australian citizenship/PR evidence", required: true },
      { category: "Sponsor", documentType: "Sponsor Police Check", description: "Australian Federal Police check for sponsor", required: true },
      { category: "Health", documentType: "Health Examination", description: "Medical examination by Bupa panel physician", required: true },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance from each country lived in 12+ months", required: true },
      { category: "Character", documentType: "Form 80", description: "Personal particulars for assessment form", required: true },
    ],
  },
  "600": {
    subclass: "600",
    name: "Visitor Visa",
    category: "visitor",
    requirements: [
      { category: "Identity", documentType: "Passport", description: "Current passport — valid for at least 6 months beyond intended stay", required: true },
      { category: "Identity", documentType: "Passport Photos", description: "Two recent passport-size photographs", required: true },
      { category: "Purpose", documentType: "Invitation Letter", description: "Letter of invitation from Australian contact (if visiting family/friends)", required: false },
      { category: "Purpose", documentType: "Travel Itinerary", description: "Planned travel itinerary including accommodation bookings", required: true },
      { category: "Financial", documentType: "Financial Evidence", description: "Bank statements showing sufficient funds for the visit", required: true },
      { category: "Financial", documentType: "Sponsor Support", description: "Financial support letter from Australian sponsor (if applicable)", required: false },
      { category: "Employment", documentType: "Employment Letter", description: "Letter from employer confirming approved leave and return to position", required: false },
      { category: "Ties", documentType: "Ties to Home Country", description: "Evidence of ties — property, employment, family, enrolment", required: true },
      { category: "Health", documentType: "Health Insurance", description: "Travel health insurance for the duration of stay", required: true },
      { category: "Character", documentType: "Police Clearance", description: "Police clearance (if requested or staying longer than 3 months)", required: false },
    ],
  },
};

// Generate checklist requirements from visa config
export function generateChecklist(visaSubclass: string): ChecklistRequirement[] {
  _id = 0;
  const config = VISA_REQUIREMENTS[visaSubclass];
  if (!config) return [];

  return config.requirements.map((req) => ({
    id: makeId(),
    ...req,
    status: "pending" as const,
    notes: "",
    deadline: "",
  }));
}

// Mock AI visa recommendations based on consultation data
export function getMockVisaRecommendations(): VisaRecommendation[] {
  return [
    {
      visaSubclass: "482",
      visaName: "Temporary Skill Shortage",
      confidence: 92,
      eligibilityScore: 88,
      processingTime: "1–4 months",
      applicationCost: "$2,645 AUD",
      keyRequirements: [
        "Employer sponsorship required",
        "Occupation on skills list",
        "Min 2 years relevant experience",
        "English: IELTS 5.0+ each band",
      ],
      pros: [
        "Fastest pathway to work in Australia",
        "Can lead to 186 permanent visa after 2-3 years",
        "Employer handles nomination process",
      ],
      cons: [
        "Tied to sponsoring employer",
        "Temporary — requires renewal or pathway to PR",
        "Employer must demonstrate labour market testing",
      ],
    },
    {
      visaSubclass: "189",
      visaName: "Skilled Independent",
      confidence: 74,
      eligibilityScore: 71,
      processingTime: "6–12 months",
      applicationCost: "$4,640 AUD",
      keyRequirements: [
        "65+ points on points test",
        "Occupation on MLTSSL",
        "Positive skills assessment",
        "English: IELTS 6.0+ each band",
        "SkillSelect EOI invitation required",
      ],
      pros: [
        "Direct permanent residency",
        "No employer sponsorship needed",
        "Freedom to work for any employer",
      ],
      cons: [
        "Highly competitive — high points needed",
        "Longer processing time",
        "Must wait for EOI invitation",
      ],
    },
    {
      visaSubclass: "186",
      visaName: "Employer Nomination Scheme",
      confidence: 68,
      eligibilityScore: 65,
      processingTime: "6–12 months",
      applicationCost: "$4,640 AUD",
      keyRequirements: [
        "Employer nomination required",
        "3 years relevant work experience",
        "Positive skills assessment",
        "English: IELTS 6.0+ each band",
      ],
      pros: [
        "Direct permanent residency",
        "Employer supports application",
        "Access to Medicare from grant",
      ],
      cons: [
        "Requires employer willingness to nominate",
        "Higher English requirement than 482",
        "Longer processing than 482",
      ],
    },
  ];
}
