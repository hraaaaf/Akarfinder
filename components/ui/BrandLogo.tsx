import Image from "next/image";

/**
 * BrandLogo — logo officiel AkarFinder via les assets PNG de la brand board.
 *
 * variant:
 *   - "default"     logo sans tagline, fond clair
 *   - "dark"        logo sans tagline, fond sombre
 *   - "official"    logo + baseline, fond clair
 *   - "icon"        mark AF seul (favicon, loader, badges)
 *   - "monochrome"  alias de default/dark selon onDark
 *
 * showTagline: force l'affichage de la baseline (override du variant).
 * size: "sm" | "md" | "lg"
 */

export type BrandLogoVariant = "default" | "official" | "icon" | "dark" | "monochrome";
export type BrandLogoSize = "sm" | "md" | "lg";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  size?: BrandLogoSize;
  className?: string;
  /** true si posé sur un fond sombre */
  onDark?: boolean;
};

const LOGO_HEIGHT: Record<BrandLogoSize, number> = {
  sm: 30,
  md: 40,
  lg: 56,
};

export function BrandLogo({
  variant = "default",
  showTagline,
  size = "md",
  className = "",
  onDark,
}: BrandLogoProps) {
  const isDark = variant === "dark" || onDark === true;
  const wantTagline = (showTagline ?? variant === "official") && size !== "sm";
  const h = LOGO_HEIGHT[size];

  // Mark seul — icon variant
  if (variant === "icon") {
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="AkarFinder">
        <Image
          src={isDark ? "/brand/mark-bronze.png" : "/brand/mark-deepblue.png"}
          alt="AkarFinder"
          height={h}
          width={h}
          className="w-auto"
          style={{ height: h }}
          priority={false}
        />
      </span>
    );
  }

  // Sélection du PNG selon variant + tagline
  const src = wantTagline
    ? isDark
      ? "/brand/logo-official-dark.png"
      : "/brand/logo-official.png"
    : isDark
      ? "/brand/logo-default-dark.png"
      : "/brand/logo-default.png";

  // Largeur estimée pour le layout Next.js (le rendu réel suit l'aspect ratio via w-auto)
  const w = Math.round(h * (wantTagline ? 3.6 : 4.8));

  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt="AkarFinder"
        height={h}
        width={w}
        className="w-auto"
        style={{ height: h }}
        priority={false}
      />
    </span>
  );
}
