import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Fixed left sidebar */}
      <Sidebar />

      {/* Main area — offset by sidebar width (w-56 = 224px) */}
      <div className="flex-1 flex flex-col min-h-screen ml-56">
        {/* Sticky top bar */}
        <TopBar />

        {/* Scrollable page content */}
        <main className="flex-1 px-6 py-6 mt-14 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
