import { useState } from "react";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { DEMO_CREDENTIALS } from "../data/mockAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Frontend-only demo authentication — no real backend. Validates against
// DEMO_CREDENTIALS and simulates network latency before calling onLogin().
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const valid = email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
      setLoading(false);
      if (valid) {
        onLogin();
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }, 800);
  }

  function fillDemoCredentials() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-teal-600" />
          <span className="text-sm font-semibold text-slate-800 tracking-tight">Early-Warning System</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Sign in</h1>
          <p className="text-sm text-slate-500 mt-0.5 mb-5">Access the mentor dashboard.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@university.edu"
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-medium py-2.5 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Demo credentials
              </span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-teal-700 hover:text-teal-800 font-medium transition-colors"
              >
                Autofill
              </button>
            </div>
            <div className="font-mono mt-1 text-xs text-slate-500">
              {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">Frontend demo authentication only — no real backend.</p>
      </div>
    </div>
  );
}
