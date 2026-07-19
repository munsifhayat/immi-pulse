import axios from "axios";

const TOKEN_KEY = "ip_token";
// The community's pseudonymous member session. Separate from the console's token on
// purpose — see src/lib/community/session.ts.
const COMMUNITY_TOKEN_KEY = "ip_community_token";
// Per-device anonymous community identity (the "temporary user"). Lives only in
// the browser; the server issues it at bootstrap and resolves every community
// write back to it. See src/lib/community-identity.ts.
const DEVICE_TOKEN_KEY = "ip_device_token";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "",
    "Content-Type": "application/json",
  },
  // The device token also travels as a server-set HttpOnly cookie, which is
  // what survives Safari's seven-day eviction of script-writable storage. It
  // only reaches a cross-origin backend when credentials are included.
  withCredentials: true,
});

// Attach the right bearer token + the anonymous device token on every request.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Community routes take the community session; everything else takes the
    // console's. Both can exist at once on a shared machine, and sending the
    // console's JWT to /community/me/* would 401 against a different audience.
    const isCommunity = (config.url ?? "").startsWith("/community");
    const token = localStorage.getItem(
      isCommunity ? COMMUNITY_TOKEN_KEY : TOKEN_KEY
    );
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${token}`;
    }
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (deviceToken) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["X-Device-Token"] =
        deviceToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Could redirect to /login here later. Not auto-redirecting yet to keep
      // public form flow + dashboard isolated.
      console.error("Unauthorized:", error.response?.data?.detail);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
