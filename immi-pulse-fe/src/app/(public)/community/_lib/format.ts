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

/** Compact relative time, e.g. "just now", "42m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Short, friendly date, e.g. "2 Dec 2024". */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
