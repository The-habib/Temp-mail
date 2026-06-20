import { useState } from "react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import {
  Clock,
  Mail,
  PlusSquare,
  Bell,
  Moon,
  ShieldCheck,
  HelpCircle,
  Info,
  ChevronRight,
} from "lucide-react";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        value ? "bg-[#7AB840]" : "bg-[#D8D8D0]"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  label,
  sub,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#F2F2E4] rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[#7A7A7A]" />
        </div>
        <div>
          <div className="text-sm font-medium text-[#1A1A1A]">{label}</div>
          {sub && <div className="text-xs text-[#9A9A9A]">{sub}</div>}
        </div>
      </div>
      <div className="flex-shrink-0">{right ?? <ChevronRight className="h-4 w-4 text-[#CACAC0]" />}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { mailbox } = useMailboxStore();
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("tm_notif") !== "false"
  );
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("tm_dark") === "true");
  const [secureStorage, setSecureStorage] = useState(
    () => localStorage.getItem("tm_secure") !== "false"
  );

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto">
      <div className="px-5 pt-6 pb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Settings</h1>

        <div className="mb-4">
          <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-2 px-1">
            Email Settings
          </p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F4F4EE]">
            <SettingRow icon={Clock} label="Auto delete" sub="After 24 hours" />
            <SettingRow
              icon={Mail}
              label="Email alias"
              sub={mailbox?.address ?? "No mailbox active"}
            />
            <SettingRow icon={PlusSquare} label="Add to home screen" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-2 px-1">
            General
          </p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F4F4EE]">
            <SettingRow
              icon={Bell}
              label="Notifications"
              right={
                <Toggle
                  value={notifications}
                  onChange={(v) => {
                    setNotifications(v);
                    localStorage.setItem("tm_notif", String(v));
                  }}
                />
              }
            />
            <SettingRow
              icon={Moon}
              label="Dark mode"
              right={
                <Toggle
                  value={darkMode}
                  onChange={(v) => {
                    setDarkMode(v);
                    localStorage.setItem("tm_dark", String(v));
                  }}
                />
              }
            />
            <SettingRow
              icon={ShieldCheck}
              label="Secure storage"
              right={
                <Toggle
                  value={secureStorage}
                  onChange={(v) => {
                    setSecureStorage(v);
                    localStorage.setItem("tm_secure", String(v));
                  }}
                />
              }
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F4F4EE]">
            <SettingRow icon={HelpCircle} label="Help & Support" />
            <SettingRow icon={Info} label="About Temp Mail" />
          </div>
        </div>
      </div>
    </div>
  );
}
