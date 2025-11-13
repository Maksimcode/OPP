import axios from "axios";

interface LoginPayload {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

const http = axios.create({
  baseURL: "/api/v1"
});

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await http.post<TokenResponse>("/auth/login", payload);
    return data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const { data } = await http.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
    return data;
  },
  register: async (payload: LoginPayload & { full_name: string }): Promise<void> => {
    await http.post("/auth/register", payload);
  }
};