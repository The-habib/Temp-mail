import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetMessages,
  useGetMessage,
  useDeleteMessage,
  getGetMessagesQueryKey,
  getGetMessageQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Copy, Check, RefreshCw, Edit3, Clock, Trash2, ArrowLeft,
  Mail, Inbox, Sparkles, ShieldCheck,
} from "lucide-react";

function pad(n: number) { return String(n).padStart(2, "0"); }

function avatarColor(text: string): [string, string] {
  const palettes: [string, string][] = [
    ["#FF6B6B", "#FF8E53"], ["#4ECDC4", "#44A08D"], ["#A18CD1", "#FBC2EB"],
    ["#FFECD2", "#FCB69F"], ["#A1C4FD", "#C2E9FB"], ["#FD746C", "#FF9068"],
    ["#43E97B", "#38F9D7"], ["#FA709A", "#FEE140"],
  ];
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % palettes.length;
  return palettes[Math.abs(h)];
}

const PROVIDER_META: Record<string, { name: string; bg: string; text: string }> = {
  mailtm:        { name: "Mail.tm",       bg: "#EDFAD3", text: "#4A7A10" },
  guerrillamail: { name: "Guerrilla",     bg: "#DBEAFE", text: "#1D4ED8" },
  templol:       { name: "TempMail.lol",  bg: "#FEF3C7", text: "#B45309" },
};

export default function HomePage() {
  const { mailbox, clearMailbox } = useMailboxStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"All" | "Unread" | "Read">("All");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hrs: 23, mins: 59, secs: 59 });
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const providerKey = mailbox?.provider || "mailtm";
  const providerMeta = PROVIDER_META[providerKey] ?? { name: providerKey, bg: "#EDFAD3", text: "#4A7A10" };

  useEffect(() => {
    if (!mailbox?.createdAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(mailbox.createdAt).getTime() + 86400000 - Date.now());
      setTimeLeft({
        hrs:  Math.floor(diff / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mailbox?.createdAt]);

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    isFetching,
    refetch,
    error: messagesError,
  } = useGetMessages(mailbox?.id ?? "", {
    query: {
      enabled: !!mailbox?.id,
      refetchInterval: 5000,
      queryKey: getGetMessagesQueryKey(mailbox?.id ?? ""),
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401) return false;
        return failureCount < 2;
      },
    },
  });

  useEffect(() => {
    const status = (messagesError as { status?: number } | null)?.status;
    if (status === 401) {
      clearMailbox();
      toast({ title: "Session expired", description: "Your mailbox session is no longer valid. Please create a new one." });
    }
  }, [messagesError]);

  const { data: selectedMessage, isLoading: isLoadingMessage } = useGetMessage(
    mailbox?.id ?? "",
    selectedMessageId ?? "",
    {
      query: {
        enabled: !!mailbox?.id && !!selectedMessageId,
        queryKey: getGetMessageQueryKey(mailbox?.id ?? "", selectedMessageId ?? ""),
      },
    }
  );

  const deleteMessage = useDeleteMessage();

  const copyToClipboard = () => {
    if (!mailbox?.address) return;
    navigator.clipboard.writeText(mailbox.address);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2200);
    toast({ title: "Copied!", description: "Email address copied to clipboard." });
  };

  const handleDelete = (messageId: string) => {
    if (!mailbox?.id) return;
    deleteMessage.mutate(
      { id: mailbox.id, messageId },
      {
        onSuccess: () => {
          queryClient.setQueryData(
            getGetMessagesQueryKey(mailbox.id),
            (old: unknown) =>
              Array.isArray(old) ? old.filter((m: { id: string }) => m.id !== messageId) : old
          );
          if (selectedMessageId === messageId) setSelectedMessageId(null);
          toast({ title: "Deleted", description: "Message removed." });
        },
      }
    );
  };

  const filtered = messages.filter((m) => {
    if (filter === "Unread") return !m.seen;
    if (filter === "Read") return m.seen;
    return true;
  });

  const unreadCount = messages.filter((m) => !m.seen).length;

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#F0F0E4]">

      {/* ── LEFT PANEL ──────────────────────────────────────────── */}
      <div className="md:w-[300px] lg:w-[340px] md:flex-shrink-0 md:h-full md:overflow-y-auto flex-shrink-0">
        <div className="p-4 space-y-3">

          {/* Email address card */}
          <div className="relative rounded-3xl overflow-hidden" style={{
            background: "linear-gradient(135deg, #1A1A1A 0%, #2D3A1A 50%, #1A2A0A 100%)",
          }}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7AB840, transparent)" }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7AB840, transparent)" }} />

            <div className="relative p-5">
              {/* Top row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#7AB840] rounded-lg flex items-center justify-center">
                    <Mail className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-white/70 text-xs font-medium tracking-wide uppercase">Your Address</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7AB840] shadow-[0_0_6px_#7AB840]" />
                  <span className="text-[#7AB840] text-[10px] font-semibold">ACTIVE</span>
                </div>
              </div>

              {/* Email address */}
              <button
                onClick={copyToClipboard}
                className="w-full text-left mb-4 group"
                data-testid="button-copy"
              >
                <div className="text-white font-semibold text-sm break-all leading-relaxed group-hover:text-[#7AB840] transition-colors">
                  {mailbox?.address ?? "Loading..."}
                </div>
              </button>

              {/* Copy + Change row */}
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    copied
                      ? "bg-[#7AB840] text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => navigate("/create")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                  data-testid="button-change"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Change
                </button>
              </div>

              {/* Provider badge */}
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: providerMeta.bg, color: providerMeta.text }}
                >
                  {providerMeta.name}
                </span>
                <span className="text-white/30 text-[10px]">via secure proxy</span>
              </div>
            </div>
          </div>

          {/* Countdown card */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-3.5 w-3.5 text-[#9A9A8A]" />
              <span className="text-xs text-[#9A9A8A] font-medium">Expires in</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[
                { val: timeLeft.hrs,  label: "HRS"  },
                { val: timeLeft.mins, label: "MIN" },
                { val: timeLeft.secs, label: "SEC" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-2xl font-light text-[#D0D0C0] mb-3">:</span>}
                  <div className="flex-1 text-center">
                    <div
                      className="w-16 h-14 rounded-2xl flex items-center justify-center mb-1.5"
                      style={{ background: "linear-gradient(135deg, #F8F8F0, #EFEFDF)" }}
                    >
                      <span className="text-2xl font-bold text-[#1A1A1A] tabular-nums">{pad(item.val)}</span>
                    </div>
                    <div className="text-[9px] text-[#ABABAB] uppercase tracking-widest font-semibold">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-1.5 mb-2">
                <Inbox className="h-3.5 w-3.5 text-[#7AB840]" />
                <span className="text-[10px] text-[#9A9A8A] font-medium uppercase tracking-wide">Total</span>
              </div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{messages.length}</div>
              <div className="text-[10px] text-[#ABABAB] mt-0.5">messages</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-[#7AB840]" />
                <span className="text-[10px] text-[#9A9A8A] font-medium uppercase tracking-wide">Unread</span>
              </div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{unreadCount}</div>
              <div className="text-[10px] text-[#ABABAB] mt-0.5">new emails</div>
            </div>
          </div>

          {/* Privacy badge */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#EDFAD3] rounded-2xl">
            <ShieldCheck className="h-4 w-4 text-[#4A7A10] flex-shrink-0" />
            <span className="text-xs text-[#4A7A10] font-medium">No tracking · Auto-deletes in 24h</span>
          </div>

        </div>
      </div>

      {/* ── RIGHT: Inbox ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white md:h-full overflow-hidden rounded-t-[32px] md:rounded-none shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:shadow-none">

        {/* Inbox header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Inbox</h2>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-[#7AB840] text-white rounded-full px-2.5 py-0.5 font-bold shadow-[0_2px_8px_rgba(122,184,64,0.35)] anim-pop">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching || !mailbox}
              className="w-8 h-8 rounded-full bg-[#F4F4EA] flex items-center justify-center hover:bg-[#EAEADC] disabled:opacity-40 transition-colors"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#6A6A6A] ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 p-1 bg-[#F4F4EA] rounded-2xl">
            {(["All", "Unread", "Read"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  filter === tab
                    ? "bg-white text-[#1A1A1A] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                    : "text-[#8A8A7A] hover:text-[#4A4A4A]"
                }`}
              >
                {tab}
                {tab === "Unread" && unreadCount > 0 && (
                  <span className="ml-1 text-[#7AB840]">({unreadCount})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Message list — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-6">
          {isLoadingMessages ? (
            <div className="space-y-3 pt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAFAF6]">
                  <Skeleton className="w-11 h-11 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center anim-fade">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-[#F4F4EA] rounded-3xl flex items-center justify-center">
                  <Mail className="h-9 w-9 text-[#C8C8B0]" strokeWidth={1.2} />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#7AB840] rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">0</span>
                </div>
              </div>
              <p className="font-bold text-[#1A1A1A] text-base mb-2">No messages yet</p>
              <p className="text-sm text-[#9A9A8A] max-w-[190px] leading-relaxed">
                Share your address and emails will appear here automatically.
              </p>
              <button
                onClick={copyToClipboard}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-full hover:bg-[#2A2A2A] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy address
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {filtered.map((msg, i) => {
                const senderText = msg.from.name || msg.from.address;
                const initial = senderText.charAt(0).toUpperCase();
                const [gradFrom, gradTo] = avatarColor(senderText);
                return (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    data-testid={`message-item-${msg.id}`}
                    className={`w-full flex items-start gap-3.5 p-4 text-left rounded-2xl transition-all duration-200 anim-slide-up group ${
                      !msg.seen
                        ? "bg-[#F8FAF4] hover:bg-[#F2F7EC]"
                        : "bg-[#FAFAF8] hover:bg-[#F5F5F0]"
                    }`}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                    >
                      {initial}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <span className={`text-sm truncate ${!msg.seen ? "font-bold text-[#1A1A1A]" : "font-semibold text-[#3A3A3A]"}`}>
                          {senderText}
                        </span>
                        <span className="text-[10px] text-[#BCBCAC] flex-shrink-0 mt-0.5">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                        </span>
                      </div>
                      <div className={`text-sm truncate mb-1 ${!msg.seen ? "font-semibold text-[#2A2A2A]" : "font-medium text-[#5A5A5A]"}`}>
                        {msg.subject || "No Subject"}
                      </div>
                      <div className="text-xs text-[#9A9A8A] truncate leading-relaxed">{msg.intro}</div>
                    </div>

                    {/* Unread dot */}
                    {!msg.seen && (
                      <div className="w-2 h-2 bg-[#7AB840] rounded-full flex-shrink-0 mt-2 shadow-[0_0_6px_rgba(122,184,64,0.6)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Message detail sheet ─────────────────────────────────── */}
      <Sheet open={!!selectedMessageId} onOpenChange={(open) => !open && setSelectedMessageId(null)}>
        <SheetContent
          side="bottom"
          className="h-[92vh] md:h-[88vh] rounded-t-[28px] p-0 border-0 bg-white focus-visible:outline-none"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
            <div className="w-12 h-1 bg-[#E4E4D8] rounded-full" />
          </div>

          {isLoadingMessage ? (
            <div className="p-5 space-y-4 pt-5">
              <Skeleton className="h-6 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <div className="space-y-2.5 pt-4">
                {[1, 0.9, 0.7, 0.85, 0.6].map((w, i) => (
                  <Skeleton key={i} className="h-3 rounded-lg" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            </div>
          ) : selectedMessage ? (
            <div className="flex flex-col h-[calc(92vh-28px)] md:h-[calc(88vh-28px)]">
              {/* Sheet header */}
              <div className="px-4 pt-3 pb-4 border-b border-[#F0F0E8] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setSelectedMessageId(null)}
                    className="w-9 h-9 flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] flex-shrink-0 rounded-xl hover:bg-[#F4F4E8] transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="flex-1 text-base font-bold text-[#1A1A1A] leading-snug line-clamp-2">
                    {selectedMessage.subject || "No Subject"}
                  </h2>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    data-testid={`button-delete-${selectedMessage.id}`}
                    className="w-9 h-9 flex items-center justify-center text-[#EA4335] hover:bg-red-50 rounded-xl flex-shrink-0 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Sender info */}
                <div className="flex items-center gap-3 px-1">
                  {(() => {
                    const name = selectedMessage.from.name || selectedMessage.from.address;
                    const [gFrom, gTo] = avatarColor(name);
                    return (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A1A1A] truncate">
                      {selectedMessage.from.name || selectedMessage.from.address}
                    </div>
                    {selectedMessage.from.name && (
                      <div className="text-xs text-[#9A9A8A] truncate">{selectedMessage.from.address}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-[#BCBCAC] flex-shrink-0 text-right">
                    <div>{new Date(selectedMessage.createdAt).toLocaleDateString()}</div>
                    <div>{new Date(selectedMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-auto">
                {selectedMessage.html ? (
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><base target="_blank"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:16px;color:#1A1A1A;font-size:14px;line-height:1.6;word-break:break-word}img{max-width:100%;height:auto}a{color:#4A7A10}a:hover{opacity:0.8}button,a[href]{cursor:pointer}</style></head><body>${selectedMessage.html}</body></html>`}
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    title="Email content"
                    className="w-full border-0 block"
                    style={{ height: "100%", minHeight: "400px" }}
                  />
                ) : (
                  <div className="p-5">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[#3A3A3A] leading-relaxed">
                      {selectedMessage.text || "No content"}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
