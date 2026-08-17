import { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Database,
  BarChart3,
  Filter,
} from "lucide-react";
import KpiCard from "../components/KpiCard";
import {
  FAIRNESS_ATTRIBUTES,
  FAIRNESS_DATA,
  FLAG_THRESHOLD,
  FEATURE_INFLUENCE,
  ACCESS_LOG,
  DEFAULT_PRIVACY_DOC,
} from "../data/mockAudit";

// ─── helpers ─────────────────────────────────────────────────────────────────
function pct(v) {
  return `${Math.round(v * 100)}%`;
}

function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function isFlagged(groupRow, overall) {
  const metrics = ["recall", "fnr", "fpr", "selectionRate"];
  return metrics.some((m) => Math.abs(groupRow[m] - overall[m]) > FLAG_THRESHOLD);
}

function MetricDelta({ val, baseline }) {
  const delta = val - baseline;
  if (Math.abs(delta) < 0.001) return <span className="text-slate-400 text-xs">—</span>;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-medium ${positive ? "text-rose-600" : "text-emerald-600"}`}>
      {positive ? "+" : ""}{pct(delta)}
    </span>
  );
}

// ─── FairnessBar — a mini horizontal bar showing a 0-100 metric ──────────────
function FairnessBar({ value, baseline, metric }) {
  const flagged = Math.abs(value - baseline) > FLAG_THRESHOLD;
  const color = flagged
    ? metric === "recall"
      ? "bg-rose-400"
      : "bg-amber-400"
    : "bg-teal-500";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-700 w-9 text-right flex-shrink-0">{pct(value)}</span>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ─── SortableTableHeader ─────────────────────────────────────────────────────
function Th({ col, label, sortKey, sortAsc, onSort, className = "" }) {
  const active = sortKey === col;
  return (
    <th
      className={`px-4 py-3 font-medium text-left cursor-pointer select-none hover:text-slate-700 ${className}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3 opacity-20" />
        )}
      </div>
    </th>
  );
}

// ─── FairnessSection ─────────────────────────────────────────────────────────
function FairnessSection() {
  const [attrId, setAttrId] = useState("gender");
  const data = FAIRNESS_DATA[attrId];
  const { overall, groups } = data;

  const flaggedGroups = groups.filter((g) => isFlagged(g, overall));

  return (
    <Section id="fairness" icon={BarChart3} title="Fairness Metrics">
      {/* attribute selector */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-xs font-medium text-slate-500 flex-shrink-0">Audit attribute:</label>
        <div className="flex flex-wrap gap-2">
          {FAIRNESS_ATTRIBUTES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAttrId(a.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                attrId === a.id
                  ? "bg-teal-50 text-teal-700 border-teal-300"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* flagging summary */}
      {flaggedGroups.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-amber-800 mb-0.5">
              {flaggedGroups.length} group{flaggedGroups.length > 1 ? "s" : ""} flagged for fairness review
            </div>
            <div className="text-xs text-amber-700 leading-relaxed">
              {flaggedGroups.map((g) => {
                const parts = [];
                if (Math.abs(g.fnr - overall.fnr) > FLAG_THRESHOLD)
                  parts.push(`higher false-negative rate (+${pct(g.fnr - overall.fnr)} vs overall)`);
                if (Math.abs(g.fpr - overall.fpr) > FLAG_THRESHOLD)
                  parts.push(`higher false-positive rate (+${pct(g.fpr - overall.fpr)} vs overall)`);
                if (Math.abs(g.recall - overall.recall) > FLAG_THRESHOLD)
                  parts.push(`lower recall (${pct(g.recall - overall.recall)} vs overall)`);
                return (
                  <span key={g.group} className="block">
                    <strong>{g.group}:</strong> {parts.join("; ") || "metric deviation detected"}.
                    {g.fnr - overall.fnr > FLAG_THRESHOLD
                      ? " Model may be under-flagging at-risk students in this group."
                      : ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* metrics table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium text-left">Group</th>
              <th className="px-4 py-3 font-medium text-left">N</th>
              <th className="px-4 py-3 font-medium text-left min-w-[140px]">Recall</th>
              <th className="px-4 py-3 font-medium text-left min-w-[140px]">False Neg. Rate</th>
              <th className="px-4 py-3 font-medium text-left min-w-[140px]">False Pos. Rate</th>
              <th className="px-4 py-3 font-medium text-left min-w-[140px]">Selection Rate</th>
              <th className="px-4 py-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* overall row */}
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="px-4 py-3 font-semibold text-slate-700">Overall</td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{overall.n}</td>
              {["recall","fnr","fpr","selectionRate"].map((m) => (
                <td key={m} className="px-4 py-3">
                  <FairnessBar value={overall[m]} baseline={overall[m]} metric={m} />
                </td>
              ))}
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-slate-400 font-mono">baseline</span>
              </td>
            </tr>
            {/* group rows */}
            {groups.map((g) => {
              const flagged = isFlagged(g, overall);
              return (
                <tr
                  key={g.group}
                  className={`border-b border-slate-100 last:border-0 transition-colors border-l-2 ${
                    flagged ? "border-l-amber-400 bg-amber-50/30" : "border-l-transparent"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{g.group}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{g.n}</td>
                  {["recall","fnr","fpr","selectionRate"].map((m) => (
                    <td key={m} className="px-4 py-3">
                      <FairnessBar value={g[m]} baseline={overall[m]} metric={m} />
                      <MetricDelta val={g[m]} baseline={overall[m]} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {flagged ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-2.5 h-2.5" /> Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" /> OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Groups are flagged (amber) when any metric deviates from the overall baseline by more than {pct(FLAG_THRESHOLD)}.
        Delta values shown below each bar; red = worse than average, green = better.
      </p>
    </Section>
  );
}

// ─── FeatureInfluenceSection ─────────────────────────────────────────────────
function FeatureInfluenceSection() {
  return (
    <Section id="features" icon={Database} title="Feature Influence Disclosure">
      <p className="text-xs text-slate-500 mb-4">
        Shows whether each attribute was used as a direct model input, or only used during fairness auditing.
        Protected/sensitive attributes are never used as model inputs.
      </p>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium text-left">Feature</th>
              <th className="px-4 py-3 font-medium text-center">Sensitive / Protected</th>
              <th className="px-4 py-3 font-medium text-center">Used in Model</th>
              <th className="px-4 py-3 font-medium text-center">Audit Only</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_INFLUENCE.map((f) => (
              <tr key={f.feature} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{f.feature}</td>
                <td className="px-4 py-3 text-center">
                  {f.sensitive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                      <Lock className="w-2.5 h-2.5" /> Sensitive
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {f.usedInModel ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                      <EyeOff className="w-2.5 h-2.5" /> No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {f.auditOnly ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Eye className="w-2.5 h-2.5" /> Audit only
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── AccessLogSection ────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

function AccessLogSection() {
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const allUsers = useMemo(() => ["All", ...new Set(ACCESS_LOG.map((l) => l.user))], []);
  const allActions = useMemo(() => ["All", ...new Set(ACCESS_LOG.map((l) => l.action))], []);

  function handleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = useMemo(() => {
    return ACCESS_LOG
      .filter((l) => userFilter === "All" || l.user === userFilter)
      .filter((l) => actionFilter === "All" || l.action === actionFilter)
      .filter((l) =>
        search === "" ||
        l.user.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.studentId && l.studentId.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        let va = a[sortKey] || "", vb = b[sortKey] || "";
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [search, userFilter, actionFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const ACTION_COLORS = {
    "Viewed Student":    "bg-sky-50 text-sky-700 border-sky-200",
    "Added Note":        "bg-teal-50 text-teal-700 border-teal-200",
    "Updated Status":    "bg-violet-50 text-violet-700 border-violet-200",
    "Exported Report":   "bg-amber-50 text-amber-700 border-amber-200",
    "Viewed Audit Page": "bg-slate-100 text-slate-600 border-slate-200",
    "Updated Privacy Doc":"bg-rose-50 text-rose-700 border-rose-200",
  };

  const selectClass = "px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200";

  return (
    <Section id="access-log" icon={Filter} title="Data Access Log">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search user, action, ID…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </div>
        <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} className={selectClass}>
          {allUsers.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className={selectClass}>
          {allActions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} records</span>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <Th col="timestamp" label="Timestamp" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              <Th col="user" label="User" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              <Th col="role" label="Role" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              <Th col="action" label="Action" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              <Th col="studentId" label="Student ID" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {paginated.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{fmt(l.timestamp)}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{l.user}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    l.role === "Admin" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"
                  }`}>{l.role}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${ACTION_COLORS[l.action] || "bg-slate-100 text-slate-600"}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{l.studentId || "—"}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No records match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-400">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >Previous</button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >Next</button>
        </div>
      </div>
    </Section>
  );
}

// ─── PrivacyDocSection ────────────────────────────────────────────────────────
function PrivacyDocSection() {
  const [editing, setEditing] = useState(false);
  const [doc, setDoc] = useState(DEFAULT_PRIVACY_DOC);
  const [saved, setSaved] = useState(DEFAULT_PRIVACY_DOC);

  function handleSave() {
    setSaved(doc);
    setEditing(false);
  }

  // Very basic markdown-ish renderer (bold + newlines only)
  function renderDoc(text) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i} className={line.startsWith("**") ? "block mt-3 first:mt-0" : "block"}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-slate-800">{part}</strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </span>
      );
    });
  }

  return (
    <Section id="privacy-doc" icon={FileText} title="Data Usage & Privacy Documentation">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">
          Admin-editable policy document. Use <code className="bg-slate-100 px-1 rounded text-xs">**text**</code> for bold headings.
        </p>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setDoc(saved); setEditing(false); }}
              className="text-xs text-slate-500 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          rows={18}
          className="w-full px-4 py-3 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 resize-y leading-relaxed"
        />
      ) : (
        <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed text-sm bg-slate-50 border border-slate-100 rounded-lg px-5 py-4">
          {renderDoc(saved)}
        </div>
      )}
    </Section>
  );
}

// ─── Export helpers ──────────────────────────────────────────────────────────
function exportCSV() {
  const header = "Timestamp,User,Role,Action,StudentID\n";
  const rows = ACCESS_LOG.map(
    (l) => `"${l.timestamp}","${l.user}","${l.role}","${l.action}","${l.studentId || ""}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── BiasPrivacyAudit (main page) ────────────────────────────────────────────
export default function BiasPrivacyAudit() {
  // KPIs derived from access log
  const totalAccesses = ACCESS_LOG.length;
  const uniqueUsers   = new Set(ACCESS_LOG.map((l) => l.user)).size;
  const exports       = ACCESS_LOG.filter((l) => l.action === "Exported Report").length;

  // Count flagged groups across all attributes
  let flaggedCount = 0;
  Object.values(FAIRNESS_DATA).forEach(({ overall, groups }) => {
    groups.forEach((g) => { if (isFlagged(g, overall)) flaggedCount++; });
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldAlert className="w-5 h-5 text-teal-700" />
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Bias & Privacy Audit</h1>
          </div>
          <p className="text-sm text-slate-500">
            Monitor model fairness across student groups and track data access for compliance.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Lock className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              Admin access only
            </span>
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Audit CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Access log entries" value={totalAccesses} accent="text-slate-900" />
        <KpiCard label="Unique users logged" value={uniqueUsers} accent="text-teal-700" />
        <KpiCard label="Report exports" value={exports} accent="text-amber-600" />
        <KpiCard
          label="Fairness flags"
          value={flaggedCount}
          sublabel="groups needing review"
          accent={flaggedCount > 0 ? "text-rose-600" : "text-emerald-600"}
        />
      </div>

      {/* Sections */}
      <FairnessSection />
      <FeatureInfluenceSection />
      <AccessLogSection />
      <PrivacyDocSection />
    </div>
  );
}
