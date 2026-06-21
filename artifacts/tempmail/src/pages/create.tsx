import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetProviderDomains, useCreateMailbox, useGetProviders } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { useSavedAddresses } from "@/hooks/use-saved-addresses";
import { ArrowLeft, Check, Shield, Globe, ChevronRight, Shuffle, Info, Bookmark, X, Star } from "lucide-react";

type ProviderKey = "mailtm" | "guerrillamail" | "custom";

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

const STATIC_PROVIDERS: ProviderInfo[] = [
  {
    id: "custom",
    name: "My Domain",
    description: "Your own domain · real inbox",
    supportsCustom: true,
    supportsDomain: true,
    icon: <Star className="h-4 w-4" />,
    badge: "Own Domain",
    color: "#7C3AED",
  },
  {
    id: "mailtm",
    name: "Mail.tm",
    description: "Fast & reliable · choose domain",
    supportsCustom: true,
    supportsDomain: true,
    icon: <Shield className="h-4 w-4" />,
    badge: "Popular",
    color: "#7AB840",
  },
  {
    id: "guerrillamail",
    name: "Guerrilla Mail",
    description: "Classic & trusted · auto domain",
    supportsCustom: true,
    supportsDomain: false,
    icon: <Globe className="h-4 w-4" />,
    color: "#4285F4",
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
  const { saved, save: saveAddress, remove: removeSaved } = useSavedAddresses();
  const domainScrollRef = useRef<HTMLDivElement>(null);

  const { data: serverProviders } = useGetProviders();

  const hasCustomDomain = serverProviders?.some((p) => p.id === "custom") ?? false;
  const PROVIDERS = hasCustomDomain ? STATIC_PROVIDERS : STATIC_PROVIDERS.filter((p) => p.id !== "custom");

  const [mode, setMode] = useState<"random" | "custom">("random");
  const [customUsername, setCustomUsername] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>("mailtm");
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  useEffect(() => {
    if (hasCustomDomain && selectedProvider === "mailtm") {
      setSelectedProvider("custom");
    }
  }, [hasCustomDomain]);

  const createMailbox = useCreateMailbox();
  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0]!;

  const { data: domains = [], isLoading: domainsLoading } = useGetProviderDomains(selectedProvider, {
    query: { enabled: currentProvider?.supportsDomain === true },
  });

  useEffect(() => {
    if (domains.length > 0) {
      setSelectedDomain(domains[0]!.domain);
      domainScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      setSelectedDomain("");
    }
  }, [selectedProvider, domains]);

  useEffect(() => {
    if (!currentProvider.supportsCustom) setMode("random");
  }, [currentProvider]);

  const handleCreate = () => {
    if (selectedProvider === "custom") {
      const localPart = mode === "custom" && customUsername.trim()
        ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
        : undefined;

      createMailbox.mutate(
        { data: { address: `${localPart ?? "random"}@placeholder`, password: "unused", provider: "custom" as never, localPart } as never },
        {
          onSuccess: (data) => {
            setMailbox(data);
            if (mode === "custom" && customUsername.trim()) {
              saveAddress({
                username: customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                domain: data.address.split("@")[1] || "",
                address: data.address,
                provider: "custom",
              });
            }
            toast({ title: "Custom inbox created!", description: data.address });
            navigate("/");
          },
          onError: () =>
            toast({ title: "Error", description: "Failed to create custom domain mailbox.", variant: "destructive" }),
        }
      );
      return;
    }

    const username =
      mode === "custom" && customUsername.trim() && currentProvider.supportsCustom
        ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
        : generateRandomString(10);

    const address = currentProvider.supportsDomain
      ? `${username}@${selectedDomain || domains[0]?.domain || "mail.tm"}`
      : `${username}@guerrillamail.com`;

    const password = generateRandomString(14);

    createMailbox.mutate(
      { data: { address, password, provider: selectedProvider as never } },
      {
        onSuccess: (data) => {
          setMailbox(data);
          if (mode === "custom" && customUsername.trim()) {
            saveAddress({
              username: customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""),
              domain: selectedDomain || domains[0]?.domain || "",
              address: data.address,
              provider: selectedProvider,
            });
          }
          toast({ title: "Mailbox created!", description: data.address });
          navigate("/");
        },
        onError: () =>
          toast({
            title: "Error",
            description:
              selectedProvider === "guerrillamail"
                ? "Guerrilla Mail couldn't create that address — try a different username."
                : "That username may already be taken — try a different one.",
            variant: "destructive",
          }),
      }
    );
  };

  const shuffleDomain = () => {
    if (domains.length < 2) return;
    const others = domains.filter((d) => d.domain !== selectedDomain);
    const pick = others[Math.floor(Math.random() * others.length)];
    setSelectedDomain(pick!.domain);
    const idx = domains.findIndex((d) => d.domain === pick!.domain);
    const chip = domainScrollRef.current?.children[idx] as HTMLElement | undefined;
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const canCreate =
    !createMailbox.isPending &&
    (selectedProvider === "custom" ||
      (!currentProvider.supportsDomain || selectedDomain !== "")) &&
    (mode === "random" || !currentProvider.supportsCustom || customUsername.trim().length > 0);

  const previewAddress =
    selectedProvider === "custom"
      ? mode === "custom" && customUsername.trim()
        ? `${customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${selectedDomain || "yourdomain.com"}`
        : `random.name123@${selectedDomain || "yourdomain.com"}`
      : currentProvider.supportsDomain
      ? `${mode === "custom" && customUsername.trim() ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") : "username"}@${selectedDomain || "..."}`
      : `${mode === "custom" && customUsername.trim() ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") : "username"}@auto-assigned.domain`;

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

      {/* Custom domain info banner */}
      {selectedProvider === "custom" && (
        <div className="mx-5 mb-5 bg-[#F3E8FF] rounded-2xl px-4 py-3 flex items-start gap-2.5 anim-slide-up" style={{ animationDelay: "90ms" }}>
          <Info className="h-4 w-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#5B21B6] font-semibold mb-0.5">Emails land in your real inbox</p>
            <p className="text-xs text-[#7C3AED] leading-relaxed">
              Emails sent to this address arrive here instantly via Mailgun. Make sure MX records are pointed at Mailgun for your domain.
            </p>
          </div>
        </div>
      )}

      {/* Domain picker — only for providers that support it */}
      {currentProvider.supportsDomain && selectedProvider !== "custom" && (
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

      {/* Auto-domain note for Guerrilla Mail */}
      {!currentProvider.supportsDomain && (
        <div className="mx-5 mb-5 bg-[#EDF3FB] rounded-2xl px-4 py-3 flex items-center gap-2.5 anim-slide-up" style={{ animationDelay: "100ms" }}>
          <Info className="h-4 w-4 text-[#4285F4] flex-shrink-0" />
          <p className="text-sm text-[#2A5AC4] font-medium">Domain is assigned automatically by Guerrilla Mail.</p>
        </div>
      )}

      {/* Username mode */}
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
                {m === "random" ? "Random" : "Custom"}
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
            {(selectedDomain || selectedProvider === "custom") && (
              <div className="flex items-center text-sm text-[#7A7A7A] flex-shrink-0 border-l border-[#E8E8D8] pl-3 gap-1">
                <span>@{selectedDomain || "yourdomain.com"}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              </div>
            )}
          </div>

          {/* Saved addresses */}
          {mode === "custom" && saved.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Bookmark className="h-3 w-3 text-[#9A9A9A]" />
                <span className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest">Saved</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {saved.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-[#E8E8D8] group"
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => {
                        setCustomUsername(s.username);
                        if (s.provider === selectedProvider && s.domain && currentProvider.supportsDomain) {
                          setSelectedDomain(s.domain);
                        }
                      }}
                    >
                      <span className="text-sm font-medium text-[#1A1A1A] truncate block">{s.address}</span>
                      <span className="text-[10px] text-[#ABABAB] capitalize">{s.provider}</span>
                    </button>
                    <button
                      onClick={() => removeSaved(s.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-[#BCBCBC] hover:text-[#FF5A5A] hover:bg-[#FFF0F0] transition-colors flex-shrink-0"
                      title="Remove saved address"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
