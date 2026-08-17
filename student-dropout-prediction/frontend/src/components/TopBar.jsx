import { Bell, LogOut, ChevronDown } from "lucide-react";
import { DEMO_MENTOR } from "../data/mockAuth";

const PAGE_TITLES = {
  dashboard: { title: "Dashboard", subtitle: "Cohort overview and prioritized outreach" },
  list: { title: "Student List", subtitle: "Browse and filter all students" },
  interventions: { title: "Mentor Intervention Tracking", subtitle: "Track follow-up actions for at-risk students" },
  details: { title: "Student Details", subtitle: "Full profile and risk breakdown" },
};

export default function TopBar({ view, onLogout }) {
  const { title, subtitle } = PAGE_TITLES[view] || PAGE_TITLES["dashboard"];

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 z-10">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-slate-800 tracking-tight truncate">
            {title}
          </h1>
          <span className="hidden sm:block text-xs text-slate-400 truncate">/&nbsp;{subtitle}</span>
        </div>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Notification bell (decorative for demo) */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User pill */}
        <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
          <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {DEMO_MENTOR.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-slate-700 leading-tight">{DEMO_MENTOR.name}</div>
            <div className="text-[10px] text-slate-400 leading-tight">{DEMO_MENTOR.role}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Log out"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
