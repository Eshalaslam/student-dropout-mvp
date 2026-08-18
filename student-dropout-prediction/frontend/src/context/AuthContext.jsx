import { createContext, useContext, useState, useEffect } from "react";
import { USERS } from "../data/mockAuth";

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

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dropout_auth_users", JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users to localStorage", e);
    }
  }, [users]);

  const login = (user) => {
    if (user.status === "Inactive") {
      return { success: false, error: "This account has been deactivated. Please contact an administrator." };
    }
    setCurrentUser(user);
    try {
      localStorage.setItem("dropout_auth_user", JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save auth to localStorage", e);
    }
    return { success: true };
  };

  const logout = () => {
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
