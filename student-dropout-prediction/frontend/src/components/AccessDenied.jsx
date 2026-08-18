import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-rose-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Access Restricted</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-sm">
        Your role does not have permission to view this page. Contact an administrator if you require access.
      </p>
      <button
        onClick={() => navigate("/dashboard", { replace: true })}
        className="text-sm bg-teal-700 text-white font-medium px-4 py-2 rounded-md hover:bg-teal-800 transition-colors shadow-sm"
      >
        Return to Dashboard
      </button>
    </div>
  );
}
