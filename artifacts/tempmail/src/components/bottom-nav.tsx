import { useLocation } from "wouter";
import { Mail, BarChart2, Settings } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

const navItems = [
  { path: "/activity", icon: BarChart2, label: "Activity", color: "#60A5FA" },
  { path: "/",         icon: Mail,      label: "Inbox",    color: "#7AB840" },
  { path: "/settings", icon: Settings,  label: "Settings", color: "#C084FC" },
];

function useIsActive() {
  const [location] = useLocation();
  return (path: string) => {
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };
}

type Ripple = { id: number; idx: number };

/* ── Mobile floating pill ─────────────────────────────────────── */
export function BottomNav() {
  const [, navigate] = useLocation();
  const isActive = useIsActive();

  const [mounted, setMounted]         = useState(false);
  const [pressedIdx, setPressedIdx]   = useState<number | null>(null);
  const [bouncingIdx, setBouncingIdx] = useState<number | null>(null);
  const [ripples, setRipples]         = useState<Ripple[]>([]);
  const prevActiveIdx                 = useRef(-1);
  const activeIdx                     = navItems.findIndex(({ path }) => isActive(path));

  /* mount slide-up */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  /* icon bounce when active tab changes */
  useEffect(() => {
    if (activeIdx >= 0 && activeIdx !== prevActiveIdx.current) {
      setBouncingIdx(activeIdx);
      const t = setTimeout(() => setBouncingIdx(null), 560);
      prevActiveIdx.current = activeIdx;
      return () => clearTimeout(t);
    }
  }, [activeIdx]);

  /* fire ripple from button center */
  const fireRipple = useCallback((idx: number) => {
    const id = Date.now();
    setRipples(r => [...r, { id, idx }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 620);
  }, []);

  const activeColor = navItems[activeIdx]?.color ?? "#7AB840";

  return (
    <div
      className="md:hidden absolute bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{
        transform:  mounted ? "translateY(0) scale(1)"     : "translateY(90px) scale(0.85)",
        opacity:    mounted ? 1 : 0,
        transition: "transform 700ms cubic-bezier(0.34,1.56,0.64,1), opacity 450ms ease",
      }}
    >
      {/* Ambient glow orb that tracks active tab */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -10,
          left:   `calc(${(activeIdx / (navItems.length - 1)) * 100}% - 40px)`,
          width:  80,
          height: 36,
          borderRadius: "50%",
          background: activeColor,
          filter: "blur(22px)",
          opacity: 0.45,
          transition: "left 420ms cubic-bezier(0.34,1.56,0.64,1), background 350ms ease, opacity 300ms ease",
          pointerEvents: "none",
        }}
      />

      <nav
        className="pointer-events-auto relative flex items-center"
        style={{
          background: "linear-gradient(160deg, rgba(28,28,28,0.97) 0%, rgba(18,18,18,0.97) 100%)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 9999,
          padding: 6,
          boxShadow: [
            "0 12px 48px rgba(0,0,0,0.42)",
            "0 4px 16px rgba(0,0,0,0.28)",
            "0 1px 0 rgba(255,255,255,0.07) inset",
            "0 -1px 0 rgba(0,0,0,0.3) inset",
          ].join(", "),
        }}
      >
        {/* ── Sliding active pill ───────────────────────────────── */}
        <div
          aria-hidden
          style={{
            position:     "absolute",
            top:          6,
            left:         6,
            width:        `calc((100% - 12px) / ${navItems.length})`,
            height:       "calc(100% - 12px)",
            borderRadius: 9999,
            background:   `linear-gradient(135deg, ${activeColor}ee 0%, ${activeColor}bb 100%)`,
            boxShadow:    `0 4px 24px ${activeColor}66, 0 2px 8px ${activeColor}44, inset 0 1px 0 rgba(255,255,255,0.2)`,
            transform:    `translateX(calc(${activeIdx * 100}%))`,
            transition:   [
              "transform 440ms cubic-bezier(0.34,1.56,0.64,1)",
              `background 350ms ease`,
              `box-shadow 350ms ease`,
            ].join(", "),
            overflow:     "hidden",
            pointerEvents:"none",
            zIndex:       0,
          }}
        >
          {/* shimmer sweep across the pill */}
          <span
            style={{
              position:   "absolute",
              top:        0,
              width:      "55%",
              height:     "100%",
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
              animation:  "pillShimmer 2.4s ease-in-out infinite",
              borderRadius: 9999,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── Buttons ───────────────────────────────────────────── */}
        {navItems.map(({ path, icon: Icon, label, color }, idx) => {
          const active  = idx === activeIdx;
          const pressed = idx === pressedIdx;
          const bouncing = idx === bouncingIdx;

          return (
            <button
              key={label}
              onClick={() => { navigate(path); fireRipple(idx); }}
              onPointerDown={() => setPressedIdx(idx)}
              onPointerUp={() => setPressedIdx(null)}
              onPointerLeave={() => setPressedIdx(null)}
              className="relative flex items-center justify-center gap-2 select-none outline-none overflow-hidden"
              style={{
                flex:         1,
                minWidth:     82,
                height:       50,
                borderRadius: 9999,
                zIndex:       1,
                transform:    pressed ? "scale(0.84)" : "scale(1)",
                transition:   "transform 180ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* ripple ring */}
              {ripples
                .filter(r => r.idx === idx)
                .map(r => (
                  <span
                    key={r.id}
                    aria-hidden
                    style={{
                      position:     "absolute",
                      inset:        0,
                      margin:       "auto",
                      width:        28,
                      height:       28,
                      borderRadius: "50%",
                      background:   `${color}55`,
                      animation:    "navRipple 600ms cubic-bezier(0,0,0.2,1) forwards",
                      pointerEvents:"none",
                      zIndex:       0,
                    }}
                  />
                ))}

              {/* glow dot below icon (active only) */}
              <span
                aria-hidden
                style={{
                  position:     "absolute",
                  bottom:       4,
                  left:         "50%",
                  transform:    "translateX(-50%)",
                  width:        active ? 18 : 0,
                  height:       3,
                  borderRadius: 9999,
                  background:   "rgba(255,255,255,0.6)",
                  filter:       "blur(2px)",
                  opacity:      active ? 1 : 0,
                  animation:    active ? "glowPulse 2s ease-in-out infinite" : "none",
                  transition:   "width 380ms cubic-bezier(0.34,1.56,0.64,1), opacity 300ms ease",
                  pointerEvents:"none",
                  zIndex:       0,
                }}
              />

              {/* Icon */}
              <span
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  position:        "relative",
                  zIndex:          1,
                  animation:       bouncing ? "iconBounce 560ms cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
                  transform:       (!bouncing && active) ? "scale(1.15) translateY(-1px)" : "scale(1) translateY(0)",
                  transition:      bouncing ? "none" : "transform 380ms cubic-bezier(0.34,1.56,0.64,1)",
                  filter:          active ? "drop-shadow(0 2px 5px rgba(0,0,0,0.35))" : "none",
                }}
              >
                <Icon
                  style={{
                    width:       20,
                    height:      20,
                    color:       active ? "white" : "rgba(255,255,255,0.35)",
                    strokeWidth: active ? 2.4 : 1.6,
                    transition:  "color 300ms ease, stroke-width 300ms ease",
                  }}
                />
              </span>

              {/* Label — slides in when active */}
              <span
                aria-hidden={!active}
                style={{
                  position:   "relative",
                  zIndex:     1,
                  fontSize:   12,
                  fontWeight: 700,
                  color:      "white",
                  letterSpacing: "0.015em",
                  whiteSpace: "nowrap",
                  maxWidth:   active ? 56 : 0,
                  opacity:    active ? 1 : 0,
                  overflow:   "hidden",
                  transition: [
                    "max-width 400ms cubic-bezier(0.34,1.56,0.64,1)",
                    "opacity 260ms ease 60ms",
                  ].join(", "),
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
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
    <aside
      className="hidden md:flex flex-col w-[220px] flex-shrink-0 h-full border-r border-[#E8E8D8]"
      style={{ background: "#FAFAF4" }}
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-[#F0F0E8]">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="TempMail" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
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
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7AB840]" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-[#F0F0E8]">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7AB840] shadow-[0_0_4px_#7AB840]" />
          <p className="text-[10px] text-[#ABABAB] font-medium">Privacy-first email</p>
        </div>
      </div>
    </aside>
  );
}
