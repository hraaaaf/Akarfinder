// SITE-SOURCE-BADGES-1 — Updated to accept optional score (V9.5 reliability_info).
// Backward compatible: existing callers (level + label) work unchanged.
// score is orthogonal to SourceBadge — reliability never changes display rights.

type ReliabilityLevel = "high" | "medium" | "low";

type ReliabilityBadgeProps = {
  level: ReliabilityLevel;
  label: string;
  score?: number | null;
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

export function ReliabilityBadge({ level, label, score }: ReliabilityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${tones[level]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTones[level]}`} />
      {label}
      {score != null ? ` ${score}/100` : ""}
    </span>
  );
}

// V9.5 helper — maps reliability_info.label to a ReliabilityLevel for rendering.
export function reliabilityInfoToLevel(label?: string): ReliabilityLevel {
  if (label === "Très fiable") return "high";
  if (label === "Fiable") return "high";
  if (label === "À vérifier") return "medium";
  return "low";
}
