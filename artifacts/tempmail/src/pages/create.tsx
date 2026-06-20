import { useState } from "react";
import { useLocation } from "wouter";
import { useGetDomains, useCreateMailbox } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

export default function CreatePage() {
  const [, navigate] = useLocation();
  const { setMailbox } = useMailboxStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [customUsername, setCustomUsername] = useState("");

  const { data: domains } = useGetDomains();
  const createMailbox = useCreateMailbox();

  const domain = domains?.[0]?.domain ?? "...";

  const handleCreate = () => {
    if (!domains || domains.length === 0) return;
    const username =
      mode === "custom" && customUsername.trim()
        ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
        : generateRandomString(8);
    const address = `${username}@${domain}`;
    const password = generateRandomString(12);

    createMailbox.mutate(
      { data: { address, password } },
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
    (mode === "random" || customUsername.trim().length > 0);

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
          Create<br />New Email
        </h1>
        <p className="text-[#7A7A7A] text-sm mt-1">Customize your email or generate randomly.</p>
      </div>

      {/* Illustration */}
      <div className="flex justify-center mb-6 anim-scale-in" style={{ animationDelay: "80ms" }}>
        <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-56 h-auto">
          <ellipse cx="38"  cy="148" rx="18" ry="32" fill="#7AB840" transform="rotate(-20 38 148)" />
          <ellipse cx="26"  cy="136" rx="11" ry="20" fill="#5A9030" transform="rotate(-35 26 136)" />
          <ellipse cx="222" cy="148" rx="18" ry="32" fill="#7AB840" transform="rotate(20 222 148)" />
          <ellipse cx="234" cy="136" rx="11" ry="20" fill="#5A9030" transform="rotate(35 234 136)" />
          <rect x="58" y="72" width="144" height="108" rx="12" fill="#1A1A1A" />
          <polygon points="58,72 130,128 202,72" fill="#7AB840" />
          <polygon points="58,180 104,126 130,144 156,126 202,180" fill="#252525" />
          <circle cx="130" cy="40" r="16" fill="#F5C040" />
          <circle cx="130" cy="40" r="8"  fill="#E8A820" />
          <ellipse cx="113" cy="46" rx="9" ry="5.5" fill="#7AB840" transform="rotate(-30 113 46)" />
          <ellipse cx="147" cy="46" rx="9" ry="5.5" fill="#7AB840" transform="rotate(30 147 46)" />
          <line x1="130" y1="56" x2="130" y2="72" stroke="#5A9030" strokeWidth="2.5" />
          <circle cx="52"  cy="74"  r="4"   fill="#7AB840" opacity="0.7" />
          <circle cx="210" cy="88"  r="3.5" fill="#F5C040" opacity="0.8" />
          <circle cx="44"  cy="108" r="3"   fill="#7AB840" opacity="0.5" />
          <g transform="translate(205,52) rotate(-10)">
            <polygon points="0,0 22,8 0,16" fill="#7AB840" opacity="0.8" />
          </g>
        </svg>
      </div>

      {/* Random / Custom toggle */}
      <div className="bg-[#EAEADA] rounded-full p-1 flex mb-5 anim-slide-up" style={{ animationDelay: "120ms" }}>
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

      {/* Input */}
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
