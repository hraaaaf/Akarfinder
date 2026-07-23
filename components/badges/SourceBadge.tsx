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
    darkCls: "border-white/15 bg-white/[0.07] text-white/60",
  },
  market_signal: {
    label: "Signal marché",
    lightCls: "border-sky-200 bg-sky-50 text-sky-700",
    darkCls: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  },
  external_web_result: {
    label: "Résultat web externe",
    lightCls: "border-slate-300 bg-slate-50 text-slate-700",
    darkCls: "border-white/20 bg-white/[0.08] text-white/80",
  },
  social_signal: {
    label: "Signal social",
    lightCls: "border-blue-100 bg-blue-50 text-blue-700",
    darkCls: "border-blue-400/30 bg-blue-400/12 text-blue-300",
  },
  promoter_site: {
    label: "Site promoteur",
    lightCls: "border-blue-200 bg-blue-50 text-blue-700",
    darkCls: "border-bronze-500/30 bg-bronze-500/10 text-bronze-300",
  },
  institutional_source: {
    label: "Source institutionnelle",
    lightCls: "border-teal-200 bg-teal-50 text-teal-700",
    darkCls: "border-teal-400/30 bg-teal-400/10 text-teal-200",
  },
  sensitive_source: {
    label: "Source sensible",
    lightCls: "border-rose-200 bg-rose-50 text-rose-700",
    darkCls: "border-rose-400/30 bg-rose-400/12 text-rose-300",
  },
};

export function deriveBadge(
  badge?: string,
  sourceAccessLevel?: string,
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
