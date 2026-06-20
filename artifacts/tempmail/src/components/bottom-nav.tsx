import { useLocation } from "wouter";
import { Mail, BarChart2, Settings } from "lucide-react";

const navItems = [
  { path: "/activity", icon: BarChart2, label: "Activity" },
  { path: "/",         icon: Mail,      label: "Inbox"    },
  { path: "/settings", icon: Settings,  label: "Settings" },
];

function useIsActive() {
  const [location] = useLocation();
  return (path: string) => {
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };
}

/* ── Mobile floating pill ─────────────────────────────────────── */
export function BottomNav() {
  const [, navigate] = useLocation();
  const isActive = useIsActive();

  return (
    <div className="md:hidden absolute bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <nav
        className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-white/10"
        style={{
          background: "rgba(22,22,22,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`relative flex items-center gap-2 rounded-full transition-all duration-300 outline-none ${
                active
                  ? "bg-[#7AB840] text-white px-5 py-2.5 shadow-[0_2px_12px_rgba(122,184,64,0.45)]"
                  : "text-white/50 px-3.5 py-2.5 hover:text-white/80"
              }`}
              style={{ transform: active ? "scale(1.04)" : "scale(1)" }}
            >
              <Icon
                className={`transition-all duration-300 ${active ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]"}`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              {active && (
                <span className="text-[12px] font-semibold leading-none tracking-tight whitespace-nowrap">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Desktop sidebar ──────────────────────────────────────────── */
export function SideNav() {
  const [, navigate] = useLocation();
  const isActive = useIsActive();

  return (
    <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0 h-full bg-white border-r border-[#E8E8D8]">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-[#F4F4EE]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3.5L7 8.5L13 3.5M1 3.5H13V11H1V3.5Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-bold text-[#1A1A1A]">
            Temp <span className="text-[#7AB840]">Mail</span>
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                active
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#7A7A7A] hover:bg-[#F4F4E4] hover:text-[#1A1A1A]"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-[#F4F4EE]">
        <p className="text-[10px] text-[#C8C8B8] text-center">Privacy-first email</p>
      </div>
    </aside>
  );
}
