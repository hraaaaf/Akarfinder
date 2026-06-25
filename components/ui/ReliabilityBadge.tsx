type ReliabilityLevel = "high" | "medium" | "low";

type ReliabilityBadgeProps = {
  level: ReliabilityLevel;
  label: string;
};

const tones: Record<ReliabilityLevel, string> = {
  high: "bg-[#dcfce7] text-[#15803d]",
  medium: "bg-[#fef3c7] text-[#92600a]",
  low: "bg-[#fee2e2] text-[#b91c1c]"
};

const dotTones: Record<ReliabilityLevel, string> = {
  high: "bg-[#22c55e]",
  medium: "bg-[#d99409]",
  low: "bg-[#ef4444]"
};

export function ReliabilityBadge({ level, label }: ReliabilityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${tones[level]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTones[level]}`} />
      {label}
    </span>
  );
}
