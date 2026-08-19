import { useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  UserX,
  UserCheck,
  X,
  Key,
  Shield,
  Users as UsersIcon,
  RefreshCw,
} from "lucide-react";
import KpiCard from "../components/KpiCard";
import api from "../services/api";

import { USERS } from "../data/mockAuth";

// Helper for generating secure temporary passwords
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "M@";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function ManageMentors() {
  // Fetch mentors from DB
  const [dbMentors, setDbMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function refreshMentors() {
    setLoading(true);
    setLoadError("");
    api.getMentors()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDbMentors(data);
        } else {
          // Fallback to mock mentors if empty
          const fallback = USERS.filter((u) => u.role === "Mentor");
          setDbMentors(fallback);
        }
      })
      .catch((err) => {
        console.error("Failed to load mentors:", err);
        const fallback = USERS.filter((u) => u.role === "Mentor");
        setDbMentors(fallback);
        setLoadError(err?.message || "Failed to load mentors from database. Showing default mentors.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { refreshMentors(); }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMentor, setEditMentor] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editError, setEditError] = useState("");

  // Add Form State
  const [addForm, setAddForm] = useState({
    name: "",
    username: "",
    password: generateTempPassword(),
    mentorId: "",
    email: "",
  });
  const [formError, setFormError] = useState("");

  // Use DB mentors (or fallback)
  const mentors = dbMentors.length > 0 ? dbMentors : USERS.filter((u) => u.role === "Mentor");

  // Filtered mentors list
  const filteredMentors = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    return mentors
      .filter((m) => statusFilter === "All" || m.status === statusFilter)
      .filter((m) => {
        if (!q) return true;
        const name = (m.name || m.full_name || "").toLowerCase();
        const username = (m.username || "").toLowerCase();
        const mId = (m.mentorId || m.mentor_id || "").toLowerCase();
        const email = (m.email || "").toLowerCase();
        return name.includes(q) || username.includes(q) || mId.includes(q) || email.includes(q);
      });
  }, [mentors, statusFilter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const total = mentors.length;
    const active = mentors.filter((m) => m.status === "Active").length;
    const inactive = total - active;
    const totalAssigned = mentors.reduce((a, m) => a + (m.assigned_students_count || 0), 0);
    return { total, active, inactive, totalAssigned };
  }, [mentors]);

  // Open Add Modal
  function handleOpenAdd() {
    setAddForm({
      name: "",
      username: "",
      password: generateTempPassword(),
      mentorId: "",
      email: "",
    });
    setFormError("");
    setCreatedCredentials(null);
    setShowAddModal(true);
  }

  // Auto-suggest username and email as name is typed
  function handleNameChange(name) {
    const parts = name.trim().toLowerCase().split(/\s+/);
    const suggestedUsername = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || "";
    setAddForm((prev) => ({
      ...prev,
      name,
      username: prev.username ? prev.username : suggestedUsername,
      email: prev.email ? prev.email : (suggestedUsername ? `${suggestedUsername}@university.edu` : ""),
    }));
  }

  // Submit Add Mentor
  function handleAddSubmit(e) {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!addForm.username.trim()) {
      setFormError("Username is required.");
      return;
    }
    if (addForm.password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    api.createMentor({
      name: addForm.name.trim(),
      username: addForm.username.trim().toLowerCase(),
      password: addForm.password,
      mentorId: addForm.mentorId,
      email: addForm.email,
    }).then(() => {
      setCreatedCredentials({
        name: addForm.name.trim(),
        username: addForm.username.trim().toLowerCase(),
        password: addForm.password,
        mentorId: addForm.mentorId,
      });
      setShowAddModal(false);
      refreshMentors();
    }).catch((err) => {
      setFormError(err?.message || "Failed to create mentor.");
    });
  }

  // Copy created credentials
  function handleCopyCredentials() {
    if (!createdCredentials) return;
    const text = `Mentor Account Created:\nName: ${createdCredentials.name}\nMentor ID: ${createdCredentials.mentorId}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Submit Edit Mentor
  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editMentor.name.trim()) return;
    setEditError("");
    api.updateMentor(editMentor.mentorId, {
      name: editMentor.name,
      email: editMentor.email,
    }).then(() => {
      setEditMentor(null);
      setEditError("");
      refreshMentors();
    }).catch((err) => {
      setEditError(err?.message || "Failed to update mentor.");
    });
  }

  // Confirm Deactivation / Reactivation
  function handleConfirmDeactivate() {
    if (!deactivateTarget) return;
    api.toggleMentorStatus(deactivateTarget.mentorId).then(() => {
      setDeactivateTarget(null);
      refreshMentors();
    }).catch((err) => {
      console.error("Failed to toggle mentor status:", err);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <UsersIcon className="w-5 h-5 text-teal-700" />
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Manage Mentors</h1>
          </div>
          <p className="text-sm text-slate-500">
            Register, edit, and configure mentor accounts and student assignments.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Add Mentor
        </button>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-800">{loadError}</p>
              <p className="text-xs text-rose-600 mt-0.5">You may need to log in again.</p>
            </div>
          </div>
          <button
            onClick={refreshMentors}
            className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success banner after mentor creation */}
      {createdCredentials && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-900">
                Mentor Added Successfully ({createdCredentials.mentorId})
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5 mb-2">
                Share these temporary login credentials with <strong>{createdCredentials.name}</strong>:
              </p>
              <div className="inline-flex items-center gap-3 bg-white px-3 py-1.5 rounded-md border border-emerald-200 text-xs font-mono text-slate-800 shadow-xs">
                <span>
                  Username: <strong className="text-teal-800">{createdCredentials.username}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Password: <strong className="text-teal-800">{createdCredentials.password}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyCredentials}
              className="flex items-center gap-1.5 text-xs bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/50 px-3 py-1.5 rounded-md transition-colors font-medium shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </button>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Mentors" value={kpis.total} accent="text-slate-900" />
        <KpiCard label="Active Mentors" value={kpis.active} accent="text-emerald-600" />
        <KpiCard label="Inactive Mentors" value={kpis.inactive} accent="text-slate-400" />
        <KpiCard label="Assigned Students" value={kpis.totalAssigned} accent="text-teal-700" sublabel="across cohort" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, or Mentor ID…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Mentors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Mentor</th>
                <th className="px-5 py-3 font-medium">Username</th>
                <th className="px-5 py-3 font-medium">Mentor ID</th>
                <th className="px-5 py-3 font-medium text-center">Assigned Students</th>
                <th className="px-5 py-3 font-medium text-center">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMentors.map((m, idx) => {
                const assignedCount = m.assigned_students_count || 0;
                const isActive = m.status === "Active" || !m.status;
                const mName = m.name || m.full_name || m.username || "Mentor";
                const initials = mName.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";
                const mentorIdDisplay = m.mentorId || m.mentor_id || "—";

                return (
                  <tr
                    key={m.id || m.mentorId || m.mentor_id || idx}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors ${
                      !isActive ? "bg-slate-50/40 opacity-75" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          isActive ? "bg-teal-700" : "bg-slate-400"
                        }`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">{mName}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{m.email || `${m.username || "mentor"}@university.edu`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{m.username || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {mentorIdDisplay}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                        {assignedCount} student{assignedCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditError(""); setEditMentor({ ...m }); }}
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeactivateTarget(m)}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                            isActive
                              ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Reactivate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMentors.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No mentors found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add Mentor Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Add New Mentor</h2>
                  <p className="text-xs text-slate-400">Create a mentor profile and login credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Mentor ID & Role (Read-only) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mentor ID</label>
                  <input
                    type="text"
                    disabled
                    value={addForm.mentorId}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Role</label>
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-teal-50/60 border border-teal-200/80 rounded-md text-xs font-semibold text-teal-800">
                    <Shield className="w-3.5 h-3.5 text-teal-600" /> Mentor (Fixed)
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Gupta"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="e.g. ramesh.gupta"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. ramesh@university.edu"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>

              {/* Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-600">Temporary Password *</label>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, password: generateTempPassword() })}
                    className="flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 bg-slate-50/50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Password will be displayed once upon creation to share with the mentor.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-md transition-colors font-medium shadow-xs"
                >
                  Create Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Mentor Modal ───────────────────────────────────────────── */}
      {editMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Edit Mentor</h2>
                  <p className="text-xs text-slate-400">Update mentor information</p>
                </div>
              </div>
              <button
                onClick={() => setEditMentor(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mentor ID (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={editMentor.mentorId || "—"}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Username (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={editMentor.username}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editMentor.name}
                  onChange={(e) => setEditMentor({ ...editMentor, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editMentor.email}
                  onChange={(e) => setEditMentor({ ...editMentor, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditMentor(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-md transition-colors font-medium shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Deactivate Confirmation Dialog ─────────────────────────────── */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3.5 ${
              deactivateTarget.status === "Active" ? "bg-rose-100" : "bg-emerald-100"
            }`}>
              {deactivateTarget.status === "Active" ? (
                <UserX className="w-6 h-6 text-rose-600" />
              ) : (
                <UserCheck className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1.5">
              {deactivateTarget.status === "Active" ? "Deactivate Mentor Account?" : "Reactivate Mentor Account?"}
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {deactivateTarget.status === "Active" ? (
                <>
                  This mentor has{" "}
                  <strong>{deactivateTarget.assigned_students_count || 0} assigned student(s)</strong>.
                  Deactivating will prevent login access but will preserve historical intervention notes and student assignments.
                </>
              ) : (
                <>
                  Reactivating <strong>{deactivateTarget.name}</strong> will restore their login access immediately.
                </>
              )}
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                className={`px-4 py-2 text-xs text-white rounded-md transition-colors font-medium shadow-xs ${
                  deactivateTarget.status === "Active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {deactivateTarget.status === "Active" ? "Confirm Deactivation" : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
