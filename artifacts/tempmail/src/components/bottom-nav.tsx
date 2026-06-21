import { useLocation } from "wouter";
import { Mail, BarChart2, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [mounted, setMounted] = useState(false);
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);
  const prevActiveIdx = useRef(-1);

  const activeIdx = navItems.findIndex(({ path }) => isActive(path));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    prevActiveIdx.current = activeIdx;
  }, [activeIdx]);

  return (
    <div
      className="md:hidden absolute bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{
        transform: mounted ? "translateY(0)" : "translateY(100px)",
        opacity: mounted ? 1 : 0,
        transition: "transform 600ms cubic-bezier(0.34,1.56,0.64,1), opacity 400ms ease",
      }}
    >
      <nav
        className="pointer-events-auto relative flex items-center rounded-full"
        style={{
          background: "rgba(18,18,18,0.94)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
          padding: "5px",
        }}
      >
        {/* Sliding green pill — sits behind everything */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 5,
            left: 5,
            width: `calc((100% - 10px) / 3)`,
            height: "calc(100% - 10px)",
            borderRadius: 9999,
            background: "linear-gradient(135deg, #7AB840 0%, #5FA020 100%)",
            boxShadow: "0 4px 20px rgba(122,184,64,0.55), 0 2px 8px rgba(122,184,64,0.3)",
            transform: `translateX(calc(${activeIdx * 100}%))`,
            transition: "transform 420ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Nav buttons */}
        {navItems.map(({ path, icon: Icon, label }, idx) => {
          const active = idx === activeIdx;
          const pressed = idx === pressedIdx;

          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              onPointerDown={() => setPressedIdx(idx)}
              onPointerUp={() => setPressedIdx(null)}
              onPointerLeave={() => setPressedIdx(null)}
              className="relative flex items-center justify-center gap-2 outline-none"
              style={{
                flex: 1,
                minWidth: 80,
                height: 46,
                borderRadius: 9999,
                zIndex: 1,
                transform: pressed ? "scale(0.88)" : active ? "scale(1.02)" : "scale(1)",
                transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* Icon */}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: active ? "scale(1.15) translateY(-1px)" : "scale(1) translateY(0)",
                  transition: "transform 420ms cubic-bezier(0.34,1.56,0.64,1)",
                  filter: active ? "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" : "none",
                }}
              >
                <Icon
                  style={{
                    width: active ? 18 : 20,
                    height: active ? 18 : 20,
                    color: active ? "white" : "rgba(255,255,255,0.4)",
                    strokeWidth: active ? 2.4 : 1.7,
                    transition: "color 300ms ease, width 300ms ease, height 300ms ease",
                  }}
                />
              </span>

              {/* Label — expands in with width animation */}
              <span
                aria-hidden={!active}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                  maxWidth: active ? 60 : 0,
                  opacity: active ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-width 380ms cubic-bezier(0.34,1.56,0.64,1), opacity 280ms ease",
                  lineHeight: 1,
                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                {label}
              </span>
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
    <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0 h-full border-r border-[#E8E8D8]" style={{ background: "#FAFAF4" }}>
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-[#F0F0E8]">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="TempMail" className="w-8 h-8 rounded-xl object-cover" />
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
                  ? "bg-[#1A1A1A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  : "text-[#7A7A7A] hover:bg-[#F0F0E4] hover:text-[#1A1A1A]"
              }`}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0 transition-all duration-200"
                strokeWidth={active ? 2.2 : 1.8}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7AB840]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-[#F0F0E8]">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7AB840]" />
          <p className="text-[10px] text-[#ABABAB] font-medium">Privacy-first email</p>
        </div>
      </div>
    </aside>
  );
}
