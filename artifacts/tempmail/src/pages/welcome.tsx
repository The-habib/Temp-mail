import { useGetDomains, useCreateMailbox } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Clock, Zap, Mail, EyeOff } from "lucide-react";

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

export default function WelcomePage() {
  const { setMailbox } = useMailboxStore();
  const { data: domains, isLoading: isLoadingDomains } = useGetDomains();
  const createMailbox = useCreateMailbox();
  const { toast } = useToast();

  const handleGetStarted = () => {
    if (!domains || domains.length === 0) return;
    const domain = domains[0].domain;
    const username = generateRandomString(8);
    const address = `${username}@${domain}`;
    const password = generateRandomString(12);

    createMailbox.mutate(
      { data: { address, password } },
      {
        onSuccess: (data) => setMailbox(data),
        onError: () =>
          toast({
            title: "Error",
            description: "Failed to create mailbox. Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  const isPending = createMailbox.isPending || isLoadingDomains;

  const features = [
    { icon: Zap,        label: "Instant",    desc: "Ready in seconds"     },
    { icon: EyeOff,     label: "Anonymous",  desc: "No tracking ever"     },
    { icon: ShieldCheck,label: "Secure",     desc: "Spam protected"       },
    { icon: Clock,      label: "24h Life",   desc: "Auto-deletes safely"  },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto">

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-10 pb-6 text-center">

        {/* Logo */}
        <div className="mb-5 anim-slide-up">
          <img
            src="/logo.png"
            alt="TempMail logo — free temporary disposable email"
            width={130}
            height={130}
            className="drop-shadow-xl"
          />
        </div>

        {/* Headline — keyword-rich for SEO */}
        <div className="mb-6 anim-slide-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[2.4rem] md:text-5xl font-extrabold leading-tight tracking-tight text-[#1A1A1A] mb-3">
            Temp <span className="text-[#7AB840]">Mail</span>
          </h1>
          <p className="text-[#5A5A5A] text-base md:text-lg leading-relaxed max-w-xs mx-auto">
            Free disposable temporary email address.<br />
            <strong className="text-[#1A1A1A] font-semibold">No sign up. No spam. Auto-deletes in 24h.</strong>
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs mb-7 anim-slide-up" style={{ animationDelay: "120ms" }}>
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 bg-[#EDFAD3] rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-[#4A7A10]" strokeWidth={2} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-[#1A1A1A] leading-none mb-0.5">{label}</div>
                <div className="text-[10px] text-[#8A8A8A] leading-none">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div className="w-full max-w-xs space-y-3 anim-slide-up" style={{ animationDelay: "180ms" }}>
          <button
            onClick={handleGetStarted}
            disabled={isPending}
            className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-bold text-base disabled:opacity-60 hover:bg-[#2A2A2A] active:scale-[0.98] transition-all"
            data-testid="button-get-started"
          >
            <span>{isPending ? "Setting up…" : "Get Free Email"}</span>
            <div className="w-9 h-9 bg-[#7AB840] rounded-full flex items-center justify-center flex-shrink-0">
              {isPending ? (
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
          <p className="text-center text-[#9A9A9A] text-xs">No sign up needed · 100% free</p>
        </div>
      </div>

      {/* ── SEO content — visible to Google, useful to users ── */}
      <div className="px-6 pb-10 max-w-lg mx-auto w-full">

        {/* What is section */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-2">What is TempMail?</h2>
          <p className="text-sm text-[#5A5A5A] leading-relaxed">
            TempMail is a <strong>free temporary email address</strong> service that lets you receive emails
            without exposing your real inbox. Use it to sign up for websites, verify accounts, or avoid spam —
            then let it auto-delete after 24 hours.
          </p>
        </section>

        {/* Use cases */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Why use a disposable email?</h2>
          <ul className="space-y-2">
            {[
              ["Stop spam",         "Register on sites without getting spammed forever."],
              ["Stay anonymous",    "Never reveal your real email to unknown services."],
              ["Quick verifications", "Confirm accounts instantly without creating a new inbox."],
              ["Test emails",       "Perfect for developers testing email flows."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-2.5 text-sm">
                <span className="text-[#7AB840] font-bold mt-0.5">✓</span>
                <span className="text-[#5A5A5A]"><strong className="text-[#1A1A1A]">{title}</strong> — {body}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ accordion-style (static for SEO) */}
        <section>
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Frequently asked questions</h2>
          <div className="space-y-3">
            {[
              ["Is TempMail free?",              "Yes, completely free. No credit card, no registration, no limits."],
              ["How long does the email last?",  "24 hours. After that, the address and all messages are permanently deleted."],
              ["Can I receive real emails?",     "Yes — HTML emails, images, links, and attachments all work."],
              ["Is it safe?",                    "Your real identity is never exposed. No tracking, no logging."],
            ].map(([q, a]) => (
              <div key={String(q)} className="bg-white rounded-2xl px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                <div className="text-xs font-bold text-[#1A1A1A] mb-1">{q}</div>
                <div className="text-xs text-[#6A6A6A] leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#ABABAB]">
          <Mail className="h-3 w-3" />
          <span>TempMail · Free temporary email · No spam · Private</span>
        </div>
      </div>
    </div>
  );
}
