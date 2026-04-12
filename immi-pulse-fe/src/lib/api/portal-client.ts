import axios from "axios";

export const PORTAL_SESSION_STORAGE_KEY = "ip_portal_session";

const portalClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

portalClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem(PORTAL_SESSION_STORAGE_KEY);
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

portalClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem(PORTAL_SESSION_STORAGE_KEY);
    }
    return Promise.reject(error);
  }
);

export default portalClient;
