import { useState } from "react";
import { useLocation } from "wouter";
import { useGetDomains, useCreateMailbox } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Zap, Shield, Globe } from "lucide-react";

type ProviderKey = "mailtm" | "guerrillamail" | "templol";

interface ProviderInfo {
  id: ProviderKey;
  name: string;
  description: string;
  supportsCustom: boolean;
  icon: React.ReactNode;
  badge?: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "mailtm",
    name: "Mail.tm",
    description: "Fast & reliable",
    supportsCustom: true,
    icon: <Shield className="h-4 w-4" />,
    badge: "Popular",
  },
  {
    id: "guerrillamail",
    name: "Guerrilla Mail",
    description: "Classic & trusted",
    supportsCustom: true,
    icon: <Globe className="h-4 w-4" />,
  },
  {
    id: "templol",
    name: "TempMail.lol",
    description: "Simple & instant",
    supportsCustom: false,
    icon: <Zap className="h-4 w-4" />,
    badge: "Instant",
  },
];

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

export default function CreatePage() {
  const [, navigate] = useLocation();
  const { setMailbox } = useMailboxStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [customUsername, setCustomUsername] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>("mailtm");

  const { data: domains } = useGetDomains();
  const createMailbox = useCreateMailbox();

  const domain = domains?.[0]?.domain ?? "...";
  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  const handleCreate = () => {
    if (!domains || domains.length === 0) return;
    const username =
      mode === "custom" && customUsername.trim() && currentProvider.supportsCustom
        ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
        : generateRandomString(8);

    const address = selectedProvider === "templol"
      ? `${generateRandomString(8)}@placeholder.com`
      : `${username}@${domain}`;
    const password = generateRandomString(12);

    createMailbox.mutate(
      { data: { address, password, provider: selectedProvider } },
      {
        onSuccess: (data) => {
          setMailbox(data);
          toast({ title: "Mailbox created", description: `New address: ${data.address}` });
          navigate("/");
        },
        onError: () =>
          toast({
            title: "Error",
            description: "That username may be taken — try a different one.",
            variant: "destructive",
          }),
      }
    );
  };

  const canCreate =
    !createMailbox.isPending &&
    (mode === "random" || !currentProvider.supportsCustom || customUsername.trim().length > 0);

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] px-5 pt-5 pb-8 overflow-y-auto">

      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="w-9 h-9 flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] rounded-full hover:bg-[#E8E8D8] -ml-1 mb-3 anim-fade"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Heading */}
      <div className="mb-5 anim-slide-up" style={{ animationDelay: "40ms" }}>
        <h1 className="text-[2rem] font-bold text-[#1A1A1A] leading-snug">
          New<br />Email
        </h1>
        <p className="text-[#7A7A7A] text-sm mt-1">Pick a provider and customize your address.</p>
      </div>

      {/* Provider selection */}
      <div className="mb-5 anim-slide-up" style={{ animationDelay: "80ms" }}>
        <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2.5">Provider</p>
        <div className="flex flex-col gap-2.5">
          {PROVIDERS.map((p) => {
            const active = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p.id);
                  if (!p.supportsCustom) setMode("random");
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-left ${
                  active
                    ? "border-[#7AB840] bg-white shadow-[0_2px_12px_rgba(122,184,64,0.15)]"
                    : "border-transparent bg-white/70 hover:bg-white"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                  active ? "bg-[#7AB840] text-white" : "bg-[#F0F0E4] text-[#7A7A7A]"
                }`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{p.name}</span>
                    {p.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? "bg-[#7AB840] text-white" : "bg-[#E8E8D8] text-[#7A7A7A]"
                      }`}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">{p.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  active ? "border-[#7AB840] bg-[#7AB840]" : "border-[#DDDDC8]"
                }`}>
                  {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Random / Custom toggle — only if provider supports it */}
      {currentProvider.supportsCustom ? (
        <>
          <div className="bg-[#EAEADA] rounded-full p-1 flex mb-4 anim-slide-up" style={{ animationDelay: "120ms" }}>
            {(["random", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold capitalize transition-all duration-250 ${
                  mode === m
                    ? m === "custom"
                      ? "bg-[#7AB840] text-white shadow-sm"
                      : "bg-white text-[#1A1A1A] shadow-sm"
                    : "text-[#7A7A7A]"
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <div
            className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-2 mb-6 border-2 transition-colors duration-200 anim-slide-up"
            style={{
              borderColor: mode === "custom" ? "#7AB840" : "#E8E8D8",
              animationDelay: "160ms",
            }}
          >
            <input
              type="text"
              placeholder={mode === "random" ? "auto-generated" : "your username"}
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              disabled={mode === "random"}
              className="flex-1 text-sm text-[#1A1A1A] placeholder-[#C8C8B8] outline-none disabled:opacity-40 bg-transparent"
              data-testid="input-username"
            />
            <div className="flex items-center text-sm text-[#7A7A7A] flex-shrink-0 border-l border-[#E8E8D8] pl-3">
              @{domain}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#EDF6E0] rounded-2xl px-4 py-3 mb-6 anim-slide-up flex items-center gap-2.5" style={{ animationDelay: "120ms" }}>
          <Zap className="h-4 w-4 text-[#7AB840] flex-shrink-0" />
          <p className="text-sm text-[#5A8A28] font-medium">Address is auto-generated by this provider.</p>
        </div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-semibold text-base disabled:opacity-50 hover:bg-[#2A2A2A] anim-slide-up"
        style={{ animationDelay: "200ms" }}
        data-testid="button-create-email"
      >
        <span>{createMailbox.isPending ? "Creating…" : "Create Email"}</span>
        <div className="w-9 h-9 bg-[#7AB840] rounded-full flex items-center justify-center flex-shrink-0">
          {createMailbox.isPending ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeDasharray="30" strokeDashoffset="10" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
