import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Activity,
} from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";

// ── Accent color tokens — soft slate-blue for compliance ──
export const ACCENT = {
  text: "text-[oklch(0.62_0.14_175)]",
  bg: "bg-[oklch(0.62_0.14_175)]/10",
  ring: "ring-[oklch(0.62_0.14_175)]/15",
  bar: "bg-[oklch(0.62_0.14_175)]",
  badge:
    "border-[oklch(0.62_0.14_175)]/20 bg-[oklch(0.62_0.14_175)]/8 text-[oklch(0.62_0.14_175)]",
};

// ── Stat cards config ──────────────────────────────────────
export const statCards = [
  {
    key: "score",
    title: "Portfolio Score",
    icon: ShieldCheck,
    accentColor: "text-[oklch(0.62_0.14_175)]",
    accentBg: "bg-[oklch(0.62_0.14_175)]/10",
    ringColor: "ring-[oklch(0.62_0.14_175)]/15",
  },
  {
    key: "atRisk",
    title: "Properties at Risk",
    icon: AlertTriangle,
    accentColor: "text-[oklch(0.72_0.14_25)]",
    accentBg: "bg-[oklch(0.72_0.14_25)]/10",
    ringColor: "ring-[oklch(0.72_0.14_25)]/15",
  },
  {
    key: "deadlines",
    title: "Upcoming Deadlines",
    icon: Calendar,
    accentColor: "text-[oklch(0.72_0.12_75)]",
    accentBg: "bg-[oklch(0.72_0.12_75)]/10",
    ringColor: "ring-[oklch(0.72_0.12_75)]/15",
  },
  {
    key: "detections",
    title: "Detections This Week",
    icon: Activity,
    accentColor: "text-[oklch(0.65_0.12_260)]",
    accentBg: "bg-[oklch(0.65_0.12_260)]/10",
    ringColor: "ring-[oklch(0.65_0.12_260)]/15",
  },
];

// ── Chart config — muted tones ────────────────────────────
export const chartConfig = {
  compliant: { label: "Compliant", color: "oklch(0.62 0.14 175)" },
  non_compliant: { label: "Non-Compliant", color: "oklch(0.70 0.12 25)" },
  expiring: { label: "Expiring", color: "oklch(0.72 0.12 75)" },
  unknown: { label: "Unknown", color: "oklch(0.55 0.02 250)" },
} satisfies ChartConfig;

// ── Compliance type labels ─────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  smoke_alarm: "Smoke Alarms",
  electrical_safety: "Electrical / RCD",
  pool_barrier: "Pool Barriers",
  gas_safety: "Gas Safety",
  fire_safety: "Fire Safety",
  insurance: "Insurance",
  council_notice: "Council Notice",
  body_corporate: "Body Corporate",
  contractor_compliance: "Contractor",
  minimum_standards: "Min. Standards",
  water_efficiency: "Water Efficiency",
  blind_cord_safety: "Blind Cords",
  asbestos: "Asbestos",
  pest_inspection: "Pest Inspection",
  energy_efficiency: "Energy Efficiency",
  general_compliance: "General",
};

export const URGENCY_COLORS: Record<string, string> = {
  critical:
    "border-red-200/60 bg-red-50/50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
  high: "border-orange-200/60 bg-orange-50/50 text-orange-600 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-400",
  medium:
    "border-amber-200/60 bg-amber-50/50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
  low: "border-border bg-muted/50 text-muted-foreground",
};

export const STATUS_COLORS: Record<string, string> = {
  compliant: "text-emerald-600 dark:text-emerald-400",
  non_compliant: "text-red-500 dark:text-red-400",
  expiring: "text-amber-600 dark:text-amber-400",
  expired: "text-red-500 dark:text-red-400",
  action_required: "text-orange-500 dark:text-orange-400",
  information: "text-muted-foreground",
};

// ── Australian states ──────────────────────────────────────
export const AUSTRALIAN_STATES = [
  { value: "QLD", label: "Queensland" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

// ── Property types ─────────────────────────────────────────
export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment / Unit" },
  { value: "townhouse", label: "Townhouse" },
  { value: "duplex", label: "Duplex" },
  { value: "villa", label: "Villa" },
  { value: "commercial", label: "Commercial" },
];

// ── Property age ranges ────────────────────────────────────
export const PROPERTY_AGE_RANGES = [
  { value: "0-5", label: "0 - 5 years" },
  { value: "5-15", label: "5 - 15 years" },
  { value: "15-25", label: "15 - 25 years" },
  { value: "25+", label: "25+ years" },
];
