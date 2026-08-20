import { createContext, useContext, useState, useEffect } from "react";
import api, { setToken, getToken, removeToken } from "../services/api";

const AuthContext = createContext(null);

function formatRole(role) {
  if (!role) return "Student";
  const r = String(role).toLowerCase().trim();
  if (r === "admin") return "Admin";
  if (r === "mentor") return "Mentor";
  return "Student";
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem("dropout_auth_token");
    if (!token) {
      localStorage.removeItem("dropout_auth_user");
      return null;
    }
    try {
      const stored = localStorage.getItem("dropout_auth_user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed?.role) parsed.role = formatRole(parsed.role);
      return parsed;
    } catch {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(() => !getToken());
  const [accounts, setAccounts] = useState([]);

  // Fetch available login accounts (public, no auth needed)
  useEffect(() => {
    api.getAccounts()
      .then((data) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  // Verify active session with backend if token exists
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthLoading(false);
      setCurrentUser(null);
      return;
    }
    setAuthLoading(true);
    api.getMe()
      .then((me) => {
        if (me) {
          const formatted = {
            id: me.id,
            username: me.username || me.email,
            name: me.name || me.full_name || me.username,
            email: me.email,
            role: formatRole(me.role),
            mentorId: me.mentorId || me.mentor_id,
            mentorName: me.mentorName || me.name,
            status: me.status || "Active",
          };
          setCurrentUser(formatted);
          localStorage.setItem("dropout_auth_user", JSON.stringify(formatted));
        } else {
          removeToken();
          setCurrentUser(null);
          localStorage.removeItem("dropout_auth_user");
        }
      })
      .catch(() => {
        removeToken();
        setCurrentUser(null);
        localStorage.removeItem("dropout_auth_user");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = async (username, password) => {
    try {
      const data = await api.login(username, password);
      if (data?.user) {
        const u = data.user;
        const normalizedUser = {
          id: u.id,
          username: u.username || u.email,
          name: u.name || u.full_name,
          email: u.email,
          role: formatRole(u.role),
          mentorId: u.mentorId || u.mentor_id,
          mentorName: u.mentorName || u.name,
          status: u.status || "Active",
        };
        if (normalizedUser.status === "Inactive") {
          removeToken();
          return { success: false, error: "This account has been deactivated. Please contact an administrator." };
        }
        setCurrentUser(normalizedUser);
        localStorage.setItem("dropout_auth_user", JSON.stringify(normalizedUser));
        return { success: true, user: normalizedUser };
      }
      return { success: false, error: "Invalid username or password." };
    } catch (err) {
      return { success: false, error: err?.message || "Invalid username or password." };
    }
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
    removeToken();
    try {
      localStorage.removeItem("dropout_auth_user");
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authLoading,
        accounts,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
