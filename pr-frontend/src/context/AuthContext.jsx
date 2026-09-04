import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import API from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Derive permissions directly from user state to ensure single source of truth
  const permissionSet = useMemo(() => {
    return new Set(user?.permissions || []);
  }, [user]);

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
       const response = await API.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (err) {
      console.error("Failed to load authenticated user:", err);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (credentials) => {
  const response = await API.post("/api/v1/auth/login", credentials);
  const accessToken = response.data.access_token;
  const userProfile = response.data.user; // Grab user data from backend response

  // 1. Persist and update token state strings
  localStorage.setItem("token", accessToken);
  setToken(accessToken);

  // 2. ⭐ Fix: Update user context state immediately so route guards don't kick you out!
  setUser(userProfile); 

  return userProfile;
}, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  // Optimized: Only changes reference if the specific derived permission Set updates
  const hasPermission = useCallback((permission) => {
    return permissionSet.has(permission);
  }, [permissionSet]);

  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      hasPermission,
      hasRole,
    }),
    [user, loading, login, logout, hasPermission, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}