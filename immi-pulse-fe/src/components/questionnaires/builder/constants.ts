import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  ToggleLeft,
  CircleDot,
  ListChecks,
} from "lucide-react";
import type { FieldType } from "@/lib/api/services";

export type BuilderMode = "standard" | "advanced";

export type FieldDef = {
  value: FieldType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const FIELD_TYPE_OPTIONS: FieldDef[] = [
  { value: "short_text", label: "Short text", hint: "One-line answer", icon: Type },
  { value: "long_text", label: "Long text", hint: "Paragraph", icon: AlignLeft },
  { value: "email", label: "Email", hint: "Validated email", icon: Mail },
  { value: "phone", label: "Phone", hint: "Tel input", icon: Phone },
  { value: "number", label: "Number", hint: "Numeric only", icon: Hash },
  { value: "date", label: "Date", hint: "Calendar picker", icon: Calendar },
  { value: "yes_no", label: "Yes / No", hint: "Two-option toggle", icon: ToggleLeft },
  { value: "single_select", label: "Single choice", hint: "Pick one", icon: CircleDot },
  { value: "multi_select", label: "Multiple choice", hint: "Pick many", icon: ListChecks },
];

export const AUDIENCE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "individual", label: "Individual" },
  { value: "employer", label: "Employer" },
  { value: "onshore", label: "Onshore" },
  { value: "offshore", label: "Offshore" },
];

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";
