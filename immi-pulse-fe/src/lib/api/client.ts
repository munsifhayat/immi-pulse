import axios from "axios";

const TOKEN_KEY = "ip_token";
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
});

// Attach JWT (if signed in) + the anonymous device token on every request.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
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
