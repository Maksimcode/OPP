import { httpClient } from "./client";

interface LoginPayload {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await httpClient.post<TokenResponse>("/auth/login", payload);
    return data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const { data } = await httpClient.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
    return data;
  },
  register: async (payload: LoginPayload & { full_name: string }): Promise<void> => {
    await httpClient.post("/auth/register", payload);
  },
  getMe: async (): Promise<User> => {
    const { data } = await httpClient.get<User>("/auth/me");
    return data;
  }
};
