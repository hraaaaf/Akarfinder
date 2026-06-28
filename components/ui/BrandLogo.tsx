"use client";

import { useId } from "react";

export type BrandLogoVariant = "default" | "official" | "icon" | "dark" | "monochrome";
export type BrandLogoSize = "sm" | "md" | "lg";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  size?: BrandLogoSize;
  className?: string;
  onDark?: boolean;
};

// LOGO-REFINE-1 — proportions allégées (mark un peu moins massif).
const MARK_H: Record<BrandLogoSize, number> = { sm: 24, md: 33, lg: 47 };
const TEXT_H: Record<BrandLogoSize, number> = { sm: 15, md: 21, lg: 31 };

// LOGO-REFINE-1 — monogramme AF redessiné en géométrie nette (ciselé, premium,
// favicon-safe). Même idée : ligature A+F, contrepoinçon du A = arche marocaine
// (fer à cheval) discrète. viewBox 0 0 120 88 (ratio ~1.36, proche de l'original).
// Composé en masque : zones blanches = matière, zones noires = creux (counter + arche).
const MARK_VIEWBOX = "0 0 120 88";
const MARK_RATIO = 120 / 88;

function AkarMarkGeometry({ fill, maskId }: { fill: string; maskId: string }) {
  return (
    <g>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="88">
        {/* Matière (blanc) */}
        <g fill="#fff">
          {/* Jambe gauche du A (barre oblique, légèrement allégée) */}
          <polygon points="5,84 25,84 53,22 42,22" />
          {/* Apex pointu du A (petit pic au-dessus de la barre F) */}
          <polygon points="42,22 53,22 47.5,6" />
          {/* Montant droit du A + fût du F (vertical) */}
          <rect x="52" y="22" width="19" height="62" />
          {/* Barre haute du F (rejoint l'apex, file à droite) */}
          <rect x="46" y="11" width="68" height="15" />
          {/* Barre médiane : traverse du A + barre médiane du F */}
          <rect x="30" y="41" width="74" height="15" />
        </g>
        {/* Creux (noir) */}
        <g fill="#000">
          {/* Contrepoinçon haut du A (triangle sous l'apex) */}
          <polygon points="47.5,15 53,40 42,40" />
          {/* Arche marocaine (fer à cheval) — pointe + retombées arrondies,
              creusée sous la traverse, entre la jambe gauche et le fût */}
          <path d="M 36 84 L 36 65 Q 36 58 41 56 L 44.5 49 Q 48 56 52 58 Q 53.5 60 53.5 66 L 53.5 84 Z" />
        </g>
      </mask>
      <rect x="0" y="0" width="120" height="88" fill={fill} mask={`url(#${maskId})`} />
    </g>
  );
}

function AkarMark({
  h,
  gradId,
  monochrome,
  onDark,
}: {
  h: number;
  gradId: string;
  monochrome?: boolean;
  onDark?: boolean;
}) {
  const w = Math.round(h * MARK_RATIO);
  const monoColor = onDark ? "#FFFFFF" : "#071B33";

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={w}
      height={h}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {!monochrome && (
        <defs>
          <linearGradient
            id={gradId}
            x1="10"
            y1="0"
            x2="110"
            y2="88"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#C9A24A" />
            <stop offset="22%" stopColor="#E4CB82" />
            <stop offset="48%" stopColor="#BF9030" />
            <stop offset="72%" stopColor="#8B6020" />
            <stop offset="100%" stopColor="#C5A048" />
          </linearGradient>
        </defs>
      )}
      <AkarMarkGeometry fill={monochrome ? monoColor : `url(#${gradId})`} maskId={`${gradId}-mask`} />
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
  const uid = useId().replace(/:/g, "");
  const gradId = `af-bronze-${uid}`;

  const isDark = variant === "dark" || onDark === true;
  const isMonochrome = variant === "monochrome";
  const isIcon = variant === "icon";
  const wantTagline = (showTagline ?? variant === "official") && size !== "sm";

  const markH = MARK_H[size];
  const textH = TEXT_H[size];

  const wordmarkColor = isMonochrome ? "#000000" : isDark ? "#FFFFFF" : "#071B33";
  const taglineColor = isMonochrome ? "#000000" : isDark ? "rgba(255,255,255,0.65)" : "#C2A368";

  if (isIcon) {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        aria-label="AkarFinder"
      >
        <AkarMark h={markH} gradId={gradId} monochrome={isMonochrome} onDark={isDark} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="AkarFinder">
      <AkarMark h={markH} gradId={gradId} monochrome={isMonochrome} onDark={isDark} />

      <span className="flex flex-col leading-none">
        <span
          style={{
            fontSize: textH,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            color: wordmarkColor,
            lineHeight: 1,
            fontFamily: "var(--font-jakarta), sans-serif",
          }}
        >
          Akar<span style={{ fontWeight: 800 }}>Finder</span>
        </span>

        {wantTagline && (
          <span
            style={{
              fontSize: Math.round(textH * 0.48),
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: taglineColor,
              marginTop: 4,
              lineHeight: 1,
              fontFamily: "var(--font-jakarta), sans-serif",
            }}
          >
            Intelligence immobilière au Maroc
          </span>
        )}
      </span>
    </span>
  );
}
