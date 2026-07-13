import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "../stores/auth";
import { useEffect, useState } from "react";
import { userApi } from "../lib/api";

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/upload", label: "New session", icon: "session" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/progress", label: "Progress", icon: "progress" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  session: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 13.5" />
    </svg>
  ),
  progress: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

interface LastSession {
  id: string;
  file_name: string;
  created_at: string;
  overall_score: number | null;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
  if (isToday) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastSession, setLastSession] = useState<LastSession | null>(null);

  useEffect(() => {
    userApi
      .history()
      .then((res) => {
        const done = (res.data as LastSession[]).filter((s) => s.overall_score != null);
        if (done.length > 0) setLastSession(done[0]);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarNav = (onClickItem?: () => void) => (
    <>
      <div className="px-4 mb-6">
        <p className="nav-label">Menu</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClickItem}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {icons[item.icon]}
            {item.label}
          </NavLink>
        ))}
      </div>

      {lastSession && (
        <div className="mt-auto px-4 pt-6 border-t border-[#1a1a1a]">
          <p className="nav-label mb-3">Last session</p>
          <div className="px-3">
            <p className="text-[12px] text-text-soft mb-1 truncate">{lastSession.file_name}</p>
            <p className="text-[11px] text-text-faint mb-2.5">{timeAgo(lastSession.created_at)}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-accent rounded-sm"
                  style={{ width: `${Math.round(lastSession.overall_score ?? 0)}%` }}
                />
              </div>
              <span className="text-[12px] text-accent font-medium">
                {Math.round(lastSession.overall_score ?? 0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Topbar */}
      <header className="h-14 bg-bg-primary border-b border-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 text-text-dim hover:text-text-secondary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
          <NavLink to="/" className="logo-serif text-lg">
            musique<span>.</span>
          </NavLink>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:block text-[13px] text-text-dim">{user?.name || "User"}</span>
          <div className="avatar-pill">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="ml-1 p-1.5 text-text-faint hover:text-error transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-b border-border bg-bg-sidebar overflow-hidden sticky top-14 z-30"
          >
            <nav className="py-4 flex flex-col">{sidebarNav(() => setMobileOpen(false))}</nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[calc(100vh-56px)]">
        <aside className="hidden lg:flex flex-col border-r border-[#1a1a1a] bg-bg-sidebar py-6 pb-8">
          {sidebarNav()}
        </aside>

        <main className="min-w-0 overflow-x-hidden">
          <div className="max-w-[1100px] p-4 md:p-8">
            <AnimatePresence mode="wait">
              <Outlet />
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
