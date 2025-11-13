import { useMemo } from "react";

const ACCESS_TOKEN_KEY = "rg_access_token";

export const useAuth = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  return useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      accessToken: token,
      setAccessToken: (value: string) => localStorage.setItem(ACCESS_TOKEN_KEY, value),
      clearAccessToken: () => localStorage.removeItem(ACCESS_TOKEN_KEY)
    }),
    [token]
  );
};
