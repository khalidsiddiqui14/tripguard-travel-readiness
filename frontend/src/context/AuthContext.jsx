import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { api, setToken, clearToken } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const login = async (credentials) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    const token = data?.access_token || data?.token || null;
    const loggedUser = data?.user || data?.data || null;

    if (!token) {
      throw new Error("Login failed. Token not received.");
    }

    setToken(token);
    // Agar backend ne user object alag se nahi bheja, to /auth/me se le lo
    if (loggedUser) {
      setUser(loggedUser);
      return loggedUser;
    }

    const currentUser = await api("/auth/me");
    setUser(currentUser);
    return currentUser;
  };

  const register = async (details) => {
    return api("/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });
  };

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("tripguard_token");

      if (!token) {
        setUser(null);
        return;
      }

      const currentUser = await api("/auth/me");
      setUser(currentUser?.user || currentUser);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}