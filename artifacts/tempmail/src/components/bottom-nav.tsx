import { useLocation } from "wouter";
import { Shield, Mail, BarChart2, Settings } from "lucide-react";

const navItems = [
  { path: null as string | null, icon: Shield, label: "Privacy" },
  { path: "/", icon: Mail, label: "Inbox" },
  { path: "/activity", icon: BarChart2, label: "Activity" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };

  return (
    <nav className="flex-none bg-white border-t border-[#EEEEDA] px-5 py-3 flex items-center justify-around">
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);
        return (
          <button
            key={label}
            onClick={() => path && navigate(path)}
            className={`flex items-center justify-center transition-all duration-200 ${
              active
                ? "bg-[#1A1A1A] text-white rounded-full px-4 py-2.5 gap-1.5"
                : "text-[#AEAEBE] p-2.5 rounded-full"
            } ${!path ? "cursor-default" : ""}`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
            {active && <span className="text-xs font-semibold">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
