// Per-milestone icon + colour mapping for the colourful timeline strips.
// Mirrors the prototype's MS_ICON / MS_COLOR maps.

import {
  Award,
  Briefcase,
  Building2,
  CircleDot,
  FileText,
  FileWarning,
  Globe,
  Languages,
  Loader,
  MailCheck,
  PartyPopper,
  Send,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { MilestoneType } from "@/lib/api/hooks/community";

interface MilestoneMeta {
  Icon: LucideIcon;
  color: string;
}

const MAP: Record<string, MilestoneMeta> = {
  "Skills Assessment Lodged": { Icon: Award, color: "#F59E0B" },
  "Skills Assessment Approved": { Icon: Award, color: "#16A34A" },
  "English Test Completed": { Icon: Languages, color: "#0EA5E9" },
  "EOI Submitted": { Icon: Globe, color: "#7A5AF8" },
  "Invitation Received": { Icon: MailCheck, color: "#C026D3" },
  "Nomination Lodged": { Icon: Briefcase, color: "#7A5AF8" },
  "Nomination Approved": { Icon: Building2, color: "#16A34A" },
  "State Nomination": { Icon: Building2, color: "#16A34A" },
  "Visa Lodged": { Icon: Send, color: "#6D49F5" },
  "Medical Examination": { Icon: Stethoscope, color: "#1B7B6F" },
  "Police Checks": { Icon: ShieldCheck, color: "#2563EB" },
  "S56 Request Received": { Icon: FileWarning, color: "#B45309" },
  "S56 Response Submitted": { Icon: FileText, color: "#0EA5E9" },
  "Visa Granted": { Icon: PartyPopper, color: "#16A34A" },
  Other: { Icon: CircleDot, color: "#475367" },
};

// Synthetic trailing node for still-waiting timelines (not a stored milestone).
export const AWAITING_META: MilestoneMeta = { Icon: Loader, color: "#B45309" };

export function milestoneMeta(type: MilestoneType | string): MilestoneMeta {
  return MAP[type] ?? { Icon: CircleDot, color: "#7A5AF8" };
}

/** Whole days between two ISO date strings (b - a). */
export function dayGap(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "12 days" / "3 weeks" / "5 months" — compact gap label. */
export function gapLabel(days: number): string {
  if (days <= 0) return "same day";
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30.44)}mo`;
}
