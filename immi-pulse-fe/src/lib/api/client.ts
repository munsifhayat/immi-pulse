import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Invalid API key");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
