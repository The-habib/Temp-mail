import { useLocation } from "wouter";
import { Mail, BarChart2, Settings, ShieldCheck } from "lucide-react";

const navItems = [
  { path: null as string | null, icon: ShieldCheck, label: "Privacy" },
  { path: "/",          icon: Mail,      label: "Inbox"    },
  { path: "/activity",  icon: BarChart2, label: "Activity" },
  { path: "/settings",  icon: Settings,  label: "Settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };

  return (
    <nav className="flex-none bg-white border-t border-[#EEEEDA] grid grid-cols-4 px-1 py-2.5">
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);
        return (
          <div key={label} className="flex items-center justify-center">
            <button
              onClick={() => path && navigate(path)}
              disabled={!path}
              className={`flex items-center justify-center gap-1.5 rounded-full outline-none transition-all duration-300 ${
                active
                  ? "bg-[#1A1A1A] text-white px-4 py-2.5"
                  : "text-[#BCBCCC] p-2.5 disabled:cursor-default"
              }`}
              style={active ? { transform: "none" } : undefined}
            >
              <Icon
                className="h-[19px] w-[19px] flex-shrink-0"
                strokeWidth={active ? 2.2 : 1.7}
              />
              {active && (
                <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                  {label}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
