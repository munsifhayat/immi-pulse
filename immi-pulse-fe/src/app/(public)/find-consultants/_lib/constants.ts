export const CITIES = [
  { name: "Sydney", state: "NSW", tagline: "Australia's global city" },
  { name: "Melbourne", state: "VIC", tagline: "Cultural capital" },
  { name: "Brisbane", state: "QLD", tagline: "Sunshine State hub" },
  { name: "Perth", state: "WA", tagline: "Gateway to the west" },
  { name: "Adelaide", state: "SA", tagline: "Festival city" },
  { name: "Canberra", state: "ACT", tagline: "The national capital" },
  { name: "Hobart", state: "TAS", tagline: "Island gateway" },
  { name: "Darwin", state: "NT", tagline: "Top End frontier" },
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
