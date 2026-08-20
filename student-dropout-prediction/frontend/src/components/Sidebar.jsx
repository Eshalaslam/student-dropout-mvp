import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardList, GraduationCap, ChevronRight, FileBarChart, UserCog } from "lucide-react";
import { ROLE_STYLES } from "../utils/useRbac";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { path: "/dashboard",     label: "Dashboard",            icon: LayoutDashboard, description: "Cohort overview",    section: "main"  },
  { path: "/students",      label: "Student List",          icon: Users,           description: "All students",       section: "main"  },
  { path: "/interventions", label: "Mentor Interventions",  icon: ClipboardList,   description: "Follow-up tracking", section: "main"  },
  { path: "/reports",       label: "Reports",               icon: FileBarChart,    description: "Generate & export",  section: "main"  },
  { path: "/mentors",       label: "Manage Mentors",        icon: UserCog,         description: "Accounts & access",  section: "admin", adminOnly: true },
];

const SECTION_LABELS = { main: "Navigation", admin: "Admin" };

export default function Sidebar() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "Mentor";
  const rs = ROLE_STYLES[role] || ROLE_STYLES.Mentor;

  // Filter items by role — adminOnly items are hidden for Mentors
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === "Admin");

  // Group into sections (only show a section header if it has visible items)
  const sections = ["main", "admin"].map((sec) => ({
    id: sec,
    items: visibleItems.filter((i) => i.section === sec),
  })).filter((s) => s.items.length > 0);

  const initials = (currentUser?.name || "??")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-slate-900 flex flex-col z-20 select-none">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight leading-tight">Early-Warning</div>
            <div className="text-[10px] text-slate-400 leading-tight">System</div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {SECTION_LABELS[section.id]}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isAdmin = item.section === "admin";
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                        isActive
                          ? isAdmin
                            ? "bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/30"
                            : "bg-teal-600/20 text-teal-400 ring-1 ring-teal-500/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? isAdmin ? "text-violet-400" : "text-teal-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium leading-tight truncate ${
                            isActive ? (isAdmin ? "text-violet-300" : "text-teal-300") : ""
                          }`}>{item.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{item.description}</div>
                        </div>
                        {isActive && (
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isAdmin ? "text-violet-500" : "text-teal-500"}`} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logged-in user card */}
      <div className="px-3 pb-4 space-y-2">
        <div className="rounded-lg bg-slate-800 border border-slate-700/50 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate leading-tight">{currentUser?.name || "Guest"}</div>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mt-0.5 ${rs.badge}`}>
              {role}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-teal-900/40 border border-teal-700/30 px-3 py-2">
          <div className="text-[10px] text-slate-400 leading-snug">Mock data · No real backend</div>
        </div>
      </div>
    </aside>
  );
}
