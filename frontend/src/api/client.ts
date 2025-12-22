import axios from "axios";

const ACCESS_TOKEN_KEY = "rg_access_token";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://maximcode-oppbackend.hf.space/api/v1",
  headers: {
    "Content-Type": "application/json"
  }
});

httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Add response interceptor to handle 401 (logout)
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      // Optional: redirect to login page
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

