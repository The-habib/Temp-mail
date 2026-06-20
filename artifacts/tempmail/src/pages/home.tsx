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
  Copy, Check, RefreshCw, Edit3, Clock, ChevronRight,
  Trash2, ArrowLeft, Mail,
} from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function avatarColor(text: string) {
  const palette = ["#EA4335","#4285F4","#34A853","#FBBC04","#FF6D00","#9C27B0","#00ACC1","#795548"];
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % palette.length;
  return palette[Math.abs(h)];
}

export default function HomePage() {
  const { mailbox } = useMailboxStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"All" | "Unread" | "Read">("All");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hrs: 23, mins: 59, secs: 59 });
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown timer
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
  } = useGetMessages(mailbox?.id ?? "", {
    query: {
      enabled: !!mailbox?.id,
      refetchInterval: 5000,
      queryKey: getGetMessagesQueryKey(mailbox?.id ?? ""),
    },
  });

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
          toast({ title: "Deleted", description: "Message deleted." });
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
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F4E4]">
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ── Email card section ── */}
        <div className="px-5 pt-6 pb-5 anim-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-semibold text-[#1A1A1A] tracking-tight">Your Temp Email</h1>
            <span className="w-2.5 h-2.5 bg-[#7AB840] rounded-full inline-block shadow-[0_0_6px_#7AB840]" />
          </div>

          {/* Illustration */}
          <div className="flex justify-center mb-5">
            <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-auto">
              <ellipse cx="24"  cy="116" rx="20" ry="34" fill="#7AB840" transform="rotate(-16 24 116)" />
              <ellipse cx="12"  cy="105" rx="13" ry="22" fill="#5A9030" transform="rotate(-32 12 105)" />
              <ellipse cx="196" cy="116" rx="20" ry="34" fill="#7AB840" transform="rotate(16 196 116)" />
              <ellipse cx="208" cy="105" rx="13" ry="22" fill="#5A9030" transform="rotate(32 208 105)" />
              <ellipse cx="110" cy="96"  rx="34" ry="30" fill="#2A2A2A" />
              <circle  cx="110" cy="52"  r="24"          fill="#C8956C" />
              <ellipse cx="110" cy="38"  rx="24" ry="16" fill="#1A1A1A" />
              <circle  cx="110" cy="28"  r="10"          fill="#1A1A1A" />
              <rect x="76" y="88" width="68" height="40" rx="5" fill="#DEDEDE" />
              <rect x="80" y="92" width="60" height="33" rx="3" fill="#F5F5F5" />
              <circle cx="110" cy="108" r="11" fill="#7AB840" />
              <path d="M104 108 L108 113 L116 104" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <g transform="translate(160,22) rotate(-18)">
                <polygon points="0,0 30,11 0,22" fill="#7AB840" />
                <line x1="0" y1="11" x2="20" y2="11" stroke="#4A7A20" strokeWidth="1.5" />
              </g>
              <circle cx="48"  cy="30" r="5" fill="#7AB840" opacity="0.6" />
              <circle cx="174" cy="62" r="4" fill="#F5C040" opacity="0.8" />
              <circle cx="40"  cy="70" r="3" fill="#7AB840" opacity="0.4" />
            </svg>
          </div>

          {/* Email address pill */}
          <div
            className={`rounded-full px-5 py-3.5 flex items-center justify-between mb-5 transition-all duration-300 ${
              copied ? "bg-[#5A9030]" : "bg-[#7AB840]"
            }`}
          >
            {mailbox ? (
              <button
                onClick={copyToClipboard}
                className="font-medium text-sm text-white truncate flex-1 mr-2 text-left"
              >
                {mailbox.address}
              </button>
            ) : (
              <div className="h-4 w-44 bg-white/30 rounded animate-pulse" />
            )}
            <button
              onClick={copyToClipboard}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/35 flex-shrink-0"
              data-testid="button-copy"
            >
              {copied ? (
                <Check className="h-4 w-4 text-white anim-pop" />
              ) : (
                <Copy className="h-4 w-4 text-white" />
              )}
            </button>
          </div>

          {/* Countdown */}
          <p className="text-xs text-[#8A8A7A] mb-3">This email will expire in</p>
          <div className="flex items-start justify-center gap-1 mb-5">
            {[
              { val: timeLeft.hrs,  label: "HRS"  },
              { val: null,          label: ""     },
              { val: timeLeft.mins, label: "MINS" },
              { val: null,          label: ""     },
              { val: timeLeft.secs, label: "SECS" },
            ].map((item, i) => {
              if (item.val === null) {
                return (
                  <div key={i} className="text-3xl font-light text-[#C8C8A8] mt-1 px-0.5 leading-none">
                    :
                  </div>
                );
              }
              return (
                <div key={i} className="flex-1 text-center">
                  <div className="text-4xl font-bold text-[#1A1A1A] tabular-nums leading-none">
                    {pad(item.val)}
                  </div>
                  <div className="text-[10px] text-[#9A9A9A] mt-1.5 uppercase tracking-widest">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refresh + Change */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => refetch()}
              disabled={isFetching || !mailbox}
              className="flex-1 border border-[#DDDDC8] bg-white rounded-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F0] disabled:opacity-50"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/create")}
              className="flex-1 border border-[#DDDDC8] bg-white rounded-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F8F0]"
              data-testid="button-change"
            >
              <Edit3 className="h-4 w-4" />
              Change
            </button>
          </div>

          {/* Auto delete row */}
          <div className="bg-white rounded-2xl px-4 py-4 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#F2F2E4] rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-[#7A7A7A]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1A1A1A]">Auto delete</div>
                <div className="text-xs text-[#9A9A9A]">After 24 hours</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#C8C8C0]" />
          </div>
        </div>

        {/* ── Inbox section ── */}
        <div className="bg-white rounded-t-[28px] px-5 pt-6 pb-32 min-h-[44vh] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">

          {/* Inbox header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Inbox</h2>
              {unreadCount > 0 && (
                <span className="anim-pop text-[11px] bg-[#7AB840] text-white rounded-full px-2 py-0.5 font-semibold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {isFetching && (
              <RefreshCw className="h-3.5 w-3.5 text-[#BCBCCC] animate-spin" />
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5">
            {(["All", "Unread", "Read"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter === tab
                    ? "bg-[#7AB840] text-white shadow-sm"
                    : "bg-[#F2F2E8] text-[#7A7A7A] hover:bg-[#E8E8D8]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Message list */}
          {isLoadingMessages ? (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center anim-fade">
              <div className="w-16 h-16 bg-[#F4F4EA] rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-[#C8C8B8]" strokeWidth={1.4} />
              </div>
              <p className="font-semibold text-[#1A1A1A] mb-1.5">No messages yet</p>
              <p className="text-sm text-[#9A9A9A] max-w-[200px] leading-relaxed">
                Emails sent to your address will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F4EE]">
              {filtered.map((msg, i) => {
                const senderText = msg.from.name || msg.from.address;
                const initial = senderText.charAt(0).toUpperCase();
                const color = avatarColor(senderText);
                return (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    data-testid={`message-item-${msg.id}`}
                    className="w-full flex items-start gap-3 py-4 text-left rounded-xl px-1 hover:bg-[#F8F8F2] anim-slide-up"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-[#1A1A1A] truncate mr-2">
                          {senderText}
                        </span>
                        <span className="text-[11px] text-[#ACACAC] flex-shrink-0">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                        </span>
                      </div>
                      <div className={`text-sm truncate mb-0.5 ${!msg.seen ? "font-semibold text-[#2A2A2A]" : "font-medium text-[#4A4A4A]"}`}>
                        {msg.subject || "No Subject"}
                      </div>
                      <div className="text-xs text-[#9A9A9A] truncate">{msg.intro}</div>
                    </div>
                    {!msg.seen && (
                      <div className="w-2 h-2 bg-[#7AB840] rounded-full flex-shrink-0 mt-2.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Message detail sheet ── */}
      <Sheet open={!!selectedMessageId} onOpenChange={(open) => !open && setSelectedMessageId(null)}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-[24px] p-0 border-0 bg-white focus-visible:outline-none"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#E0E0D8] rounded-full" />
          </div>

          {isLoadingMessage ? (
            <div className="p-5 space-y-4 anim-fade">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
          ) : selectedMessage ? (
            <div className="flex flex-col h-[calc(90vh-28px)] overflow-hidden anim-slide-up">
              {/* Sheet header */}
              <div className="px-5 pt-3 pb-4 border-b border-[#F2F2EE] flex-none">
                <div className="flex items-start gap-2 mb-3">
                  <button
                    onClick={() => setSelectedMessageId(null)}
                    className="w-8 h-8 flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] flex-shrink-0 mt-0.5 rounded-full hover:bg-[#F4F4E4]"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="flex-1 text-base font-bold text-[#1A1A1A] leading-snug pt-1">
                    {selectedMessage.subject || "No Subject"}
                  </h2>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    data-testid={`button-delete-${selectedMessage.id}`}
                    className="w-8 h-8 flex items-center justify-center text-[#EA4335] hover:bg-red-50 rounded-full flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 text-xs pl-10">
                  <div className="flex gap-3">
                    <span className="text-[#ACACAC] w-8 flex-shrink-0">From</span>
                    <span className="text-[#3A3A3A] font-medium break-all">
                      {selectedMessage.from.name
                        ? `${selectedMessage.from.name} <${selectedMessage.from.address}>`
                        : selectedMessage.from.address}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#ACACAC] w-8 flex-shrink-0">Date</span>
                    <span className="text-[#6A6A6A]">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email body — raw, untouched */}
              <div className="flex-1 overflow-auto bg-white">
                {selectedMessage.html ? (
                  <iframe
                    srcDoc={selectedMessage.html}
                    sandbox="allow-same-origin"
                    title="Email content"
                    className="w-full border-0 block"
                    style={{ height: "100%", minHeight: "360px" }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-[#3A3A3A] p-5 leading-relaxed">
                    {selectedMessage.text || "No content"}
                  </pre>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
