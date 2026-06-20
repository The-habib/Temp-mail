import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetProviderDomains, useCreateMailbox } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Zap, Shield, Globe, ChevronRight, Shuffle } from "lucide-react";

type ProviderKey = "mailtm" | "guerrillamail" | "templol";

interface ProviderInfo {
  id: ProviderKey;
  name: string;
  description: string;
  supportsCustom: boolean;
  supportsDomain: boolean;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "mailtm",
    name: "Mail.tm",
    description: "Fast & reliable",
    supportsCustom: true,
    supportsDomain: true,
    icon: <Shield className="h-4 w-4" />,
    badge: "Popular",
    color: "#7AB840",
  },
  {
    id: "guerrillamail",
    name: "Guerrilla Mail",
    description: "Classic & trusted · 8 domains",
    supportsCustom: true,
    supportsDomain: true,
    icon: <Globe className="h-4 w-4" />,
    color: "#4285F4",
  },
  {
    id: "templol",
    name: "TempMail.lol",
    description: "Simple & instant",
    supportsCustom: false,
    supportsDomain: false,
    icon: <Zap className="h-4 w-4" />,
    badge: "Instant",
    color: "#FF6D00",
  },
];

function generateRandomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CreatePage() {
  const [, navigate] = useLocation();
  const { setMailbox } = useMailboxStore();
  const { toast } = useToast();
  const domainScrollRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"random" | "custom">("random");
  const [customUsername, setCustomUsername] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>("mailtm");
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  const { data: domains = [], isLoading: domainsLoading } = useGetProviderDomains(selectedProvider, {
    query: { enabled: selectedProvider !== "templol" },
  });

  const createMailbox = useCreateMailbox();
  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  // Reset domain selection when provider or domains change
  useEffect(() => {
    if (domains.length > 0) {
      setSelectedDomain(domains[0].domain);
      domainScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      setSelectedDomain("");
    }
  }, [selectedProvider, domains]);

  // Reset custom mode if provider doesn't support it
  useEffect(() => {
    if (!currentProvider.supportsCustom) setMode("random");
  }, [currentProvider]);

  const handleCreate = () => {
    const username =
      mode === "custom" && customUsername.trim() && currentProvider.supportsCustom
        ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
        : generateRandomString(10);

    const address =
      selectedProvider === "templol"
        ? `${generateRandomString(8)}@placeholder.com`
        : `${username}@${selectedDomain || domains[0]?.domain || "mail.tm"}`;

    const password = generateRandomString(14);

    createMailbox.mutate(
      { data: { address, password, provider: selectedProvider } },
      {
        onSuccess: (data) => {
          setMailbox(data);
          toast({ title: "Mailbox created!", description: data.address });
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

  const shuffleDomain = () => {
    if (domains.length < 2) return;
    const others = domains.filter((d) => d.domain !== selectedDomain);
    const pick = others[Math.floor(Math.random() * others.length)];
    setSelectedDomain(pick.domain);
    const idx = domains.findIndex((d) => d.domain === pick.domain);
    const chip = domainScrollRef.current?.children[idx] as HTMLElement | undefined;
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const canCreate =
    !createMailbox.isPending &&
    (selectedProvider === "templol" || selectedDomain !== "") &&
    (mode === "random" || !currentProvider.supportsCustom || customUsername.trim().length > 0);

  const previewAddress =
    selectedProvider === "templol"
      ? "auto@generated.address"
      : `${
          mode === "custom" && customUsername.trim()
            ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
            : "username"
        }@${selectedDomain || "..."}`;

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto pb-10">
      {/* Header */}
      <div className="px-5 pt-5 flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] rounded-full hover:bg-[#E8E8D8] -ml-1 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A] leading-tight">New Email</h1>
          <p className="text-xs text-[#7A7A7A]">Pick a provider and domain</p>
        </div>
      </div>

      {/* Address preview pill */}
      <div className="mx-5 mb-5 bg-[#1A1A1A] rounded-2xl px-4 py-3.5 anim-slide-up" style={{ animationDelay: "20ms" }}>
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Preview</p>
        <p className="text-white font-mono text-sm truncate">{previewAddress}</p>
      </div>

      {/* Provider cards */}
      <div className="px-5 mb-5 anim-slide-up" style={{ animationDelay: "60ms" }}>
        <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2.5">Provider</p>
        <div className="flex flex-col gap-2">
          {PROVIDERS.map((p) => {
            const active = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                  active
                    ? "border-[#1A1A1A] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
                    : "border-transparent bg-white/60 hover:bg-white"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 text-white"
                  style={{ backgroundColor: active ? p.color : "#E8E8DC" }}
                >
                  <span style={{ color: active ? "white" : "#9A9A9A" }}>{p.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{p.name}</span>
                    {p.badge && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: active ? p.color : "#E8E8D8",
                          color: active ? "white" : "#7A7A7A",
                        }}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">{p.description}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    borderColor: active ? "#1A1A1A" : "#DDDDC8",
                    backgroundColor: active ? "#1A1A1A" : "transparent",
                  }}
                >
                  {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Domain picker — only for providers that support it */}
      {currentProvider.supportsDomain && (
        <div className="px-5 mb-5 anim-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest">Domain</p>
            {domains.length > 1 && (
              <button
                onClick={shuffleDomain}
                className="flex items-center gap-1 text-[11px] text-[#7AB840] font-semibold hover:text-[#5A9030]"
              >
                <Shuffle className="h-3 w-3" />
                Random
              </button>
            )}
          </div>

          {domainsLoading ? (
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-32 bg-[#E8E8D8] rounded-full animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <div className="bg-white/70 rounded-2xl px-4 py-3 text-sm text-[#9A9A9A]">
              No domains available
            </div>
          ) : (
            <div
              ref={domainScrollRef}
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {domains.map((d) => {
                const active = selectedDomain === d.domain;
                return (
                  <button
                    key={d.domain}
                    onClick={() => setSelectedDomain(d.domain)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 ${
                      active
                        ? "border-transparent text-white shadow-sm"
                        : "border-[#E8E8D8] bg-white text-[#5A5A5A] hover:border-[#C8C8B8]"
                    }`}
                    style={active ? { backgroundColor: currentProvider.color, borderColor: "transparent" } : {}}
                  >
                    @{d.domain}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TempMail.lol auto-note */}
      {!currentProvider.supportsDomain && (
        <div className="mx-5 mb-5 bg-[#EDF6E0] rounded-2xl px-4 py-3 flex items-center gap-2.5 anim-slide-up" style={{ animationDelay: "100ms" }}>
          <Zap className="h-4 w-4 text-[#7AB840] flex-shrink-0" />
          <p className="text-sm text-[#5A8A28] font-medium">Address & domain are auto-generated instantly.</p>
        </div>
      )}

      {/* Username mode — only for providers that support custom */}
      {currentProvider.supportsCustom && (
        <div className="px-5 mb-5 anim-slide-up" style={{ animationDelay: "140ms" }}>
          <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest mb-2.5">Username</p>

          <div className="bg-[#EAEADA] rounded-full p-1 flex mb-3">
            {(["random", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize transition-all duration-200 ${
                  mode === m ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#7A7A7A]"
                }`}
              >
                {m === "random" ? "🎲 Random" : "✏️ Custom"}
              </button>
            ))}
          </div>

          <div
            className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-2 border-2 transition-colors duration-200"
            style={{ borderColor: mode === "custom" ? currentProvider.color : "#E8E8D8" }}
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
            {selectedDomain && (
              <div className="flex items-center text-sm text-[#7A7A7A] flex-shrink-0 border-l border-[#E8E8D8] pl-3 gap-1">
                <span>@{selectedDomain}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create button */}
      <div className="px-5 anim-slide-up" style={{ animationDelay: "180ms" }}>
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-semibold text-base disabled:opacity-50 hover:bg-[#2A2A2A] transition-colors"
          data-testid="button-create-email"
        >
          <span>{createMailbox.isPending ? "Creating…" : "Create Email"}</span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: currentProvider.color }}
          >
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
    </div>
  );
}
