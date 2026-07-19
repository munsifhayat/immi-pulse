// The community's own session token.
//
// Deliberately NOT the console's `ip_token`. A community member and a
// consultant are different people with different tokens, different audiences
// (`immi-pulse.community.session` vs the console's) and — on a shared machine —
// possibly both present at once. Keeping them in separate slots means signing
// out of one never signs you out of the other, and a consultant browsing the
// visitor is never mistaken for a member.
//
// The device token (`ip_device_token`, see lib/community-identity.ts) is a
// third, unrelated thing: it identifies the *browser*, not the person, and it
// keeps working for signed-out visitors exactly as before.

const COMMUNITY_TOKEN_KEY = "ip_community_token";

export function getCommunityToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(COMMUNITY_TOKEN_KEY);
}

export function setCommunityToken(token: string | null | undefined): void {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem(COMMUNITY_TOKEN_KEY, token);
}

export function clearCommunityToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(COMMUNITY_TOKEN_KEY);
}
