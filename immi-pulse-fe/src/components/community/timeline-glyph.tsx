/**
 * The community's own icon set.
 *
 * Milestones are the one thing this product draws that nothing else does — a
 * visa journey is a spine with dated nodes on it — so they get drawn rather
 * than borrowed. Every glyph is a 24×24 stroked outline on `currentColor`, so
 * it inherits the milestone's colour the same way the rest of the set does and
 * sits at the same optical weight as the lucide icons used for plain UI.
 */

type GlyphProps = {
  className?: string;
  strokeWidth?: number;
};

/** Shared frame — every glyph is the same box, the same joins, the same caps. */
function Glyph({
  className,
  strokeWidth = 1.75,
  children,
}: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** A page with a folded corner — the base every document milestone builds on. */
const PAGE = (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>
);

export function AssessmentLodgedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      {PAGE}
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Glyph>
  );
}

export function AssessmentApprovedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      {PAGE}
      <path d="m9 15 2 2 4-4" />
    </Glyph>
  );
}

export function EnglishTestGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l4.5-4H20a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
      <path d="m8.5 12 2.5-5.5 2.5 5.5" />
      <path d="M9.4 10.2h3.2" />
      <path d="M16 8.5v3.5" />
    </Glyph>
  );
}

export function EoiSubmittedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </Glyph>
  );
}

export function InvitationGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </Glyph>
  );
}

export function NominationLodgedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </Glyph>
  );
}

export function NominationApprovedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="m9 14 2 2 4-4" />
    </Glyph>
  );
}

export function StateNominationGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M2 21h20" />
      <path d="M9.5 21v-5h5v5" />
      <path d="M9.5 10.5h1.5" />
      <path d="M13 10.5h1.5" />
    </Glyph>
  );
}

/** A passport spread with a stamp on it — the moment the application exists. */
export function VisaLodgedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="4" y="2.5" width="16" height="19" rx="2" />
      <circle cx="12" cy="10" r="3.5" />
      <path d="M8.5 17h7" />
    </Glyph>
  );
}

export function MedicalGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M2.5 12h4l2-5.5 3.5 11 2.5-7 1.5 3.5h5.5" />
    </Glyph>
  );
}

export function PoliceCheckGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.4-8 9.9-4.6-1.5-8-4.9-8-9.9v-6z" />
      <path d="m9 12 2 2 4.5-4.5" />
    </Glyph>
  );
}

/** The s56 request — a page that is asking you for something. */
export function S56RequestGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      {PAGE}
      <path d="M12 12v3" />
      <path d="M12 18h.01" />
    </Glyph>
  );
}

export function S56ResponseGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      {PAGE}
      <path d="M12 18v-5" />
      <path d="m9.75 15.25 2.25-2.25 2.25 2.25" />
    </Glyph>
  );
}

/** The grant — a seal, because that is what it feels like. */
export function VisaGrantedGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="9" r="6.5" />
      <path d="m9.25 9 1.9 1.9L15 7" />
      <path d="m8.5 15 -1.5 6.5 5-2.5 5 2.5-1.5-6.5" />
    </Glyph>
  );
}

/** Still waiting — the only node on a timeline that has no date yet. */
export function AwaitingGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M6.5 2.5h11" />
      <path d="M6.5 21.5h11" />
      <path d="M8 2.5v4.2L12 11l4-4.3V2.5" />
      <path d="M8 21.5v-4.2L12 13l4 4.3v4.2" />
    </Glyph>
  );
}

export function OtherMilestoneGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.5" />
    </Glyph>
  );
}

/**
 * The signature motif: a spine with four dated nodes, the last one hollow.
 *
 * Used wherever the invitation is "add your timeline" rather than "read one" —
 * the share button, the empty feed, the mobile action. It reads as a journey in
 * progress, which is the thing being asked for.
 */
export function TimelineGlyph({
  className,
  strokeWidth = 1.75,
}: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12h18" />
      <circle cx="4.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="12" r="2" fill="none" />
    </svg>
  );
}

/**
 * Three overlapping timelines — the community, as opposed to one person's.
 *
 * The point of the drawing is that the lines are the same shape and different
 * lengths, which is exactly what "is my wait normal?" is asking about.
 */
export function CommunityTimelinesGlyph({
  className,
  strokeWidth = 1.75,
}: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h11" />
      <circle cx="3" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6" r="1.6" fill="none" />
      <path d="M3 12h17" />
      <circle cx="3" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.6" fill="none" />
      <path d="M3 18h7" />
      <circle cx="3" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.6" fill="none" />
    </svg>
  );
}
