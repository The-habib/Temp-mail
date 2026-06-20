import { useLocation } from "wouter";
import { Mail, BarChart2, Settings } from "lucide-react";

const navItems = [
  { path: "/activity", icon: BarChart2, label: "Activity" },
  { path: "/",         icon: Mail,      label: "Inbox"    },
  { path: "/settings", icon: Settings,  label: "Settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };

  return (
    <div className="absolute bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none">
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
              className={`relative flex items-center gap-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                active
                  ? "bg-[#7AB840] text-white px-5 py-2.5 shadow-[0_2px_12px_rgba(122,184,64,0.45)]"
                  : "text-white/50 px-3.5 py-2.5 hover:text-white/80"
              }`}
              style={{
                transform: active ? "scale(1.04)" : "scale(1)",
              }}
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
