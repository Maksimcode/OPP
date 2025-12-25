import { useMemo } from "react";

const ACCESS_TOKEN_KEY = "rg_access_token";
const REFRESH_TOKEN_KEY = "rg_refresh_token";

export const useAuth = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  return useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      accessToken: token,
      refreshToken: refreshToken,
      setAccessToken: (value: string) => localStorage.setItem(ACCESS_TOKEN_KEY, value),
      setRefreshToken: (value: string) => localStorage.setItem(REFRESH_TOKEN_KEY, value),
      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      },
      clearAccessToken: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
      clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }),
    [token, refreshToken]
  );
};
