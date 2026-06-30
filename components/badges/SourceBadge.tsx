// SITE-SOURCE-BADGES-1 — Source Badge component.
// Displays the source category badge (public_indexed, premium_partner, market_signal, …).
// Strictly separate from ReliabilityBadge (quality concept — orthogonal to source rights).
// Wording doctrine: never "vérifié / officiel / certifié". See MARKET_SEARCH_POSITIONING.md.

type Variant = "light" | "dark";

type BadgeConfig = {
  label: string;
  lightCls: string;
  darkCls: string;
};

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  premium_partner: {
    label: "Partenaire premium",
    lightCls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    darkCls: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
  },
  authorized_source: {
    label: "Source autorisée",
    lightCls: "border-blue-200 bg-blue-50 text-blue-700",
    darkCls: "border-blue-400/30 bg-blue-400/12 text-blue-300",
  },
  public_indexed: {
    label: "Source publique indexée",
    lightCls: "border-slate-200 bg-slate-100 text-slate-600",
    darkCls: "border-white/15 bg-white/[0.07] text-white/55",
  },
  market_signal: {
    label: "Signal marché",
    lightCls: "border-amber-200 bg-amber-50 text-amber-700",
    darkCls: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  social_signal: {
    label: "Signal social",
    lightCls: "border-purple-200 bg-purple-50 text-purple-700",
    darkCls: "border-purple-400/30 bg-purple-400/12 text-purple-300",
  },
  promoter_site: {
    label: "Site promoteur",
    lightCls: "border-[#dcc89a] bg-[#fdf6e8] text-[#7a5c1e]",
    darkCls: "border-bronze-500/30 bg-bronze-500/10 text-bronze-300",
  },
  institutional_source: {
    label: "Source institutionnelle",
    lightCls: "border-teal-200 bg-teal-50 text-teal-700",
    darkCls: "border-teal-400/30 bg-teal-400/12 text-teal-300",
  },
  sensitive_source: {
    label: "Source sensible",
    lightCls: "border-rose-200 bg-rose-50 text-rose-700",
    darkCls: "border-rose-400/30 bg-rose-400/12 text-rose-300",
  },
};

// Derives a source badge from source_access_level when source_badge is absent (legacy listings).
export function deriveBadge(
  badge?: string,
  sourceAccessLevel?: string
): string | undefined {
  if (badge) return badge;
  if (sourceAccessLevel === "partner_full") return "premium_partner";
  if (sourceAccessLevel === "preview_allowed") return "public_indexed";
  if (sourceAccessLevel === "indexed_only") return "public_indexed";
  return undefined;
}

type SourceBadgeProps = {
  badge?: string;
  sourceAccessLevel?: string;
  variant?: Variant;
  className?: string;
};

export function SourceBadge({
  badge,
  sourceAccessLevel,
  variant = "light",
  className = "",
}: SourceBadgeProps) {
  const resolved = deriveBadge(badge, sourceAccessLevel);
  if (!resolved) return null;

  const config = BADGE_CONFIG[resolved];
  if (!config) return null;

  const cls = variant === "dark" ? config.darkCls : config.lightCls;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${cls} ${className}`}
    >
      {config.label}
    </span>
  );
}
