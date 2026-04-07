export const CITIES = [
  { name: "Sydney", state: "NSW", consultantCount: 6, tagline: "Australia's global city" },
  { name: "Melbourne", state: "VIC", consultantCount: 6, tagline: "Cultural capital" },
  { name: "Brisbane", state: "QLD", consultantCount: 4, tagline: "Sunshine State hub" },
  { name: "Perth", state: "WA", consultantCount: 3, tagline: "Gateway to the west" },
  { name: "Adelaide", state: "SA", consultantCount: 3, tagline: "Festival city" },
  { name: "Canberra", state: "ACT", consultantCount: 2, tagline: "The national capital" },
  { name: "Hobart", state: "TAS", consultantCount: 2, tagline: "Island gateway" },
  { name: "Darwin", state: "NT", consultantCount: 1, tagline: "Top End frontier" },
] as const;

export const VISA_TYPES = [
  "Skilled Worker (482)",
  "Employer Sponsored (186)",
  "Partner Visa (820/801)",
  "Student Visa (500)",
  "Graduate Visa (485)",
  "Business Innovation (188)",
  "Parent Visa (143)",
  "Skilled Independent (189)",
  "Skilled Nominated (190)",
  "Regional (491)",
] as const;

export const LANGUAGES = [
  "English",
  "Mandarin",
  "Hindi",
  "Punjabi",
  "Arabic",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Spanish",
  "Nepali",
  "Tamil",
  "Urdu",
  "Thai",
  "Japanese",
  "Cantonese",
] as const;

export type City = (typeof CITIES)[number]["name"];
export type VisaType = (typeof VISA_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];
