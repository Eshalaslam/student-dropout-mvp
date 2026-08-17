import { LayoutDashboard, Users, ClipboardList, GraduationCap, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Cohort overview",
  },
  {
    id: "list",
    label: "Student List",
    icon: Users,
    description: "All students",
  },
  {
    id: "interventions",
    label: "Mentor Interventions",
    icon: ClipboardList,
    description: "Follow-up tracking",
  },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-slate-900 flex flex-col z-20 select-none">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight leading-tight">
              Early-Warning
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">System</div>
          </div>
        </div>
      </div>

      {/* Nav section */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </span>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                isActive
                  ? "bg-teal-600/20 text-teal-400 ring-1 ring-teal-500/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium leading-tight truncate ${
                    isActive ? "text-teal-300" : ""
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
                  {item.description}
                </div>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom accent */}
      <div className="px-3 pb-4">
        <div className="rounded-lg bg-teal-900/40 border border-teal-700/30 px-3 py-2.5">
          <div className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide mb-0.5">
            Demo Mode
          </div>
          <div className="text-[10px] text-slate-400 leading-snug">
            Mock data · No real backend
          </div>
        </div>
      </div>
    </aside>
  );
}
