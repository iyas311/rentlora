import { createContext, useEffect, useMemo, useState } from "react";
import { loginApi, logoutApi, registerApi } from "../api/auth";
import { getMe } from "../api/users";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return setLoading(false);
    getMe().then(setUser).finally(() => setLoading(false));
  }, []);

  const login = async (payload) => {
    const data = await loginApi(payload);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data;
  };
  const register = async (payload) => {
    const data = await registerApi(payload);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data;
  };
  const logout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, isAuthenticated: !!user, login, register, logout, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
