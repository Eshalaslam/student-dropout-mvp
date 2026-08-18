import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ShieldCheck, User } from "lucide-react";
import { authenticate } from "../data/mockAuth";
import { ROLE_STYLES } from "../utils/useRbac";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { users, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (!username.trim()) { setError("Username is required."); return; }
    if (!password) { setError("Password is required."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = authenticate(username, password, users);
      setLoading(false);
      if (user) {
        const res = login(user);
        if (res.success) {
          navigate("/dashboard", { replace: true });
        } else {
          setError(res.error);
        }
      } else {
        setError("Invalid username or password. Please try again.");
      }
    }, 600);
  }

  function fillDemo(u) {
    setUsername(u.username);
    setPassword(u.password);
    setError("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-tight">Early-Warning System</div>
            <div className="text-[10px] text-teal-300 leading-tight">Student Dropout Prediction</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Sign in</h1>
          <p className="text-sm text-slate-500 mt-0.5 mb-5">Access the dashboard with your assigned credentials.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-600 mb-1">Username</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="username" type="text" autoComplete="username"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, priya, james"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 disabled:bg-slate-50"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input
                id="password" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 disabled:bg-slate-50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-medium py-2.5 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign in"}
            </button>
          </form>

          {/* Quick-fill demo pills */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-2.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Demo accounts — click to autofill
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {users.map((p) => {
                const rs = ROLE_STYLES[p.role] || ROLE_STYLES.Mentor;
                const isInactive = p.status === "Inactive";
                return (
                  <button
                    key={p.id || p.username}
                    onClick={() => fillDemo(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left group ${
                      isInactive
                        ? "border-slate-100 bg-slate-50 opacity-60 hover:opacity-100"
                        : "border-slate-100 hover:border-teal-200 hover:bg-teal-50/40"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0 group-hover:bg-teal-100">
                      {(p.name || p.username || "??").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate flex items-center gap-1.5">
                        {p.name || p.username}
                        {isInactive && (
                          <span className="text-[9px] px-1 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.username} / {p.password}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${rs.badge}`}>{p.role}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">Frontend demo auth only — no real backend.</p>
      </div>
    </div>
  );
}
