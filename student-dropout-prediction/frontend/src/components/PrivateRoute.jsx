import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccessDenied from "./AccessDenied";

export default function PrivateRoute({ allowedRoles, children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <AccessDenied />;
  }

  return children ? children : <Outlet />;
}
