import { LayoutDashboard, Users, ClipboardList, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "list", label: "Student List", icon: Users },
  { id: "interventions", label: "Mentor Interventions", icon: ClipboardList },
];

// Replaces the static demo header. `active` should be "dashboard" or "list"
// (the caller resolves this even while a student-detail page is open, so the
// section the user came from stays visibly highlighted).
export default function NavBar({ active, onNavigate, onLogout }) {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-2 sm:gap-6 flex-wrap sticky top-0 z-10">
      <div className="flex items-center gap-2.5 mr-2">
        <span className="w-2 h-2 rounded-full bg-teal-600" />
        <span className="text-sm font-semibold text-slate-800 tracking-tight whitespace-nowrap">Early-Warning System</span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {item.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" /> Logout
      </button>
    </header>
  );
}
