import { useState } from "react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import {
  Clock, Mail, PlusSquare, Bell, Moon, ShieldCheck,
  HelpCircle, Info, ChevronRight,
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
  delay?: number;
};

function SettingRow({ icon: Icon, label, sub, right, delay = 0 }: RowProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 active:bg-[#F8F8F4] transition-colors"
    >
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
    </div>
  );
}

function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F4F4EE] shadow-[0_1px_4px_rgba(0,0,0,0.04)] anim-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { mailbox } = useMailboxStore();
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("tm_notif") !== "false"
  );
  const [darkMode, setDarkMode]= useState(
    () => localStorage.getItem("tm_dark") === "true"
  );
  const [secureStorage, setSecureStorage] = useState(
    () => localStorage.getItem("tm_secure") !== "false"
  );

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto">
      <div className="px-5 pt-6 pb-10">

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6 anim-slide-up">Settings</h1>

        {/* Email Settings */}
        <div className="mb-4 anim-slide-up" style={{ animationDelay: "50ms" }}>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">
            Email Settings
          </p>
          <SectionCard delay={50}>
            <SettingRow icon={Clock}      label="Auto delete" sub="After 24 hours" />
            <SettingRow icon={Mail}       label="Email alias" sub={mailbox?.address ?? "No mailbox active"} />
            <SettingRow icon={PlusSquare} label="Add to home screen" />
          </SectionCard>
        </div>

        {/* General */}
        <div className="mb-4 anim-slide-up" style={{ animationDelay: "120ms" }}>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">
            General
          </p>
          <SectionCard delay={120}>
            <SettingRow
              icon={Bell}
              label="Notifications"
              right={
                <Toggle value={notifications} onChange={(v) => {
                  setNotifications(v);
                  localStorage.setItem("tm_notif", String(v));
                }} />
              }
            />
            <SettingRow
              icon={Moon}
              label="Dark mode"
              right={
                <Toggle value={darkMode} onChange={(v) => {
                  setDarkMode(v);
                  localStorage.setItem("tm_dark", String(v));
                }} />
              }
            />
            <SettingRow
              icon={ShieldCheck}
              label="Secure storage"
              right={
                <Toggle value={secureStorage} onChange={(v) => {
                  setSecureStorage(v);
                  localStorage.setItem("tm_secure", String(v));
                }} />
              }
            />
          </SectionCard>
        </div>

        {/* About */}
        <div className="anim-slide-up" style={{ animationDelay: "190ms" }}>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2 px-1">
            About
          </p>
          <SectionCard delay={190}>
            <SettingRow icon={HelpCircle} label="Help & Support" />
            <SettingRow icon={Info}       label="About Temp Mail" />
          </SectionCard>
        </div>

      </div>
    </div>
  );
}
