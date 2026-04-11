// ── Journey Wizard Types ──
// State and data models for the step-by-step client journey wizard

import type { Client } from "./immigration";

// ── Stage Data Types ──

export interface InquiryData {
  source: "email" | "referral" | "walk_in" | "website" | "";
  referralSource: string;
  initialNotes: string;
}

export interface ConsultationData {
  // Personal background
  dateOfBirth: string;
  countryOfBirth: string;
  currentLocation: string;
  maritalStatus: "single" | "married" | "de_facto" | "divorced" | "widowed" | "";
  dependents: number;

  // Education
  highestQualification: string;
  fieldOfStudy: string;
  institution: string;
  completionYear: string;

  // Work experience
  currentOccupation: string;
  yearsExperience: string;
  employer: string;
  skillsAssessment: boolean;

  // English proficiency
  englishTestType: "ielts" | "pte" | "toefl" | "cambridge" | "oet" | "none" | "";
  englishScore: string;

  // Immigration history
  previousVisas: string;
  visaRefusals: boolean;
  healthIssues: boolean;
  characterIssues: boolean;

  // Goals
  clientGoals: string;
  preferredTimeline: string;
  budget: string;

  // Notes
  consultationNotes: string;
  consultationDate: string;
}

export interface VisaPathwayData {
  selectedVisa: string;
  alternativesConsidered: string[];
  pathwayNotes: string;
}

export interface ChecklistRequirement {
  id: string;
  category: string;
  documentType: string;
  description: string;
  required: boolean;
  deadline: string;
  status: "pending" | "uploaded" | "validated" | "flagged" | "not_applicable";
  notes: string;
}

export interface UploadedDocument {
  id: string;
  checklistItemId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  status: "uploading" | "uploaded" | "validating" | "validated" | "flagged";
}

export interface DocumentReviewResult {
  documentId: string;
  checklistItemId: string;
  fileName: string;
  documentType: string;
  status: "passed" | "flagged" | "failed";
  confidence: number;
  issues: string[];
  suggestions: string[];
  reviewedAt: string;
}

export interface ApplicationPrepData {
  formCompleted: boolean;
  complianceChecked: boolean;
  consultantSignoff: boolean;
  coverLetterDrafted: boolean;
  notes: string;
}

export interface LodgementData {
  lodgementDate: string;
  receiptNumber: string;
  method: "immi_account" | "paper" | "";
  confirmationUploaded: boolean;
  notes: string;
}

export interface PostLodgementData {
  healthCheckStatus: "not_started" | "scheduled" | "completed" | "cleared";
  characterCheckStatus: "not_started" | "submitted" | "cleared";
  biometricsStatus: "not_required" | "scheduled" | "completed";
  additionalInfoRequested: boolean;
  notes: string;
}

export interface DecisionData {
  outcome: "granted" | "refused" | "withdrawn" | "";
  decisionDate: string;
  grantDate: string;
  visaConditions: string;
  expiryDate: string;
  refusalReason: string;
  notes: string;
}

// ── Full Wizard State ──

export interface WizardState {
  inquiry: InquiryData;
  consultation: ConsultationData;
  visaPathway: VisaPathwayData;
  checklist: ChecklistRequirement[];
  documents: UploadedDocument[];
  documentReview: DocumentReviewResult[];
  reviewTriggered: boolean;
  applicationPrep: ApplicationPrepData;
  lodgement: LodgementData;
  postLodgement: PostLodgementData;
  decision: DecisionData;
}

// ── AI Recommendation ──

export interface VisaRecommendation {
  visaSubclass: string;
  visaName: string;
  confidence: number;
  eligibilityScore: number;
  processingTime: string;
  applicationCost: string;
  keyRequirements: string[];
  pros: string[];
  cons: string[];
}

// ── Wizard Context ──

export interface JourneyWizardContextType {
  client: Client;
  state: WizardState;
  currentStage: number;
  completedStages: number[];
  updateStageData: <K extends keyof WizardState>(
    key: K,
    data: WizardState[K]
  ) => void;
  goToStage: (stage: number) => void;
  nextStage: () => void;
  prevStage: () => void;
  completeCurrentStage: () => void;
  canProgress: boolean;
}

// ── Stage Component Props ──

export interface StageProps {
  wizardContext: JourneyWizardContextType;
}

// ── Initial State Factory ──

export const createInitialWizardState = (): WizardState => ({
  inquiry: {
    source: "",
    referralSource: "",
    initialNotes: "",
  },
  consultation: {
    dateOfBirth: "",
    countryOfBirth: "",
    currentLocation: "",
    maritalStatus: "",
    dependents: 0,
    highestQualification: "",
    fieldOfStudy: "",
    institution: "",
    completionYear: "",
    currentOccupation: "",
    yearsExperience: "",
    employer: "",
    skillsAssessment: false,
    englishTestType: "",
    englishScore: "",
    previousVisas: "",
    visaRefusals: false,
    healthIssues: false,
    characterIssues: false,
    clientGoals: "",
    preferredTimeline: "",
    budget: "",
    consultationNotes: "",
    consultationDate: new Date().toISOString().split("T")[0],
  },
  visaPathway: {
    selectedVisa: "",
    alternativesConsidered: [],
    pathwayNotes: "",
  },
  checklist: [],
  documents: [],
  documentReview: [],
  reviewTriggered: false,
  applicationPrep: {
    formCompleted: false,
    complianceChecked: false,
    consultantSignoff: false,
    coverLetterDrafted: false,
    notes: "",
  },
  lodgement: {
    lodgementDate: "",
    receiptNumber: "",
    method: "",
    confirmationUploaded: false,
    notes: "",
  },
  postLodgement: {
    healthCheckStatus: "not_started",
    characterCheckStatus: "not_started",
    biometricsStatus: "not_required",
    additionalInfoRequested: false,
    notes: "",
  },
  decision: {
    outcome: "",
    decisionDate: "",
    grantDate: "",
    visaConditions: "",
    expiryDate: "",
    refusalReason: "",
    notes: "",
  },
});
