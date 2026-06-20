import { useGetMessages, getGetMessagesQueryKey } from "@workspace/api-client-react";
import { useMailboxStore } from "@/hooks/use-mailbox-store";

type Msg = { createdAt: string };

function BarChart({ messages }: { messages: Msg[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayJs = new Date().getDay();
  const todayBarIdx = todayJs === 0 ? 6 : todayJs - 1;

  const counts = days.map((_, i) => {
    const jsDay = (i + 1) % 7;
    return messages.filter((m) => new Date(m.createdAt).getDay() === jsDay).length;
  });

  const max = Math.max(...counts, 4);

  return (
    <svg viewBox="0 0 280 116" className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Grid lines */}
      {[0, 0.33, 0.66, 1].map((pct, idx) => (
        <line
          key={idx}
          x1="8" y1={90 - pct * 76} x2="272" y2={90 - pct * 76}
          stroke="#F0F0E4" strokeWidth="1"
        />
      ))}
      {/* Bars */}
      {days.map((day, i) => {
        const barH = Math.max((counts[i] / max) * 76, 8);
        const x = 16 + i * 36;
        const y = 90 - barH;
        const isToday = i === todayBarIdx;
        const hasCount = counts[i] > 0;

        return (
          <g key={day}>
            <rect
              x={x} y={y} width={24} height={barH} rx={5}
              fill={isToday ? "#7AB840" : "#DFE9C8"}
            />
            <text
              x={x + 12} y={106}
              textAnchor="middle"
              fill={isToday ? "#5A5A5A" : "#ACACAC"}
              fontSize="8.5"
              fontFamily="Inter, sans-serif"
              fontWeight={isToday ? "600" : "400"}
            >
              {day}
            </text>
            {isToday && hasCount && (
              <g>
                <circle cx={x + 12} cy={y - 12} r={11} fill="#1A1A1A" />
                <text
                  x={x + 12} y={y - 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="Inter, sans-serif"
                >
                  {counts[i]}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ActivityPage() {
  const { mailbox } = useMailboxStore();

  const { data: messages = [] } = useGetMessages(mailbox?.id ?? "", {
    query: {
      enabled: !!mailbox?.id,
      queryKey: getGetMessagesQueryKey(mailbox?.id ?? ""),
    },
  });

  const today = new Date().toDateString();
  const todayCount = messages.filter((m) => new Date(m.createdAt).toDateString() === today).length;
  const initial = mailbox?.address?.charAt(0).toUpperCase() ?? "T";

  const statCards = [
    {
      label: "Emails received",
      value: messages.length,
      sub: `+${todayCount} today`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2 11 L5.5 6.5 L8 9 L10.5 5.5 L13 11" stroke="#7AB840" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Active emails",
      value: mailbox ? 1 : 0,
      sub: `+${mailbox ? 1 : 0} today`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M1.5 4 L7.5 9 L13.5 4 M1.5 4 H13.5 V12 H1.5 V4Z" stroke="#7AB840" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F4F4E4] overflow-y-auto">
      <div className="px-5 pt-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 anim-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Hi there!</h1>
            <p className="text-sm text-[#7A7A7A]">Here's your email activity</p>
          </div>
          <div className="w-11 h-11 bg-[#7AB840] rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm">
            {initial}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {statCards.map((card, i) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] anim-slide-up"
              style={{ animationDelay: `${50 + i * 60}ms` }}
            >
              <p className="text-xs text-[#9A9A9A] mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{card.value}</p>
              <p className="text-xs text-[#7AB840] mt-1 font-semibold">{card.sub}</p>
              <div className="mt-3 w-8 h-8 bg-[#EBF4D8] rounded-full flex items-center justify-center">
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div
          className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] anim-slide-up"
          style={{ animationDelay: "170ms" }}
        >
          <h2 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Recent Activity</h2>
          <BarChart messages={messages} />
        </div>

        {/* Tips */}
        <div
          className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] anim-slide-up"
          style={{ animationDelay: "230ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="font-semibold text-[#1A1A1A] mb-1 text-sm">Tips</h2>
              <p className="text-xs text-[#7A7A7A] leading-relaxed">
                Use aliases for different signups to stay organized and private.
              </p>
            </div>
            <div className="w-10 h-10 bg-[#FBF5D8] rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a5 5 0 0 1 3.8 8.2L12 12H6l-.8-1.8A5 5 0 0 1 9 2Z" stroke="#E8A820" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M6.5 14h5M7 16h4" stroke="#E8A820" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
