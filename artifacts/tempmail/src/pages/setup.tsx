import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink,
  Globe, Key, Wifi, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface DnsRecord {
  type: string;
  host: string;
  value: string;
}

interface SetupResult {
  domain: string;
  domainState: string;
  dnsRecords: {
    mx: DnsRecord[];
    spf: DnsRecord | null;
  };
}

function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2 bg-[#F0F0E4] rounded-xl px-3 py-2.5 border border-[#E0E0D0]">
      <div className="flex-1 min-w-0">
        {label && <p className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-widest mb-0.5">{label}</p>}
        <p className="font-mono text-xs text-[#1A1A1A] break-all">{value}</p>
      </div>
      <button
        onClick={copy}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E0E0D0] transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[#7AB840]" /> : <Copy className="h-3.5 w-3.5 text-[#7A7A7A]" />}
      </button>
    </div>
  );
}

function StepDot({ n, current, done }: { n: number; current: Step; done: boolean }) {
  const active = n === current;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done ? "bg-[#7AB840] text-white" : active ? "bg-[#1A1A1A] text-white" : "bg-[#E0E0D0] text-[#9A9A9A]"
    }`}>
      {done ? <Check className="h-3.5 w-3.5" /> : n}
    </div>
  );
}

export default function SetupPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [domain, setDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);

  const handleConfigure = async () => {
    if (!apiKey.trim() || !domain.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), domain: domain.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; domain?: string; domainState?: string; dnsRecords?: SetupResult["dnsRecords"] };
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setResult({ domain: data.domain!, domainState: data.domainState!, dnsRecords: data.dnsRecords! });
        setStep(4);
      }
    } catch {
      setError("Network error — make sure the app is running and try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, label: "Create account" },
    { n: 2, label: "Add domain" },
    { n: 3, label: "Connect" },
    { n: 4, label: "DNS records" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto pb-10">
      {/* Header */}
      <div className="px-5 pt-5 flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] rounded-full hover:bg-[#E8E8D8] -ml-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Domain Setup</h1>
          <p className="text-xs text-[#7A7A7A]">Receive real emails on your domain</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="mx-5 mb-6 bg-white rounded-2xl px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <StepDot n={s.n} current={step} done={s.n < step} />
                <span className={`text-[9px] font-semibold uppercase tracking-wide ${s.n === step ? "text-[#1A1A1A]" : "text-[#ABABAB]"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-6 mx-1 rounded mb-4 ${s.n < step ? "bg-[#7AB840]" : "bg-[#E0E0D0]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Sign up */}
      {step === 1 && (
        <div className="px-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 bg-[#EDFAD3] rounded-2xl flex items-center justify-center mb-3">
              <Globe className="h-5 w-5 text-[#4A7A10]" />
            </div>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-1">Create a free Mailgun account</h2>
            <p className="text-sm text-[#6A6A6A] mb-4 leading-relaxed">
              Mailgun is the service that receives emails on your domain and sends them to your inbox here. 
              The free plan gives you <strong>1,000 emails/month</strong> — more than enough.
            </p>
            <a
              href="https://signup.mailgun.com/new/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-[#1A1A1A] text-white rounded-full py-3.5 px-5 font-semibold text-sm hover:bg-[#2A2A2A] transition-colors"
            >
              <span>Open Mailgun Sign Up</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="bg-[#FFFBEB] rounded-2xl px-4 py-3 border border-[#FDE68A]">
            <p className="text-xs text-[#92400E] leading-relaxed">
              <strong>Already have a Mailgun account?</strong> Skip this — just press Continue.
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-semibold text-base hover:bg-[#2A2A2A] transition-colors"
          >
            <span>Continue</span>
            <div className="w-9 h-9 bg-[#7AB840] rounded-full flex items-center justify-center">
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Step 2: Add domain */}
      {step === 2 && (
        <div className="px-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 bg-[#DBEAFE] rounded-2xl flex items-center justify-center mb-3">
              <Globe className="h-5 w-5 text-[#1D4ED8]" />
            </div>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-1">Add your domain in Mailgun</h2>
            <p className="text-sm text-[#6A6A6A] mb-4 leading-relaxed">
              In Mailgun, go to <strong>Sending → Domains → Add New Domain</strong>.
              Use a subdomain like <code className="bg-[#F0F0E8] px-1 rounded text-xs">mail.yourdomain.com</code> for best results.
            </p>
            <a
              href="https://app.mailgun.com/mg/sending/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full bg-[#EDF3FB] text-[#1D4ED8] rounded-full py-3 px-5 font-semibold text-sm hover:bg-[#DBEAFE] transition-colors justify-center mb-2"
            >
              Open Mailgun Domains
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <label className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest block mb-2">
              Your domain
            </label>
            <input
              type="text"
              placeholder="mail.yourdomain.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#F4F4E4] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#BCBCBC] outline-none border-2 border-transparent focus:border-[#7AB840] transition-colors font-mono"
            />
            <p className="text-xs text-[#9A9A9A] mt-1.5">Exactly as you typed it in Mailgun (e.g. mail.yourdomain.com)</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-white border-2 border-[#E8E8D8] text-[#5A5A5A] rounded-full py-3.5 font-semibold text-sm hover:bg-[#F0F0E8] transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!domain.trim()}
              className="flex-1 bg-[#1A1A1A] text-white rounded-full py-3.5 font-semibold text-sm disabled:opacity-40 hover:bg-[#2A2A2A] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Paste API key and connect */}
      {step === 3 && (
        <div className="px-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 bg-[#F3E8FF] rounded-2xl flex items-center justify-center mb-3">
              <Key className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-1">Paste your Mailgun API key</h2>
            <p className="text-sm text-[#6A6A6A] mb-3 leading-relaxed">
              In Mailgun go to <strong>Settings → API Keys</strong> and copy your <strong>Private API key</strong>.
            </p>
            <a
              href="https://app.mailgun.com/settings/api_security"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full bg-[#F3E8FF] text-[#7C3AED] rounded-full py-3 px-5 font-semibold text-sm hover:bg-[#EDE9FE] transition-colors justify-center"
            >
              Open Mailgun API Keys
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <label className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-widest block mb-2">
              Private API Key
            </label>
            <input
              type="password"
              placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#F4F4E4] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#BCBCBC] outline-none border-2 border-transparent focus:border-[#7C3AED] transition-colors font-mono"
            />
          </div>

          {error && (
            <div className="bg-[#FFF0F0] rounded-2xl px-4 py-3 flex items-start gap-2.5 border border-[#FECACA]">
              <AlertCircle className="h-4 w-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#DC2626]">{error}</p>
            </div>
          )}

          <div className="bg-[#F4F4E4] rounded-2xl px-4 py-3 border border-[#E8E8D8]">
            <p className="text-xs text-[#6A6A6A]">
              <strong>Configuring for:</strong> <code className="bg-white px-1.5 py-0.5 rounded font-mono">{domain}</code>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 bg-white border-2 border-[#E8E8D8] text-[#5A5A5A] rounded-full py-3.5 font-semibold text-sm hover:bg-[#F0F0E8] transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={handleConfigure}
              disabled={!apiKey.trim() || loading}
              className="flex-1 bg-[#1A1A1A] text-white rounded-full py-3.5 font-semibold text-sm disabled:opacity-40 hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Configuring…
                </>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: DNS records */}
      {step === 4 && result && (
        <div className="px-5 space-y-4">
          <div className="bg-[#EDFAD3] rounded-2xl p-4 flex items-start gap-3 border border-[#B8E88A]">
            <CheckCircle2 className="h-5 w-5 text-[#4A7A10] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#2A5A00] mb-0.5">Connected to Mailgun!</p>
              <p className="text-xs text-[#4A7A10]">Now add these DNS records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-[#7C3AED]" />
              <p className="text-sm font-bold text-[#1A1A1A]">MX Records — Email Receiving</p>
            </div>
            <p className="text-xs text-[#6A6A6A] mb-3">Add these in your domain registrar under DNS settings. Copy each value exactly.</p>
            <div className="space-y-2">
              {result.dnsRecords.mx.length > 0 ? (
                result.dnsRecords.mx.map((r, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex gap-2 text-xs">
                      <span className="bg-[#E8E8F8] text-[#4A4A9A] px-2 py-0.5 rounded font-bold">{r.type}</span>
                      <span className="text-[#6A6A6A]">Host: <code className="font-mono">{r.host || "@"}</code></span>
                    </div>
                    <CopyField value={r.value} label="Value" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9A9A9A]">MX records not returned — check your Mailgun dashboard for the exact values.</p>
              )}
            </div>
          </div>

          {result.dnsRecords.spf && (
            <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
              <p className="text-sm font-bold text-[#1A1A1A] mb-2">SPF Record (optional but recommended)</p>
              <div className="flex gap-2 text-xs mb-2">
                <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded font-bold">TXT</span>
                <span className="text-[#6A6A6A]">Host: <code className="font-mono">{result.dnsRecords.spf.host || "@"}</code></span>
              </div>
              <CopyField value={result.dnsRecords.spf.value} label="Value" />
            </div>
          )}

          <div className="bg-[#FFFBEB] rounded-2xl px-4 py-3 border border-[#FDE68A]">
            <p className="text-xs text-[#92400E] leading-relaxed">
              <strong>DNS changes take 5–30 minutes to propagate.</strong> Once done, emails sent to any address at <code className="font-mono bg-white px-1 rounded">{result.domain}</code> will appear in your inbox here.
            </p>
          </div>

          <button
            onClick={() => navigate("/create")}
            className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-semibold text-base hover:bg-[#2A2A2A] transition-colors"
          >
            <span>Create my first custom inbox</span>
            <div className="w-9 h-9 bg-[#7AB840] rounded-full flex items-center justify-center">
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
