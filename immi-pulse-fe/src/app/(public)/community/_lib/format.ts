// Shared formatting helpers for the processing-times / wait-check surfaces.

/** Human-readable duration from a day count. Returns "—" for null/undefined. */
export function formatDays(days: number | null | undefined): string {
  if (days == null || days < 0) return "—";
  if (days < 21) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 84) {
    const w = Math.round(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"}`;
  }
  const months = days / 30.44;
  const value = months < 18 ? Math.round(months * 10) / 10 : Math.round(months);
  return `${value} months`;
}

/** Compact "~26 days" style for inline use. */
export function formatDaysShort(days: number | null | undefined): string {
  return formatDays(days);
}

/** Signed delta of community median vs official p50, e.g. "~19% faster". */
export function deltaVsOfficial(
  communityP50: number | null | undefined,
  officialP50: number | null | undefined
): string | null {
  if (communityP50 == null || officialP50 == null || officialP50 === 0) {
    return null;
  }
  const pct = Math.round(((communityP50 - officialP50) / officialP50) * 100);
  if (pct === 0) return "in line with official";
  return pct < 0 ? `~${Math.abs(pct)}% faster` : `~${pct}% slower`;
}
