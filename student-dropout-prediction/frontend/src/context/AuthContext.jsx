import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("dropout_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("dropout_auth_user", JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save auth to localStorage", e);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("dropout_auth_user");
    } catch (e) {
      console.error("Failed to clear auth from localStorage", e);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
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
