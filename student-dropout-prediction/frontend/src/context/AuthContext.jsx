import { createContext, useContext, useState, useEffect } from "react";
import { USERS, authenticate } from "../data/mockAuth";
import api, { setToken, getToken, removeToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Active users registry in state (persisted to localStorage for smooth development)
  const [users, setUsers] = useState(() => {
    try {
      const stored = localStorage.getItem("dropout_auth_users");
      return stored ? JSON.parse(stored) : USERS;
    } catch {
      return USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("dropout_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Verify active session with backend if token exists
  useEffect(() => {
    const token = getToken();
    if (token) {
      api.getMe()
        .then((me) => {
          if (me) {
            const formatted = {
              id: me.id,
              username: me.username || me.email,
              name: me.name || me.full_name || me.username,
              email: me.email,
              role: me.role === "admin" ? "Admin" : me.role === "mentor" ? "Mentor" : (me.role || "Mentor"),
              mentorId: me.mentorId,
              mentorName: me.mentorName || me.name,
              status: me.status || "Active",
            };
            setCurrentUser(formatted);
            localStorage.setItem("dropout_auth_user", JSON.stringify(formatted));
          }
        })
        .catch(() => {
          // If offline, keep local user
        });
    }
  }, []);

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dropout_auth_users", JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users to localStorage", e);
    }
  }, [users]);

  const login = async (arg1, arg2) => {
    let userObj = null;
    let username = "";
    let password = "";

    if (typeof arg1 === "object" && arg1 !== null) {
      userObj = arg1;
      username = userObj.username;
      password = userObj.password;
    } else {
      username = arg1;
      password = arg2;
    }

    if (userObj && userObj.status === "Inactive") {
      return { success: false, error: "This account has been deactivated. Please contact an administrator." };
    }

    // Try live backend login first
    try {
      const data = await api.login(username, password);
      if (data?.user) {
        const u = data.user;
        const normalizedUser = {
          id: u.id,
          username: u.username || u.email,
          name: u.name || u.full_name,
          email: u.email,
          role: u.role === "admin" ? "Admin" : u.role === "mentor" ? "Mentor" : (u.role || "Mentor"),
          mentorId: u.mentorId,
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
    } catch (err) {
      // Backend not running or error — fallback to local mock authentication
      const localUser = userObj || authenticate(username, password, users);
      if (localUser) {
        if (localUser.status === "Inactive") {
          return { success: false, error: "This account has been deactivated. Please contact an administrator." };
        }
        setCurrentUser(localUser);
        localStorage.setItem("dropout_auth_user", JSON.stringify(localUser));
        return { success: true, user: localUser };
      }
      return { success: false, error: err?.message || "Invalid username or password." };
    }

    // Fallback if not returned yet
    const localUser = userObj || authenticate(username, password, users);
    if (localUser) {
      if (localUser.status === "Inactive") {
        return { success: false, error: "This account has been deactivated. Please contact an administrator." };
      }
      setCurrentUser(localUser);
      localStorage.setItem("dropout_auth_user", JSON.stringify(localUser));
      return { success: true, user: localUser };
    }

    return { success: false, error: "Invalid username or password. Please try again." };
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
    try {
      localStorage.removeItem("dropout_auth_user");
    } catch (e) {
      console.error("Failed to clear auth from localStorage", e);
    }
  };

  /**
   * Add a new mentor. Role is strictly enforced as "Mentor".
   */
  const addMentor = ({ name, username, password, mentorId, email }) => {
    const trimmedUser = username.trim().toLowerCase();
    const existing = users.find((u) => u.username.toLowerCase() === trimmedUser);
    if (existing) {
      return { success: false, error: `Username "${trimmedUser}" is already taken.` };
    }

    const newMentor = {
      id: `mentor-${Date.now()}`,
      username: trimmedUser,
      password: password || "Mentor@2026",
      name: name.trim(),
      email: email ? email.trim() : `${trimmedUser}@university.edu`,
      role: "Mentor",
      mentorId: mentorId || getNextMentorId(),
      mentorName: name.trim(),
      status: "Active",
    };

    setUsers((prev) => [...prev, newMentor]);
    return { success: true, mentor: newMentor };
  };

  /**
   * Edit mentor details. Protects role and mentorId from tampering.
   */
  const updateMentor = (id, updates) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          return {
            ...u,
            name: updates.name ? updates.name.trim() : u.name,
            mentorName: updates.name ? updates.name.trim() : u.name,
            email: updates.email ? updates.email.trim() : u.email,
            status: updates.status || u.status,
          };
        }
        return u;
      })
    );
  };

  /**
   * Toggle active/inactive status (soft-delete).
   */
  const toggleMentorStatus = (id) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === "Active" ? "Inactive" : "Active";
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  // Helper to compute next available Mentor ID (e.g. M004)
  const getNextMentorId = () => {
    const mentorIds = users
      .map((u) => u.mentorId)
      .filter(Boolean)
      .map((id) => parseInt(id.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    const maxNum = mentorIds.length > 0 ? Math.max(...mentorIds) : 0;
    return `M${String(maxNum + 1).padStart(3, "0")}`;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        addMentor,
        updateMentor,
        toggleMentorStatus,
        getNextMentorId,
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
