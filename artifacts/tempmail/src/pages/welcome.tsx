import { useGetDomains, useCreateMailbox } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

type Props = {
  onMailboxCreated: (mailbox: { id: string; address: string; token: string; createdAt: string }) => void;
};

export default function WelcomePage({ onMailboxCreated }: Props) {
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
        onSuccess: (data) => {
          onMailboxCreated(data);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create mailbox. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isPending = createMailbox.isPending || isLoadingDomains;

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] px-6 pt-10 pb-10 overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 320 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-72 h-auto">
          <circle cx="160" cy="168" r="118" fill="#1A1A1A" />
          <rect x="88" y="62" width="144" height="108" rx="8" fill="white" />
          <rect x="104" y="85" width="82" height="5" rx="2.5" fill="#EBEBEB" />
          <rect x="104" y="98" width="112" height="5" rx="2.5" fill="#EBEBEB" />
          <rect x="104" y="111" width="66" height="5" rx="2.5" fill="#EBEBEB" />
          <rect x="52" y="132" width="216" height="148" rx="14" fill="#1E1E1E" />
          <polygon points="52,132 160,208 268,132" fill="#7AB840" />
          <polygon points="52,280 112,214 160,242 208,214 268,280" fill="#252525" />
          <g transform="translate(248,40) rotate(-20)">
            <polygon points="0,0 34,12 0,24" fill="#7AB840" />
            <line x1="0" y1="12" x2="22" y2="12" stroke="#5A8A28" strokeWidth="1.5" />
          </g>
          <g transform="translate(20,98) rotate(25)">
            <polygon points="0,0 22,8 0,16" fill="#7AB840" opacity="0.7" />
          </g>
          <circle cx="28" cy="152" r="8" fill="#7AB840" opacity="0.9" />
          <circle cx="282" cy="212" r="5" fill="#7AB840" opacity="0.6" />
          <circle cx="55" cy="248" r="5" fill="#F5C040" opacity="0.9" />
          <circle cx="284" cy="128" r="10" fill="#7AB840" opacity="0.3" />
          <circle cx="45" cy="185" r="3" fill="#7AB840" opacity="0.5" />
          <circle cx="272" cy="168" r="4" fill="#B8D870" opacity="0.6" />
        </svg>
      </div>

      <div className="mb-8">
        <h1 className="text-[2.6rem] font-bold leading-tight mb-3 text-[#1A1A1A]">
          Temp <span className="text-[#7AB840]">Mail</span>
        </h1>
        <p className="text-[#7A7A7A] text-base leading-relaxed">
          Your temporary email privacy, made simple.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGetStarted}
          disabled={isPending}
          className="w-full bg-[#1A1A1A] text-white rounded-full py-4 px-6 flex items-center justify-between font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-transform"
          data-testid="button-get-started"
        >
          <span>{isPending ? "Setting up..." : "Get Started"}</span>
          <div className="w-9 h-9 bg-[#7AB840] rounded-full flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
        <p className="text-center text-[#9A9A9A] text-sm">No sign up needed</p>
      </div>
    </div>
  );
}
