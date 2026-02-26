import { useCallback, useState, useEffect } from "react";

const TOKEN_KEY = "auth_token";

export function useToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    setToken(stored);
  }, []);

  const getToken = useCallback(async () => {
    return token;
  }, [token]);

  const setAuthToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(newToken);
  }, []);

  const isAuthenticated = !!token;

  return { getToken, setAuthToken, isAuthenticated, token };
}
