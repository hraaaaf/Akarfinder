// SITE-SOURCE-BADGES-1 — Source Attribution component.
// Shows the source label + policy reason under the badge row, in a compact single line.
// Wording doctrine: never "vérifié / officiel". See MARKET_SEARCH_POSITIONING.md.

type Variant = "light" | "dark";

type SourceAttributionProps = {
  sourceAttributionLabel?: string;
  displayPolicyReason?: string;
  sourceName?: string;
  variant?: Variant;
  className?: string;
};

export function SourceAttribution({
  sourceAttributionLabel,
  displayPolicyReason,
  sourceName,
  variant = "light",
  className = "",
}: SourceAttributionProps) {
  const label = sourceAttributionLabel ?? (sourceName ? `Source indexée` : null);
  if (!label && !displayPolicyReason) return null;

  const textCls =
    variant === "dark" ? "text-white/38" : "text-gray-400";

  return (
    <p className={`mt-1.5 line-clamp-1 text-[10.5px] leading-4 ${textCls} ${className}`}>
      {label}
      {label && displayPolicyReason ? " · " : ""}
      {displayPolicyReason}
    </p>
  );
}
