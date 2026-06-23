import { createContext, useEffect, useMemo, useState } from "react";
import { loginApi, logoutApi, registerApi } from "../api/auth";
import { getMe } from "../api/users";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if there's a valid Cognito session the client attaches its token and
  // getMe() resolves (provisioning the local user on first call); otherwise 401.
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload) => {
    await loginApi(payload);
    const me = await getMe();
    setUser(me);
    return me;
  };
  const register = async (payload) => {
    await registerApi(payload);
    const me = await getMe();
    setUser(me);
    return me;
  };
  const logout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: !!user, login, register, logout, setUser }),
    [user, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
