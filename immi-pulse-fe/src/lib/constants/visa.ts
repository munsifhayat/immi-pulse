import type { VisaSubclass } from "@/lib/types/immigration";

export const visaSubclasses: VisaSubclass[] = [
  { code: "482", name: "Temporary Skill Shortage", category: "skilled" },
  { code: "186", name: "Employer Nomination Scheme", category: "skilled" },
  { code: "189", name: "Skilled Independent", category: "skilled" },
  { code: "190", name: "Skilled Nominated", category: "skilled" },
  { code: "491", name: "Skilled Work Regional", category: "skilled" },
  { code: "500", name: "Student Visa", category: "student" },
  { code: "820", name: "Partner (Temporary)", category: "family" },
  { code: "600", name: "Visitor Visa", category: "visitor" },
];
