import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

export function useToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const getToken = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  return getToken;
}
