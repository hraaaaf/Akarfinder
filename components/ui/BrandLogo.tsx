import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from "./brand-mark-path";

/**
 * BrandLogo — composant centralisé de la marque AkarFinder.
 * Référence unique : brand board officielle.
 *
 * variant:
 *   - "default"     logo sans tagline (header, navigation, app)
 *   - "official"    logo avec baseline "Intelligence immobilière au Maroc"
 *   - "icon"        monogramme AF seul (favicon, loader, badges)
 *   - "dark"        version fond sombre / texte clair
 *   - "monochrome"  noir (fond clair) ou blanc (fond sombre)
 *
 * showTagline: force l'affichage/masquage de la baseline (override du variant).
 * size: "sm" | "md" | "lg"
 *
 * Règle de marque : le symbole reste TOUJOURS bronze (sauf monochrome).
 * La baseline n'apparaît jamais en petit format (size="sm").
 */

export type BrandLogoVariant = "default" | "official" | "icon" | "dark" | "monochrome";
export type BrandLogoSize = "sm" | "md" | "lg";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  size?: BrandLogoSize;
  className?: string;
  /** true si posé sur un fond sombre (utile pour variant monochrome/par défaut) */
  onDark?: boolean;
};

const MARK_SIZES: Record<BrandLogoSize, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
};

const WORD_SIZES: Record<BrandLogoSize, string> = {
  sm: "text-[1.24rem] sm:text-[1.4rem]",
  md: "text-[1.5rem] sm:text-[1.7rem]",
  lg: "text-[2.1rem] sm:text-[2.4rem]",
};

const TAGLINE_SIZES: Record<BrandLogoSize, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-[13px]",
};

function BrandMark({ colorClass, sizeClass }: { colorClass: string; sizeClass: string }) {
  return (
    <svg
      viewBox={BRAND_MARK_VIEWBOX}
      role="img"
      aria-label="AkarFinder"
      className={`${sizeClass} w-auto shrink-0 ${colorClass}`}
    >
      <path d={BRAND_MARK_PATH} fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({
  variant = "default",
  showTagline,
  size = "md",
  className = "",
  onDark,
}: BrandLogoProps) {
  const isDark = variant === "dark" || onDark === true;
  const isMono = variant === "monochrome";

  // Symbole : bronze par défaut ; bronze clair sur fond sombre ; mono = couleur du texte.
  const markColor = isMono
    ? isDark
      ? "text-white"
      : "text-mono"
    : isDark
      ? "text-bronze-500"
      : "text-bronze-700";

  // Wordmark
  const wordColor = isMono
    ? isDark
      ? "text-white"
      : "text-mono"
    : isDark
      ? "text-white"
      : "text-deepblue";

  const taglineColor = isMono
    ? isDark
      ? "text-white/70"
      : "text-mono/60"
    : isDark
      ? "text-bronze-400"
      : "text-bronze-700/80";

  // Icône seule
  if (variant === "icon") {
    return (
      <span className={`inline-flex ${className}`} aria-label="AkarFinder">
        <BrandMark colorClass={markColor} sizeClass={MARK_SIZES[size]} />
      </span>
    );
  }

  // Baseline : jamais en "sm". Par défaut visible uniquement en "official".
  const taglineDefault = variant === "official";
  const wantTagline = (showTagline ?? taglineDefault) && size !== "sm";

  return (
    <span className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${className}`}>
      <BrandMark colorClass={markColor} sizeClass={MARK_SIZES[size]} />
      <span className="min-w-0">
        <span
          className={`block truncate font-extrabold leading-none tracking-[-0.045em] ${WORD_SIZES[size]} ${wordColor}`}
        >
          AkarFinder
        </span>
        {wantTagline ? (
          <span
            className={`mt-1 block font-semibold uppercase tracking-[0.13em] ${TAGLINE_SIZES[size]} ${taglineColor}`}
          >
            Intelligence immobilière au Maroc
          </span>
        ) : null}
      </span>
    </span>
  );
}
