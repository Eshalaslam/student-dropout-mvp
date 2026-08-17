import { useState, useMemo } from "react";
import {
  FileText, Download, Copy, Check, ChevronUp, ChevronDown,
  Search, Calendar, BarChart3, ClipboardList, ShieldAlert,
  Users, Clock, Trash2, Plus, ToggleLeft, ToggleRight, FileDown,
} from "lucide-react";
import RiskBadge from "../components/RiskBadge";
import KpiCard from "../components/KpiCard";
import { INTERVENTION_DATA, MENTORS } from "../data/mockInterventions";
import { REPORT_HISTORY, INITIAL_SCHEDULED } from "../data/mockReports";

const REPORT_TYPES = [
  { id: "at-risk",      label: "At-Risk Students",       icon: Users,       color: "rose",   description: "Flagged students with risk band, score, and key risk drivers." },
  { id: "intervention", label: "Intervention Progress",  icon: ClipboardList, color: "sky",  description: "Status breakdown per mentor and department." },
  { id: "dept-trend",  label: "Dept. Risk Trend",        icon: BarChart3,   color: "teal",   description: "Aggregate dropout risk stats per department." },
  { id: "audit",       label: "Full Audit Report",       icon: ShieldAlert, color: "violet", description: "Fairness metrics and data access log." },
];
const TYPE_COLORS = {
  "at-risk":     { badge: "bg-rose-50 text-rose-700 border-rose-200",     card: "bg-rose-50/40 border-rose-300",     icon: "text-rose-600",   dot: "bg-rose-400"   },
  "intervention":{ badge: "bg-sky-50 text-sky-700 border-sky-200",         card: "bg-sky-50/40 border-sky-300",       icon: "text-sky-600",    dot: "bg-sky-400"    },
  "dept-trend":  { badge: "bg-teal-50 text-teal-700 border-teal-200",     card: "bg-teal-50/40 border-teal-300",     icon: "text-teal-600",   dot: "bg-teal-400"   },
  "audit":       { badge: "bg-violet-50 text-violet-700 border-violet-200",card: "bg-violet-50/40 border-violet-300",icon: "text-violet-600", dot: "bg-violet-400" },
};
const TYPE_LABELS = { "at-risk":"At-Risk Students", intervention:"Intervention Progress", "dept-trend":"Dept. Risk Trend", audit:"Full Audit" };
const DEPARTMENTS = ["All", ...new Set(INTERVENTION_DATA.map((s) => s.department))];
const ALL_MENTORS  = ["All", ...MENTORS.filter((m) => m !== "Unassigned"), "Unassigned"];
const INT_STATUSES = ["All", "Not Started", "In Progress", "Resolved", "Escalated"];
const RISK_BANDS   = ["All", "High", "Medium", "Low"];

function pct(v) { return `${Math.round(v * 100)}%`; }
function fmtLong(ts) {
  if (!ts) return "--";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})+" "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
}
function downloadCSV(content, filename) {
  const blob = new Blob([content],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function buildCSV(rows, type) {
  if (type === "at-risk") {
    return "Student ID,Name,Department,Semester,Risk,Dropout Prob,Approval Rate,Attendance\n" +
      rows.map((s)=>`"${s.student_id}","${s.student_name}","${s.department}",${s.semester},"${s.risk_category}",${pct(s.dropout_probability)},${pct(s.approval_rate)},${s.attendance_percentage}%`).join("\n");
  }
  if (type === "intervention") {
    return "Student ID,Name,Department,Risk,Mentor,Status,Last Updated,Notes\n" +
      rows.map((s)=>`"${s.student_id}","${s.student_name}","${s.department}","${s.risk_category}","${s.assigned_mentor}","${s.intervention_status}","${s.last_updated||""}",${s.mentor_notes.length}`).join("\n");
  }
  if (type === "dept-trend") {
    return "Department,Total,High,Medium,Low,Avg Prob\n" +
      rows.map((r)=>`"${r.dept}",${r.total},${r.high},${r.medium},${r.low},${pct(r.avgProb)}`).join("\n");
  }
  return "";
}

// Preview tables
function AtRiskTable({ rows }) {
  return (
    <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
      <table className="w-full text-sm min-w-[620px]">
        <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
          <th className="px-4 py-3 font-medium text-left">Student</th>
          <th className="px-4 py-3 font-medium text-left">Department</th>
          <th className="px-4 py-3 font-medium text-left">Risk</th>
          <th className="px-4 py-3 font-medium text-left">Approval</th>
          <th className="px-4 py-3 font-medium text-left">Attend.</th>
          <th className="px-4 py-3 font-medium text-left">Top Risk Factor</th>
        </tr></thead>
        <tbody>{rows.map((s) => {
          const top = s.risk_factors.find((f)=>f.direction==="risk");
          const hi = s.risk_category==="High";
          return (<tr key={s.student_id} className={`border-b border-slate-100 last:border-0 border-l-2 ${hi?"border-l-rose-400 bg-rose-50/20":"border-l-transparent"}`}>
            <td className="px-4 py-3"><div className="font-medium text-slate-800">{s.student_name}</div><div className="text-xs text-slate-400 font-mono">{s.student_id}</div></td>
            <td className="px-4 py-3 text-slate-600">{s.department}</td>
            <td className="px-4 py-3"><RiskBadge level={s.risk_category} probability={s.dropout_probability}/></td>
            <td className="px-4 py-3 font-mono text-slate-700">{pct(s.approval_rate)}</td>
            <td className="px-4 py-3 font-mono text-slate-700">{s.attendance_percentage}%</td>
            <td className="px-4 py-3 text-xs text-slate-500">{top?top.factor:"--"}</td>
          </tr>);
        })}</tbody>
      </table>
      {rows.length===0&&<div className="py-10 text-center text-sm text-slate-400">No students match these filters.</div>}
    </div>
  );
}
function InterventionTable({ rows }) {
  const ST={"Not Started":"bg-slate-100 text-slate-600","In Progress":"bg-sky-50 text-sky-700","Resolved":"bg-emerald-50 text-emerald-700","Escalated":"bg-rose-50 text-rose-700"};
  return (
    <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
      <table className="w-full text-sm min-w-[680px]">
        <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
          <th className="px-4 py-3 font-medium text-left">Student</th>
          <th className="px-4 py-3 font-medium text-left">Risk</th>
          <th className="px-4 py-3 font-medium text-left">Mentor</th>
          <th className="px-4 py-3 font-medium text-left">Status</th>
          <th className="px-4 py-3 font-medium text-left">Department</th>
          <th className="px-4 py-3 font-medium text-left">Last Updated</th>
          <th className="px-4 py-3 font-medium text-right">Notes</th>
        </tr></thead>
        <tbody>{rows.map((s)=>(
          <tr key={s.student_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <td className="px-4 py-3"><div className="font-medium text-slate-800">{s.student_name}</div><div className="text-xs text-slate-400 font-mono">{s.student_id}</div></td>
            <td className="px-4 py-3"><RiskBadge level={s.risk_category} probability={s.dropout_probability}/></td>
            <td className="px-4 py-3 text-sm text-slate-600">{s.assigned_mentor}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${ST[s.intervention_status]||"bg-slate-100 text-slate-600"}`}>{s.intervention_status}</span></td>
            <td className="px-4 py-3 text-slate-500">{s.department}</td>
            <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.last_updated||"--"}</td>
            <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{s.mentor_notes.length}</td>
          </tr>
        ))}</tbody>
      </table>
      {rows.length===0&&<div className="py-10 text-center text-sm text-slate-400">No students match.</div>}
    </div>
  );
}
function DeptTrendTable({ rows }) {
  return (
    <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
      <table className="w-full text-sm min-w-[500px]">
        <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
          <th className="px-4 py-3 font-medium text-left">Department</th>
          <th className="px-4 py-3 font-medium text-right">Students</th>
          <th className="px-4 py-3 font-medium text-right">High</th>
          <th className="px-4 py-3 font-medium text-right">Medium</th>
          <th className="px-4 py-3 font-medium text-right">Low</th>
          <th className="px-4 py-3 font-medium text-right">Avg Risk</th>
        </tr></thead>
        <tbody>{rows.map((r)=>(
          <tr key={r.dept} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <td className="px-4 py-3 font-medium text-slate-800">{r.dept}</td>
            <td className="px-4 py-3 text-right font-mono text-slate-700">{r.total}</td>
            <td className="px-4 py-3 text-right font-mono text-rose-600">{r.high}</td>
            <td className="px-4 py-3 text-right font-mono text-amber-600">{r.medium}</td>
            <td className="px-4 py-3 text-right font-mono text-emerald-600">{r.low}</td>
            <td className="px-4 py-3 text-right"><span className={`font-mono font-semibold ${r.avgProb>=0.6?"text-rose-600":r.avgProb>=0.35?"text-amber-600":"text-emerald-600"}`}>{pct(r.avgProb)}</span></td>
          </tr>
        ))}</tbody>
      </table>
      {rows.length===0&&<div className="py-10 text-center text-sm text-slate-400">No data.</div>}
    </div>
  );
}

// Sortable column header helper
function Th({ col, label, sortKey, sortAsc, onSort, className="" }) {
  const a = sortKey===col;
  return (
    <th className={`px-4 py-3 font-medium text-left cursor-pointer select-none hover:text-slate-700 ${className}`} onClick={()=>onSort(col)}>
      <div className="flex items-center gap-1">{label}{a?(sortAsc?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>):<ChevronUp className="w-3 h-3 opacity-20"/>}</div>
    </th>
  );
}

// Report History
const HIST_PAGE = 6;
function ReportHistory() {
  const [sortKey,setSortKey] = useState("date");
  const [sortAsc,setSortAsc] = useState(false);
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  function hs(k){if(sortKey===k)setSortAsc(!sortAsc);else{setSortKey(k);setSortAsc(true);}}
  const filtered = useMemo(()=>[...REPORT_HISTORY]
    .filter((r)=>search===""||r.name.toLowerCase().includes(search.toLowerCase())||r.generatedBy.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{let va=a[sortKey]||"",vb=b[sortKey]||"";if(va<vb)return sortAsc?-1:1;if(va>vb)return sortAsc?1:-1;return 0;}),[sortKey,sortAsc,search]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/HIST_PAGE));
  const cur=Math.min(page,totalPages);
  const paginated=filtered.slice((cur-1)*HIST_PAGE,cur*HIST_PAGE);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-slate-600"/></div>
        <h2 className="text-sm font-semibold text-slate-800">Report History</h2>
      </div>
      <div className="p-5">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
            <input value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1);}} placeholder="Search reports..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200"/>
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <Th col="name" label="Report Name" sortKey={sortKey} sortAsc={sortAsc} onSort={hs}/>
              <Th col="type" label="Type" sortKey={sortKey} sortAsc={sortAsc} onSort={hs}/>
              <Th col="generatedBy" label="Generated By" sortKey={sortKey} sortAsc={sortAsc} onSort={hs}/>
              <Th col="date" label="Date" sortKey={sortKey} sortAsc={sortAsc} onSort={hs}/>
              <th className="px-4 py-3 font-medium text-center">Size</th>
              <th className="px-4 py-3 font-medium text-center">Get</th>
            </tr></thead>
            <tbody>{paginated.map((r)=>{
              const tc=TYPE_COLORS[r.type]||TYPE_COLORS["at-risk"];
              return(<tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded border font-medium ${tc.badge}`}>{TYPE_LABELS[r.type]}</span></td>
                <td className="px-4 py-3 text-slate-600 text-sm">{r.generatedBy}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{fmtLong(r.date)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-400">{r.size}</td>
                <td className="px-4 py-3 text-center"><button className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 font-medium"><FileDown className="w-3.5 h-3.5"/>CSV</button></td>
              </tr>);
            })}
            {paginated.length===0&&<tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No reports found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">Page {cur} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={cur===1} className="px-3 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
            <button onClick={()=>setPage((p)=>Math.min(totalPages,p+1))} disabled={cur===totalPages} className="px-3 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scheduled Reports
function ScheduledReports() {
  const [schedules,setSchedules] = useState(INITIAL_SCHEDULED);
  const [adding,setAdding] = useState(false);
  const [form,setForm] = useState({name:"",type:"at-risk",frequency:"Weekly",email:""});
  function toggleActive(id){setSchedules((p)=>p.map((s)=>s.id===id?{...s,active:!s.active}:s));}
  function del(id){setSchedules((p)=>p.filter((s)=>s.id!==id));}
  function save(){
    if(!form.name.trim()||!form.email.trim())return;
    setSchedules((p)=>[...p,{...form,id:`sch-${Date.now()}`}]);
    setForm({name:"",type:"at-risk",frequency:"Weekly",email:""});
    setAdding(false);
  }
  const sc="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200";
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-slate-600"/></div>
          <h2 className="text-sm font-semibold text-slate-800">Scheduled Reports</h2>
        </div>
        <button onClick={()=>setAdding(!adding)} className="flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors">
          <Plus className="w-3.5 h-3.5"/>New Schedule
        </button>
      </div>
      <div className="p-5 space-y-3">
        {adding&&(
          <div className="p-4 border border-teal-200 bg-teal-50/40 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Schedule name" className="px-3 py-1.5 text-sm border border-slate-200 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-teal-200"/>
              <input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="Recipient email" type="email" className="px-3 py-1.5 text-sm border border-slate-200 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-teal-200"/>
              <select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})} className={sc+" py-1.5 text-sm"}>
                {REPORT_TYPES.map((t)=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={form.frequency} onChange={(e)=>setForm({...form,frequency:e.target.value})} className={sc+" py-1.5 text-sm"}>
                <option>Weekly</option><option>Monthly</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="text-sm bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors">Save</button>
              <button onClick={()=>setAdding(false)} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        )}
        {schedules.length===0&&<p className="text-sm text-slate-400 text-center py-6">No scheduled reports.</p>}
        {schedules.map((s)=>{
          const tc=TYPE_COLORS[s.type]||TYPE_COLORS["at-risk"];
          return(
            <div key={s.id} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${s.active?"border-slate-200 bg-white":"border-slate-100 bg-slate-50 opacity-60"}`}>
              <button onClick={()=>toggleActive(s.id)} className="flex-shrink-0">
                {s.active?<ToggleRight className="w-5 h-5 text-teal-600"/>:<ToggleLeft className="w-5 h-5 text-slate-400"/>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${tc.badge}`}>{TYPE_LABELS[s.type]}</span>
                  <span className="text-xs text-slate-400">{s.frequency}</span>
                  <span className="text-xs text-slate-400">to {s.email}</span>
                </div>
              </div>
              <button onClick={()=>del(s.id)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main page export
export default function Reports({ students, currentUser }) {
  const [reportType,setReportType] = useState("at-risk");
  const [deptFilter,setDeptFilter] = useState("All");
  const [riskFilter,setRiskFilter] = useState("All");
  const [mentorFilter,setMentorFilter] = useState("All");
  const [statusFilter,setStatusFilter] = useState("All");
  const [dateFrom,setDateFrom] = useState("");
  const [dateTo,setDateTo] = useState("");
  const [search,setSearch] = useState("");
  const [copied,setCopied] = useState(false);
  const isAdmin = currentUser?.role === "Admin";

  const previewRows = useMemo(()=>{
    const base = students.filter((s)=>{
      const mD = deptFilter==="All"||s.department===deptFilter;
      const mR = riskFilter==="All"||s.risk_category===riskFilter;
      const mM = !isAdmin || mentorFilter==="All"||s.assigned_mentor===mentorFilter;
      const mS = statusFilter==="All"||s.intervention_status===statusFilter;
      const mSr= search===""||s.student_name.toLowerCase().includes(search.toLowerCase())||s.student_id.toLowerCase().includes(search.toLowerCase());
      const mDt= (()=>{if(!s.last_updated)return true;if(dateFrom&&s.last_updated<dateFrom)return false;if(dateTo&&s.last_updated>dateTo)return false;return true;})();
      return mD&&mR&&mM&&mS&&mSr&&mDt;
    });
    if(reportType==="dept-trend"){
      const map={};
      base.forEach((s)=>{
        if(!map[s.department])map[s.department]={dept:s.department,total:0,high:0,medium:0,low:0,probSum:0};
        const r=map[s.department];r.total++;
        if(s.risk_category==="High")r.high++;else if(s.risk_category==="Medium")r.medium++;else r.low++;
        r.probSum+=s.dropout_probability;
      });
      return Object.values(map).map((r)=>({...r,avgProb:r.probSum/r.total})).sort((a,b)=>b.avgProb-a.avgProb);
    }
    return base;
  },[students,reportType,deptFilter,riskFilter,mentorFilter,statusFilter,search,dateFrom,dateTo,isAdmin]);

  const kpis = useMemo(()=>({
    total:students.length,
    highRisk:students.filter((s)=>s.risk_category==="High").length,
    escalated:students.filter((s)=>s.intervention_status==="Escalated").length,
    resolved:students.filter((s)=>s.intervention_status==="Resolved").length,
  }),[students]);

  function handleExportCSV(){
    const c=buildCSV(previewRows,reportType);
    const label=REPORT_TYPES.find((r)=>r.id===reportType)?.label||"report";
    downloadCSV(c,`${label.toLowerCase().replace(/\s+/g,"-")}-${new Date().toISOString().slice(0,10)}.csv`);
  }
  function handleCopy(){
    const label=REPORT_TYPES.find((r)=>r.id===reportType)?.label;
    const txt=[
      `Report: ${label}`,
      `Generated: ${fmtLong(new Date().toISOString())}`,
      `Filters: Dept=${deptFilter}, Risk=${riskFilter}${isAdmin ? `, Mentor=${mentorFilter}` : ""}`,
      reportType==="dept-trend"?`Departments: ${previewRows.length}`:`Students: ${previewRows.length}`,
    ].join("\n");
    navigator.clipboard.writeText(txt).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }

  const recordLabel = reportType==="dept-trend"
    ?`${previewRows.length} department${previewRows.length!==1?"s":""} match current filters`
    :`${previewRows.length} student${previewRows.length!==1?"s":""} match current filters`;

  const sl="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <FileText className="w-5 h-5 text-teal-700"/>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Reports</h1>
        </div>
        <p className="text-sm text-slate-500">Generate and download reports on student risk, interventions, and department trends.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total students" value={kpis.total}/>
        <KpiCard label="High risk" value={kpis.highRisk} accent="text-rose-600" sublabel="in cohort"/>
        <KpiCard label="Escalated" value={kpis.escalated} accent="text-amber-600" sublabel="interventions"/>
        <KpiCard label="Resolved" value={kpis.resolved} accent="text-emerald-600" sublabel="interventions"/>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Report Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {REPORT_TYPES.map((rt)=>{
            const Icon=rt.icon;
            const active=reportType===rt.id;
            const tc=TYPE_COLORS[rt.id];
            return(
              <button key={rt.id} onClick={()=>setReportType(rt.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm ${active?`${tc.card}`:"border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${active?"bg-white shadow-sm":"bg-slate-100"}`}>
                  <Icon className={`w-4 h-4 ${active?tc.icon:"text-slate-500"}`}/>
                </div>
                <div className={`text-sm font-semibold leading-tight mb-1 ${active?"text-slate-900":"text-slate-700"}`}>{rt.label}</div>
                <div className="text-xs text-slate-500 leading-snug">{rt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by name or ID"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white"/>
            </div>
            <select value={deptFilter} onChange={(e)=>setDeptFilter(e.target.value)} className={sl}>
              {DEPARTMENTS.map((d)=><option key={d}>{d==="All"?"All Departments":d}</option>)}
            </select>
            <select value={riskFilter} onChange={(e)=>setRiskFilter(e.target.value)} className={sl}>
              {RISK_BANDS.map((r)=><option key={r}>{r==="All"?"All Risks":r}</option>)}
            </select>
            {isAdmin && (reportType==="intervention"||reportType==="at-risk") && (
              <select value={mentorFilter} onChange={(e)=>setMentorFilter(e.target.value)} className={sl}>
                {ALL_MENTORS.map((m)=><option key={m}>{m==="All"?"All Mentors":m}</option>)}
              </select>
            )}
            {reportType==="intervention"&&(
              <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className={sl}>
                {INT_STATUSES.map((s)=><option key={s}>{s==="All"?"All Statuses":s}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
              <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"/>
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"/>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-700">Live Preview</span>
            <span className="text-xs text-slate-400 ml-2">· {recordLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs border border-slate-200 bg-white text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
              {copied?<Check className="w-3.5 h-3.5 text-emerald-600"/>:<Copy className="w-3.5 h-3.5"/>}
              {copied?"Copied!":"Copy summary"}
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors">
              <Download className="w-3.5 h-3.5"/>Export CSV
            </button>
          </div>
        </div>

        <div className="p-5">
          {reportType==="at-risk"&&<AtRiskTable rows={previewRows}/>}
          {reportType==="intervention"&&<InterventionTable rows={previewRows}/>}
          {reportType==="dept-trend"&&<DeptTrendTable rows={previewRows}/>}
          {reportType==="audit"&&(
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500 text-center">
              The Full Audit Report pulls data from the Bias &amp; Privacy Audit page. Download CSV to export the access log.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScheduledReports/>
        <ReportHistory/>
      </div>
    </div>
  );
}
