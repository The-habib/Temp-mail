import { useGetMessages, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Copy, Check, ShieldCheck, Zap, Mail, TrendingUp, Clock, Inbox, Globe, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function pad(n: number) { return String(n).padStart(2, "0"); }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning" };
  if (h < 18) return { text: "Good afternoon" };
  return { text: "Good evening" };
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

  const max = Math.max(...counts, 5);
  const W = 300, chartH = 90, baseY = 100;
  const barW = 26, totalBars = 7;
  const totalBarSpace = barW * totalBars;
  const gap = (W - totalBarSpace) / (totalBars + 1);

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
        <linearGradient id="barCustom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

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
        const trackH = 4;
        const barH   = hasCount ? Math.max((count / max) * chartH, 10) : 0;
        const barY   = baseY - barH;

        return (
          <g key={day}>
            <rect x={x} y={baseY - chartH} width={barW} height={chartH} rx={6}
              fill={isToday ? "rgba(122,184,64,0.07)" : "rgba(0,0,0,0.03)"} />
            {!hasCount && (
              <rect x={x} y={baseY - trackH} width={barW} height={trackH} rx={3}
                fill={isToday ? "#B8D880" : "#DDE8CC"} />
            )}
            {hasCount && (
              <>
                {isToday && (
                  <ellipse cx={x + barW / 2} cy={baseY} rx={barW * 0.7} ry={5}
                    fill="#7AB840" opacity="0.2" />
                )}
                <rect x={x} y={barY} width={barW} height={barH} rx={6}
                  fill={isToday ? "url(#barActive)" : "url(#barInactive)"}
                  style={isToday ? { filter: "drop-shadow(0 3px 8px rgba(122,184,64,0.5))" } : {}}
                />
                <circle cx={x + barW / 2} cy={barY - 11} r={10}
                  fill={isToday ? "#1A1A1A" : "#8A8A7A"} />
                <text x={x + barW / 2} y={barY - 7}
                  textAnchor="middle" fill="white"
                  fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">
                  {count}
                </text>
              </>
            )}
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

/* ── Permanent domain indicator (replaces expiry for custom) ─── */
function PermanentDomainBadge({ domain }: { domain: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-[#C084FC]" />
          <span className="text-xs font-semibold text-[#C084FC]">Custom Domain</span>
        </div>
        <span className="text-[10px] font-bold text-[#7AB840] bg-[#7AB840]/15 px-2 py-0.5 rounded-full">
          PERMANENT
        </span>
      </div>
      <div className="bg-white/[0.08] rounded-xl px-4 py-3 border border-white/[0.1]">
        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1">Receiving emails at</p>
        <p className="text-white/90 text-sm font-mono font-semibold truncate">*@{domain}</p>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/30">Via Brevo inbound</span>
        <span className="text-[10px] text-[#7AB840] font-semibold">Never expires</span>
      </div>
    </div>
  );
}

const TIPS_DEFAULT = [
  { tip: "Use a different temp email for every site to track who's selling your data." },
  { tip: "Share your temp address on public forums — never your real one." },
  { tip: "Your inbox auto-refreshes every 5 seconds. No need to manually reload." },
  { tip: "Emails auto-delete in 24 hours. Save anything important before then." },
  { tip: "Copy your address with one tap — paste it anywhere instantly." },
];

const TIPS_CUSTOM = [
  { tip: "Your custom domain inbox never expires — it's always ready when you need it." },
  { tip: "Create multiple addresses at the same domain for different projects." },
  { tip: "Emails arrive within seconds of being sent — real-time Brevo inbound routing." },
  { tip: "Share your custom domain address publicly — it's a real inbox on your own domain." },
  { tip: "All emails at *@yourdomain.com land here regardless of the prefix." },
];

/* ── Main page ───────────────────────────────────────────────── */
export default function ActivityPage() {
  const { mailbox } = useMailboxStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  const isCustom = mailbox?.provider === "custom";
  const domain = mailbox?.address?.split("@")[1] ?? "";
  const TIPS = isCustom ? TIPS_CUSTOM : TIPS_DEFAULT;

  const { data: messages = [] } = useGetMessages(mailbox?.id ?? "", {
    query: {
      enabled: !!mailbox?.id,
      queryKey: getGetMessagesQueryKey(mailbox?.id ?? ""),
    },
  });

  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, [TIPS.length]);

  const today       = new Date().toDateString();
  const todayCount  = messages.filter((m) => new Date(m.createdAt).toDateString() === today).length;
  const unreadCount = messages.filter((m) => !m.seen).length;
  const { text: greet } = greeting();
  const tip = TIPS[tipIdx];

  const copyAddress = () => {
    if (!mailbox?.address) return;
    navigator.clipboard.writeText(mailbox.address);
    setCopied(true);
    toast({ title: "Copied!", description: "Email address copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const privacyItems = isCustom
    ? [
        "No personal data collected",
        "No tracking or analytics",
        "Messages encrypted in transit",
        "Permanent inbox — never auto-deleted",
        "Powered by Brevo secure inbound",
      ]
    : [
        "No personal data collected",
        "No tracking or analytics",
        "Messages encrypted in transit",
        "Auto-deleted after 24 hours",
      ];

  return (
    <div className="flex flex-col h-full bg-[#F0F0E4] overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-3">

        {/* ── Hero header card ─────────────────────────────────── */}
        <div
          className="relative rounded-3xl overflow-hidden anim-slide-up"
          style={{
            background: isCustom
              ? "linear-gradient(145deg, #0D0218 0%, #1C0D38 55%, #0D0218 100%)"
              : "linear-gradient(145deg, #111111 0%, #1C2E0A 55%, #0F1F05 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-[0.07]"
            style={{ background: `radial-gradient(circle, ${isCustom ? "#A855F7" : "#7AB840"}, transparent)` }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-[0.07]"
            style={{ background: `radial-gradient(circle, ${isCustom ? "#A855F7" : "#7AB840"}, transparent)` }} />

          <div className="relative p-5">
            {/* Greeting */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/50 text-xs font-medium tracking-wide uppercase mb-0.5">
                  {greet}
                </p>
                <h1 className="text-white text-xl font-extrabold tracking-tight">
                  Your Activity
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                {isCustom ? (
                  <div className="flex items-center gap-1.5 bg-[#7C3AED]/30 px-2.5 py-1 rounded-full">
                    <Globe className="h-3 w-3 text-[#C084FC]" />
                    <span className="text-[#C084FC] text-[10px] font-bold">CUSTOM DOMAIN</span>
                  </div>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#7AB840] shadow-[0_0_8px_#7AB840]" />
                    <span className="text-[#7AB840] text-[11px] font-bold tracking-wide">ACTIVE</span>
                  </>
                )}
              </div>
            </div>

            {/* Email address row */}
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-3 hover:bg-white/[0.12] border border-white/[0.08] rounded-2xl px-4 py-3 transition-colors group mb-4"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isCustom ? "#7C3AED" : "#7AB840" }}
              >
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="flex-1 text-white/80 text-sm font-medium truncate text-left">
                {mailbox?.address ?? "No mailbox active"}
              </span>
              <span className={`flex-shrink-0 transition-colors ${copied ? (isCustom ? "text-[#C084FC]" : "text-[#7AB840]") : "text-white/30 group-hover:text-white/60"}`}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </span>
            </button>

            {/* Expiry or permanent indicator */}
            {mailbox?.createdAt && (
              isCustom
                ? <PermanentDomainBadge domain={domain} />
                : <ExpiryProgress createdAt={mailbox.createdAt} />
            )}
          </div>
        </div>

        {/* ── Quick action for custom domain ───────────────────── */}
        {isCustom && (
          <button
            onClick={() => navigate("/create")}
            className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_12px_rgba(124,58,237,0.1)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.2)] transition-all anim-slide-up border border-[#EDE9FE]"
            style={{ animationDelay: "55ms" }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
              <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#1A1A1A]">Create another address</p>
              <p className="text-xs text-[#9A9A9A]">New prefix at @{domain}</p>
            </div>
            <div className="text-[#7C3AED] text-xs font-semibold">+ New →</div>
          </button>
        )}

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
              label: isCustom ? "Domain" : "Mailbox",
              value: mailbox ? 1 : 0,
              sub: isCustom ? "permanent" : (mailbox ? "active" : "none"),
              icon: isCustom ? <Globe className="h-4 w-4" /> : <Zap className="h-4 w-4" />,
              accent: isCustom ? "#A855F7" : "#A855F7",
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
            background: isCustom
              ? "linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)"
              : "linear-gradient(135deg, #EDFAD3 0%, #E0F5C0 100%)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: isCustom ? "#7C3AED" : "#7AB840" }}
            >
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span
              className="font-bold text-sm"
              style={{ color: isCustom ? "#4C1D95" : "#2A4A10" }}
            >
              Privacy Protected
            </span>
          </div>
          <div className="space-y-2">
            {privacyItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="font-bold text-xs" style={{ color: isCustom ? "#7C3AED" : "#7AB840" }}>✓</span>
                <span className="text-xs font-medium" style={{ color: isCustom ? "#5B21B6" : "#3A5A18" }}>{item}</span>
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
            <p className="text-sm text-[#3A3A3A] leading-relaxed font-medium">{tip.tip}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {TIPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTipIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === tipIdx ? 16 : 6,
                  height:     6,
                  background: i === tipIdx ? (isCustom ? "#7C3AED" : "#7AB840") : "#E0E0D8",
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
