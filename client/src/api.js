import axios from "axios";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, ""),
  timeout: 15000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

// Support older local API instances that authenticate with bearer tokens.
// Current API sessions use an HttpOnly cookie, so this is a no-op for them.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
