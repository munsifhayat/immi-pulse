/**
 * Curated catalog of Australian visa subclasses + practice personas, used by the
 * onboarding chip selectors. Kept lean: the most-billed subclasses across OMARA
 * agents, grouped so the UI can render labelled sections without UI logic.
 *
 * IDs are short-stable so they survive re-edits across sessions even if labels
 * are tweaked. They are persisted into Organization.niche as a JSON blob.
 */

export interface ExpertiseOption {
  id: string;
  label: string;
  hint?: string;
}

export interface ExpertiseGroup {
  id: string;
  title: string;
  description: string;
  options: ExpertiseOption[];
}

export const EXPERTISE_GROUPS: ExpertiseGroup[] = [
  {
    id: "employer",
    title: "Employer-sponsored",
    description: "Workforce and skilled-migration cases tied to an Australian sponsor.",
    options: [
      { id: "v482", label: "TSS / 482", hint: "Skills in Demand" },
      { id: "v186", label: "ENS / 186", hint: "Employer Nomination" },
      { id: "v494", label: "SESR / 494", hint: "Skilled Employer Regional" },
      { id: "v187", label: "RSMS / 187", hint: "Regional Sponsored (legacy)" },
      { id: "vdama", label: "DAMA", hint: "Designated Area Migration Agreement" },
      { id: "v400", label: "400", hint: "Short-stay specialist" },
    ],
  },
  {
    id: "skilled",
    title: "Skilled & points-tested",
    description: "Independent and state-nominated skilled migration pathways.",
    options: [
      { id: "v189", label: "189", hint: "Skilled Independent" },
      { id: "v190", label: "190", hint: "State Nominated" },
      { id: "v491", label: "491", hint: "Skilled Work Regional" },
      { id: "v887", label: "887", hint: "Skilled Regional PR" },
      { id: "v858", label: "858", hint: "Global Talent" },
      { id: "v124", label: "124", hint: "Distinguished Talent" },
    ],
  },
  {
    id: "student",
    title: "Student & graduate",
    description: "Study pathways and post-study work rights.",
    options: [
      { id: "v500", label: "500", hint: "Student" },
      { id: "v485", label: "485", hint: "Temporary Graduate" },
      { id: "v590", label: "590", hint: "Student Guardian" },
      { id: "v407", label: "407", hint: "Training" },
    ],
  },
  {
    id: "family",
    title: "Partner & family",
    description: "Relationship and family-reunion visas, onshore and offshore.",
    options: [
      { id: "v820", label: "820 / 801", hint: "Partner onshore" },
      { id: "v309", label: "309 / 100", hint: "Partner offshore" },
      { id: "v300", label: "300", hint: "Prospective Marriage" },
      { id: "v143", label: "143 / 173", hint: "Contributory Parent" },
      { id: "v870", label: "870", hint: "Sponsored Parent (Temp)" },
      { id: "v461", label: "461", hint: "NZ Family Relationship" },
    ],
  },
  {
    id: "business",
    title: "Business & investor",
    description: "Owner-operator, founder and investor migration.",
    options: [
      { id: "v188", label: "188", hint: "Business Innovation" },
      { id: "v888", label: "888", hint: "Business Innovation PR" },
      { id: "v132", label: "132", hint: "Business Talent (legacy)" },
    ],
  },
  {
    id: "visitor",
    title: "Visitor & working holiday",
    description: "Short-stay visitors, working-holiday makers and temporary activity.",
    options: [
      { id: "v600", label: "600", hint: "Visitor" },
      { id: "v601", label: "601 / 651", hint: "eVisitor / ETA" },
      { id: "v417", label: "417 / 462", hint: "Working Holiday" },
      { id: "v408", label: "408", hint: "Temporary Activity" },
    ],
  },
  {
    id: "humanitarian",
    title: "Refugee & humanitarian",
    description: "Protection and humanitarian programme work.",
    options: [
      { id: "v866", label: "866", hint: "Onshore Protection" },
      { id: "vrefugee", label: "200–204", hint: "Refugee programme" },
    ],
  },
  {
    id: "specialist",
    title: "Reviews, appeals & specialist",
    description: "Tribunal work, ministerial intervention and complex character / health cases.",
    options: [
      { id: "vart", label: "ART / AAT review", hint: "Merits review" },
      { id: "vmin", label: "Min. intervention", hint: "Section 351 / 417" },
      { id: "vs48", label: "Section 48", hint: "Bridging strategy" },
      { id: "vchar", label: "Character waivers", hint: "PIC 4001 / 4007" },
      { id: "vrrv", label: "RRV 155 / 157", hint: "Resident Return" },
      { id: "vcit", label: "Citizenship", hint: "Conferral & evidence" },
    ],
  },
];

export interface ClientFocusOption {
  id: string;
  label: string;
  desc: string;
  icon: "user" | "users" | "briefcase" | "graduation" | "building" | "globe";
}

export const CLIENT_FOCUS: ClientFocusOption[] = [
  { id: "individuals", label: "Individuals", desc: "Direct-to-applicant cases", icon: "user" },
  { id: "families", label: "Families", desc: "Partner & dependent matters", icon: "users" },
  { id: "employers", label: "Employers", desc: "Sponsoring businesses", icon: "briefcase" },
  { id: "education", label: "Education agents", desc: "Student pipeline & CoEs", icon: "graduation" },
  { id: "corporate", label: "Corporate / HR", desc: "In-house mobility teams", icon: "building" },
  { id: "offshore", label: "Offshore clients", desc: "Lodging from overseas", icon: "globe" },
];

export interface ExperienceOption {
  id: string;
  label: string;
  desc: string;
}

export const EXPERIENCE_BANDS: ExperienceOption[] = [
  { id: "0-2", label: "0–2 years", desc: "Newly registered" },
  { id: "3-5", label: "3–5 years", desc: "Established" },
  { id: "5-10", label: "5–10 years", desc: "Senior practitioner" },
  { id: "10+", label: "10+ years", desc: "Veteran / principal" },
];

/* ─── Persistence helpers — niche ⇄ structured profile ─── */

export interface PracticeProfile {
  expertise: string[];
  audience: string[];
  experience: string | null;
}

const EMPTY_PROFILE: PracticeProfile = {
  expertise: [],
  audience: [],
  experience: null,
};

export function emptyProfile(): PracticeProfile {
  return { ...EMPTY_PROFILE };
}

export function parseProfile(raw: string | null | undefined): PracticeProfile {
  if (!raw) return emptyProfile();
  try {
    const obj = JSON.parse(raw) as Partial<PracticeProfile> & {
      schema?: string;
    };
    if (obj && typeof obj === "object") {
      return {
        expertise: Array.isArray(obj.expertise) ? obj.expertise.filter((x): x is string => typeof x === "string") : [],
        audience: Array.isArray(obj.audience) ? obj.audience.filter((x): x is string => typeof x === "string") : [],
        experience: typeof obj.experience === "string" ? obj.experience : null,
      };
    }
  } catch {
    // Legacy free-form niche string — carry no structured chips.
  }
  return emptyProfile();
}

export function serialiseProfile(p: PracticeProfile): string {
  return JSON.stringify({ schema: "practice/v1", ...p });
}

export function profileSummary(p: PracticeProfile): string {
  const parts: string[] = [];
  if (p.expertise.length) parts.push(`${p.expertise.length} visa areas`);
  if (p.audience.length) parts.push(`${p.audience.length} client types`);
  if (p.experience) parts.push(`${p.experience} yrs`);
  return parts.join(" · ");
}
