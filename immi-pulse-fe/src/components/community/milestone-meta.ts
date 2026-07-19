// Per-milestone icon + colour mapping for the colourful timeline strips.
//
// The icons are this product's own (see `timeline-glyph.tsx`) rather than
// generic ones: a visa journey is the single thing here that nothing off the
// shelf draws, and a borrowed briefcase for "Nomination Approved" reads as a
// stock icon where a drawn one reads as a milestone.

import type { ReactElement } from "react";
import {
  AssessmentApprovedGlyph,
  AssessmentLodgedGlyph,
  AwaitingGlyph,
  EnglishTestGlyph,
  EoiSubmittedGlyph,
  InvitationGlyph,
  MedicalGlyph,
  NominationApprovedGlyph,
  NominationLodgedGlyph,
  OtherMilestoneGlyph,
  PoliceCheckGlyph,
  S56RequestGlyph,
  S56ResponseGlyph,
  StateNominationGlyph,
  VisaGrantedGlyph,
  VisaLodgedGlyph,
} from "./timeline-glyph";
import type { MilestoneType } from "@/lib/api/hooks/community";

/** Every glyph takes the same two props, so the strips can render them blind. */
export type MilestoneIcon = (props: {
  className?: string;
  strokeWidth?: number;
}) => ReactElement;

interface MilestoneMeta {
  Icon: MilestoneIcon;
  color: string;
}

const MAP: Record<string, MilestoneMeta> = {
  "Skills Assessment Lodged": { Icon: AssessmentLodgedGlyph, color: "#F59E0B" },
  "Skills Assessment Approved": {
    Icon: AssessmentApprovedGlyph,
    color: "#16A34A",
  },
  "English Test Completed": { Icon: EnglishTestGlyph, color: "#0EA5E9" },
  "EOI Submitted": { Icon: EoiSubmittedGlyph, color: "#7A5AF8" },
  "Invitation Received": { Icon: InvitationGlyph, color: "#C026D3" },
  "Nomination Lodged": { Icon: NominationLodgedGlyph, color: "#7A5AF8" },
  "Nomination Approved": { Icon: NominationApprovedGlyph, color: "#16A34A" },
  "State Nomination": { Icon: StateNominationGlyph, color: "#16A34A" },
  "Visa Lodged": { Icon: VisaLodgedGlyph, color: "#6D49F5" },
  "Medical Examination": { Icon: MedicalGlyph, color: "#1B7B6F" },
  "Police Checks": { Icon: PoliceCheckGlyph, color: "#2563EB" },
  "S56 Request Received": { Icon: S56RequestGlyph, color: "#B45309" },
  "S56 Response Submitted": { Icon: S56ResponseGlyph, color: "#0EA5E9" },
  "Visa Granted": { Icon: VisaGrantedGlyph, color: "#16A34A" },
  Other: { Icon: OtherMilestoneGlyph, color: "#475367" },
};

// Synthetic trailing node for still-waiting timelines (not a stored milestone).
export const AWAITING_META: MilestoneMeta = {
  Icon: AwaitingGlyph,
  color: "#B45309",
};

export function milestoneMeta(type: MilestoneType | string): MilestoneMeta {
  return MAP[type] ?? { Icon: OtherMilestoneGlyph, color: "#7A5AF8" };
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
