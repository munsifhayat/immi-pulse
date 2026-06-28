// The anonymous, per-device community identity — the "temporary user" a visitor
// gets the moment they arrive. The server issues a handle + colour + device
// token at bootstrap; we persist the token in localStorage so every later visit
// (and every write) maps back to the same identity. When the visitor later
// creates a real portal account, the device token is what links the two.

const DEVICE_TOKEN_KEY = "ip_device_token";

export interface CommunityIdentity {
  handle: string;
  color: string;
  initials: string;
  journeys_posted: number;
  is_claimed: boolean;
  can_post_timeline: boolean;
  device_token?: string | null;
}

export function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string | null | undefined): void {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

export function clearDeviceToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEVICE_TOKEN_KEY);
}
