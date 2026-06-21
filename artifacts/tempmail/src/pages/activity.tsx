import { useGetMessages, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useState, useEffect } from "react";
import { Copy, Check, ShieldCheck, Zap, Mail, TrendingUp, Clock, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function pad(n: number) { return String(n).padStart(2, "0"); }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 18) return { text: "Good afternoon", emoji: "⚡" };
  return { text: "Good evening", emoji: "🌙" };
}

/* ── Premium bar chart ───────────────────────────────────────── */
function ActivityChart({ messages }: { messages: { createdAt: string }[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayJs  = new Date().getDay();
  const todayIdx = todayJs === 0 ? 6 : todayJs - 1;

  const counts = days.map((_, i) => {
    const jsDay = (i + 1) % 7;
    return messages.filter((m) => new Date(m.createdAt).getDay() === jsDay).length;
  });

  // Always use at least 5 as the ceiling so a single email never fills the full bar
  const max = Math.max(...counts, 5);

  // Bar geometry
  const W = 300, chartH = 90, baseY = 100;
  const barW = 26, totalBars = 7;
  const totalBarSpace = barW * totalBars;
  const gap = (W - totalBarSpace) / (totalBars + 1); // even spacing with edge padding

  return (
    <svg viewBox={`0 0 ${W} 120`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ED44A" />
          <stop offset="100%" stopColor="#5A9A1A" />
        </linearGradient>
        <linearGradient id="barInactive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4F0CE" />
          <stop offset="100%" stopColor="#D4E8B8" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line key={i}
          x1={gap} y1={baseY - pct * chartH}
          x2={W - gap} y2={baseY - pct * chartH}
          stroke={pct === 0 ? "#E0DDD4" : "#F2F0E8"} strokeWidth={pct === 0 ? 1.5 : 1}
        />
      ))}

      {days.map((day, i) => {
        const x = gap + i * (barW + gap);
        const isToday  = i === todayIdx;
        const count    = counts[i];
        const hasCount = count > 0;

        // Only filled bars for non-zero counts; empty days get a light track
        const trackH = 4;
        const barH   = hasCount ? Math.max((count / max) * chartH, 10) : 0;
        const barY   = baseY - barH;

        return (
          <g key={day}>
            {/* Background track (always visible, very subtle) */}
            <rect
              x={x} y={baseY - chartH} width={barW} height={chartH} rx={6}
              fill={isToday ? "rgba(122,184,64,0.07)" : "rgba(0,0,0,0.03)"}
            />

            {/* Bottom tick for empty days */}
            {!hasCount && (
              <rect x={x} y={baseY - trackH} width={barW} height={trackH} rx={3}
                fill={isToday ? "#B8D880" : "#DDE8CC"} />
            )}

            {/* Actual filled bar */}
            {hasCount && (
              <>
                {/* Glow */}
                {isToday && (
                  <ellipse cx={x + barW / 2} cy={baseY} rx={barW * 0.7} ry={5}
                    fill="#7AB840" opacity="0.2" />
                )}
                <rect
                  x={x} y={barY} width={barW} height={barH} rx={6}
                  fill={isToday ? "url(#barActive)" : "url(#barInactive)"}
                  style={isToday ? { filter: "drop-shadow(0 3px 8px rgba(122,184,64,0.5))" } : {}}
                />
                {/* Count badge above bar */}
                <circle cx={x + barW / 2} cy={barY - 11} r={10}
                  fill={isToday ? "#1A1A1A" : "#8A8A7A"} />
                <text x={x + barW / 2} y={barY - 7}
                  textAnchor="middle" fill="white"
                  fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">
                  {count}
                </text>
              </>
            )}

            {/* Day label */}
            <text x={x + barW / 2} y={115}
              textAnchor="middle"
              fill={isToday ? "#1A1A1A" : "#C0BDB4"}
              fontSize="8.5" fontWeight={isToday ? "700" : "400"}
              fontFamily="Inter, sans-serif">
              {day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Expiry progress bar ─────────────────────────────────────── */
function ExpiryProgress({ createdAt }: { createdAt: string }) {
  const [pct, setPct] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hrs: 23, mins: 59, secs: 59 });

  useEffect(() => {
    const tick = () => {
      const elapsed  = Date.now() - new Date(createdAt).getTime();
      const total    = 86400000;
      const diff     = Math.max(0, total - elapsed);
      setPct(Math.min(100, (elapsed / total) * 100));
      setTimeLeft({
        hrs:  Math.floor(diff / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const color = pct > 75 ? "#EA4335" : pct > 50 ? "#F5A623" : "#7AB840";

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-[#5A5A5A]">Expires in</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {pad(timeLeft.hrs)}:{pad(timeLeft.mins)}:{pad(timeLeft.secs)}
        </span>
      </div>
      <div className="h-2 bg-[#F0EEE4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #7AB840, ${color})`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#ABABAB]">Created</span>
        <span className="text-[10px] text-[#ABABAB]">Expires 24h</span>
      </div>
    </div>
  );
}

const TIPS = [
  { tip: "Use a different temp email for every site to track who's selling your data.", icon: "🕵️" },
  { tip: "Share your temp address on public forums — never your real one.", icon: "🛡️" },
  { tip: "Your inbox auto-refreshes every 5 seconds. No need to manually reload.", icon: "⚡" },
  { tip: "Emails auto-delete in 24 hours. Screenshot anything important.", icon: "📸" },
  { tip: "Copy your address with one tap — paste it anywhere instantly.", icon: "📋" },
];

/* ── Main page ───────────────────────────────────────────────── */
export default function ActivityPage() {
  const { mailbox } = useMailboxStore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  const { data: messages = [] } = useGetMessages(mailbox?.id ?? "", {
    query: {
      enabled: !!mailbox?.id,
      queryKey: getGetMessagesQueryKey(mailbox?.id ?? ""),
    },
  });

  // Rotate tips every 5s
  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const today       = new Date().toDateString();
  const todayCount  = messages.filter((m) => new Date(m.createdAt).toDateString() === today).length;
  const unreadCount = messages.filter((m) => !m.seen).length;
  const { text: greet, emoji } = greeting();
  const tip = TIPS[tipIdx];

  const copyAddress = () => {
    if (!mailbox?.address) return;
    navigator.clipboard.writeText(mailbox.address);
    setCopied(true);
    toast({ title: "Copied!", description: "Email address copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F0F0E4] overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-3">

        {/* ── Hero header card ─────────────────────────────────── */}
        <div
          className="relative rounded-3xl overflow-hidden anim-slide-up"
          style={{ background: "linear-gradient(145deg, #111111 0%, #1C2E0A 55%, #0F1F05 100%)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, #7AB840, transparent)" }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, #7AB840, transparent)" }} />

          <div className="relative p-5">
            {/* Greeting */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/50 text-xs font-medium tracking-wide uppercase mb-0.5">
                  {emoji} {greet}
                </p>
                <h1 className="text-white text-xl font-extrabold tracking-tight">
                  Your Activity
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7AB840] shadow-[0_0_8px_#7AB840]" />
                <span className="text-[#7AB840] text-[11px] font-bold tracking-wide">ACTIVE</span>
              </div>
            </div>

            {/* Email address row */}
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-3 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] rounded-2xl px-4 py-3 transition-colors group mb-4"
            >
              <div className="w-8 h-8 bg-[#7AB840] rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="flex-1 text-white/80 text-sm font-medium truncate text-left">
                {mailbox?.address ?? "No mailbox active"}
              </span>
              <span className={`flex-shrink-0 transition-colors ${copied ? "text-[#7AB840]" : "text-white/30 group-hover:text-white/60"}`}>
                {copied
                  ? <Check className="h-4 w-4" />
                  : <Copy className="h-4 w-4" />
                }
              </span>
            </button>

            {/* Expiry countdown */}
            {mailbox?.createdAt && <ExpiryProgress createdAt={mailbox.createdAt} />}
          </div>
        </div>

        {/* ── Stat cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5 anim-slide-up" style={{ animationDelay: "60ms" }}>
          {[
            {
              label: "Received",
              value: messages.length,
              sub: `+${todayCount} today`,
              icon: <TrendingUp className="h-4 w-4" />,
              accent: "#7AB840",
              bg: "#EDFAD3",
            },
            {
              label: "Unread",
              value: unreadCount,
              sub: unreadCount === 0 ? "All read" : "new",
              icon: <Inbox className="h-4 w-4" />,
              accent: "#3B82F6",
              bg: "#DBEAFE",
            },
            {
              label: "Mailbox",
              value: mailbox ? 1 : 0,
              sub: mailbox ? "active" : "none",
              icon: <Zap className="h-4 w-4" />,
              accent: "#A855F7",
              bg: "#F3E8FF",
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{ backgroundColor: s.bg, color: s.accent }}
              >
                {s.icon}
              </div>
              <div className="text-2xl font-extrabold text-[#1A1A1A] tabular-nums leading-none mb-1">
                {s.value}
              </div>
              <div className="text-[10px] text-[#9A9A9A] font-medium leading-none mb-0.5">{s.label}</div>
              <div className="text-[10px] font-bold" style={{ color: s.accent }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Activity chart ───────────────────────────────────── */}
        <div
          className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] anim-slide-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-[#1A1A1A] text-sm">Weekly Activity</h2>
              <p className="text-[11px] text-[#9A9A9A] mt-0.5">Emails received per day</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[#9A9A9A]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7AB840] inline-block" />
                Today
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D8EAB8] inline-block" />
                Other
              </div>
            </div>
          </div>
          <ActivityChart messages={messages} />
        </div>

        {/* ── Privacy status card ──────────────────────────────── */}
        <div
          className="rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] anim-slide-up"
          style={{
            animationDelay: "240ms",
            background: "linear-gradient(135deg, #EDFAD3 0%, #E0F5C0 100%)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#7AB840] rounded-xl flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#2A4A10] text-sm">Privacy Protected</span>
          </div>
          <div className="space-y-2">
            {[
              "No personal data collected",
              "No tracking or analytics",
              "Messages encrypted in transit",
              "Auto-deleted after 24 hours",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-[#7AB840] font-bold text-xs">✓</span>
                <span className="text-xs text-[#3A5A18] font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Rotating tip card ────────────────────────────────── */}
        <div
          className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] anim-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-[#9A9A9A]" />
            <span className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wide">Pro Tip</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{tip.icon}</span>
            <p className="text-sm text-[#3A3A3A] leading-relaxed font-medium">{tip.tip}</p>
          </div>
          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {TIPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTipIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === tipIdx ? 16 : 6,
                  height:     6,
                  background: i === tipIdx ? "#7AB840" : "#E0E0D8",
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
