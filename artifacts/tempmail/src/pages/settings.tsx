import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import {
  Clock, Mail, PlusSquare, Bell, Moon, ShieldCheck,
  HelpCircle, Info, ChevronRight, Globe, Zap, Settings2,
  CheckCircle2, AlertCircle, ExternalLink,
} from "lucide-react";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-[26px] rounded-full transition-colors duration-300 flex-shrink-0 ${
        value ? "bg-[#7AB840]" : "bg-[#DDDDD4]"
      }`}
    >
      <div
        className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
          value ? "left-[22px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

type RowProps = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
};

function SettingRow({ icon: Icon, label, sub, right, onClick }: RowProps) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#F2F2E4] rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.8} />
        </div>
        <div>
          <div className="text-sm font-medium text-[#1A1A1A]">{label}</div>
          {sub && <div className="text-xs text-[#9A9A9A] mt-0.5 truncate max-w-[180px]">{sub}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        {right ?? <ChevronRight className="h-4 w-4 text-[#C8C8C0]" />}
      </div>
    </>
  );

  const cls = "w-full flex items-center justify-between px-4 py-3.5 active:bg-[#F8F8F4] hover:bg-[#F8F8F4] transition-colors text-left";

  if (onClick) {
    return <button onClick={onClick} className={cls}>{inner}</button>;
  }
  return <div className={cls}>{inner}</div>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F4F4EE] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}

interface DomainStatus {
  configured: boolean;
  domain?: string;
  configuredAt?: string;
}

export default function SettingsPage() {
  const { mailbox, clearMailbox } = useMailboxStore();
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState(() => localStorage.getItem("tm_notif") !== "false");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("tm_dark") === "true");
  const [secureStorage, setSecureStorage] = useState(() => localStorage.getItem("tm_secure") !== "false");
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);

  const isCustom = mailbox?.provider === "custom";

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => setDomainStatus(d as DomainStatus))
      .catch(() => setDomainStatus({ configured: false }))
      .finally(() => setDomainLoading(false));
  }, []);

  const configuredDate = domainStatus?.configuredAt
    ? new Date(domainStatus.configuredAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-5 md:px-8 pt-6 pb-32">

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6 anim-slide-up">Settings</h1>

        {/* Custom Domain Card — always show, configured or not */}
        <div className="mb-4 anim-slide-up" style={{ animationDelay: "20ms" }}>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">Custom Domain</p>

          {domainLoading ? (
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] animate-pulse">
              <div className="h-4 w-40 bg-[#F0F0E4] rounded mb-2" />
              <div className="h-3 w-56 bg-[#F0F0E4] rounded" />
            </div>
          ) : domainStatus?.configured ? (
            <div
              className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(124,58,237,0.12)]"
              style={{ background: "linear-gradient(135deg, #1A0A2E 0%, #2D1254 50%, #1A0A2E 100%)" }}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.3)" }}>
                      <Globe className="h-4.5 w-4.5 text-[#C4B5FD]" style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">Your Domain</p>
                      <p className="text-white font-bold text-base leading-tight">@{domainStatus.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#7AB840]/20 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#7AB840]" />
                    <span className="text-[#7AB840] text-[10px] font-bold">ACTIVE</span>
                  </div>
                </div>

                {/* Info row */}
                <div className="bg-white/[0.07] rounded-xl px-4 py-3 mb-4 border border-white/[0.08]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-0.5">Domain</p>
                      <p className="text-white/90 text-xs font-semibold font-mono truncate">{domainStatus.domain}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-0.5">Connected</p>
                      <p className="text-white/90 text-xs font-semibold">{configuredDate ?? "Recently"}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-0.5">Provider</p>
                      <p className="text-white/90 text-xs font-semibold">Brevo Inbound</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-0.5">Expiry</p>
                      <p className="text-[#7AB840] text-xs font-bold">Never</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/create")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: "rgba(122,184,64,0.25)", border: "1px solid rgba(122,184,64,0.3)" }}
                  >
                    <Zap className="h-3.5 w-3.5 text-[#7AB840]" />
                    New Address
                  </button>
                  <button
                    onClick={() => navigate("/setup")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Reconfigure
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate("/setup")}
              className="w-full bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex items-center gap-4 hover:bg-[#FAFAF6] transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #F3E8FF, #EDE9FE)" }}>
                <Globe className="h-6 w-6 text-[#7C3AED]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] mb-0.5">Use your own domain</p>
                <p className="text-xs text-[#7A7A7A] leading-relaxed">Receive real emails at <span className="font-semibold">you@yourdomain.com</span> · never expires</p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 text-[#7C3AED]">
                <span className="text-xs font-semibold">Set up</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </button>
          )}
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-5 space-y-4 md:space-y-0">

          {/* Email Settings */}
          <div className="anim-slide-up" style={{ animationDelay: "80ms" }}>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">Email</p>
            <SectionCard>
              <SettingRow
                icon={Clock}
                label="Auto delete"
                sub={isCustom ? "Never — permanent address" : "After 24 hours"}
                right={
                  isCustom
                    ? <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">Permanent</span>
                    : <ChevronRight className="h-4 w-4 text-[#C8C8C0]" />
                }
              />
              <SettingRow
                icon={Mail}
                label="Active address"
                sub={mailbox?.address ?? "No mailbox active"}
                onClick={() => navigate("/")}
              />
              {isCustom && domainStatus?.configured && (
                <SettingRow
                  icon={Globe}
                  label="Custom domain"
                  sub={domainStatus.domain}
                  right={<span className="text-[10px] font-bold text-[#7AB840] bg-[#EDFAD3] px-2 py-0.5 rounded-full">Connected</span>}
                />
              )}
              <SettingRow icon={PlusSquare} label="Add to home screen" />
            </SectionCard>
          </div>

          {/* General */}
          <div className="anim-slide-up" style={{ animationDelay: "140ms" }}>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">General</p>
            <SectionCard>
              <SettingRow
                icon={Bell}
                label="Notifications"
                right={<Toggle value={notifications} onChange={(v) => { setNotifications(v); localStorage.setItem("tm_notif", String(v)); }} />}
              />
              <SettingRow
                icon={Moon}
                label="Dark mode"
                right={<Toggle value={darkMode} onChange={(v) => { setDarkMode(v); localStorage.setItem("tm_dark", String(v)); }} />}
              />
              <SettingRow
                icon={ShieldCheck}
                label="Secure storage"
                right={<Toggle value={secureStorage} onChange={(v) => { setSecureStorage(v); localStorage.setItem("tm_secure", String(v)); }} />}
              />
            </SectionCard>
          </div>

          {/* About */}
          <div className="md:col-span-2 anim-slide-up" style={{ animationDelay: "200ms" }}>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">About</p>
            <SectionCard>
              <SettingRow icon={HelpCircle} label="Help & Support" />
              <SettingRow icon={Info} label="About Temp Mail" />
            </SectionCard>
          </div>

          {/* Danger zone — clear mailbox */}
          {mailbox && (
            <div className="md:col-span-2 anim-slide-up" style={{ animationDelay: "260ms" }}>
              <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">Session</p>
              <SectionCard>
                <button
                  onClick={() => { clearMailbox(); navigate("/"); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FFF0F0] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FFF0F0] rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-[#DC2626]" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#DC2626]">Clear active mailbox</div>
                      <div className="text-xs text-[#9A9A9A] mt-0.5">Remove current session and start fresh</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#FECACA]" />
                </button>
              </SectionCard>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
