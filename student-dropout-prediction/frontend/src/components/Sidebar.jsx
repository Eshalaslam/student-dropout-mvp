import { LayoutDashboard, Users, ClipboardList, GraduationCap, ChevronRight, ShieldAlert, FileBarChart } from "lucide-react";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Cohort overview",
    section: "main",
  },
  {
    id: "list",
    label: "Student List",
    icon: Users,
    description: "All students",
    section: "main",
  },
  {
    id: "interventions",
    label: "Mentor Interventions",
    icon: ClipboardList,
    description: "Follow-up tracking",
    section: "main",
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileBarChart,
    description: "Generate & export",
    section: "main",
  },
  {
    id: "audit",
    label: "Bias & Privacy Audit",
    icon: ShieldAlert,
    description: "Fairness & compliance",
    section: "admin",
  },
];

const SECTION_LABELS = { main: "Navigation", admin: "Admin" };

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

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {["main", "admin"].map((section) => {
          const items = NAV_ITEMS.filter((i) => i.section === section);
          return (
            <div key={section}>
              <div className="px-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {SECTION_LABELS[section]}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  const isAdmin = item.section === "admin";
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                        isActive
                          ? isAdmin
                            ? "bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30"
                            : "bg-teal-600/20 text-teal-400 ring-1 ring-teal-500/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? isAdmin ? "text-violet-400" : "text-teal-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium leading-tight truncate ${
                          isActive ? (isAdmin ? "text-violet-300" : "text-teal-300") : ""
                        }`}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isAdmin ? "text-violet-500" : "text-teal-500"
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
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
