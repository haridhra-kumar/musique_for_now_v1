import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth-storage");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth-storage");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// Analysis
export const analyzeApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/analyze/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  status: (jobId: string) => api.get(`/analyze/${jobId}/status`),
  result: (jobId: string) => api.get(`/analyze/${jobId}/result`),
};

// User
export const userApi = {
  history: () => api.get("/user/history"),
  progress: () => api.get("/user/progress"),
};

// Credits
export const creditsApi = {
  packs: () => api.get("/credits/packs"),
  purchase: (packId: string) => api.post("/credits/purchase", { pack_id: packId }),
};

export default api;
