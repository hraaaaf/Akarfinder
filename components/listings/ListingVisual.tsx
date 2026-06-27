import type { Listing } from "@/lib/listings/types";

/**
 * ListingVisual — premium, fully local SVG placeholder for a listing.
 *
 * Why: the mock listings reused the same few photos, so cards looked duplicated.
 * This generates a distinct architectural scene per listing, deterministically
 * varied by listing id (palette + skyline layout) and by property type / neuf,
 * with no external or copyrighted images.
 */

type ListingVisualProps = {
  listing: Listing;
  className?: string;
  rounded?: boolean;
};

// --- deterministic pseudo-random from the listing id -------------------------
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Palette = {
  sky: [string, string];
  sun: string;
  sunGlow: string;
  structure: string;
  structureAlt: string;
  window: string;
  ground: string;
  accent: string;
};

// Brand-aligned palettes (deep blue + bronze) plus warm Moroccan variants.
const palettes: Palette[] = [
  { sky: ["#071B33", "#13355C"], sun: "#E7C98B", sunGlow: "#C2A368", structure: "#0A2034", structureAlt: "#12365C", window: "#E7C98B", ground: "#081A2E", accent: "#C2A368" },
  { sky: ["#0C2746", "#1D4774"], sun: "#F0D9A8", sunGlow: "#9B7838", structure: "#0B2138", structureAlt: "#16406A", window: "#F2DFB0", ground: "#091E33", accent: "#C2A368" },
  { sky: ["#10324A", "#2E7C8C"], sun: "#FCE3B3", sunGlow: "#9B7838", structure: "#0C2B36", structureAlt: "#1A5566", window: "#FBE6BE", ground: "#0A2630", accent: "#E7C98B" },
  { sky: ["#3A2418", "#8A4B2A"], sun: "#FBE0B0", sunGlow: "#E7C98B", structure: "#2A1A12", structureAlt: "#5C341E", window: "#FBE4BC", ground: "#241510", accent: "#E7C98B" },
  { sky: ["#13243A", "#3E5A7A"], sun: "#EAD7AE", sunGlow: "#C2A368", structure: "#101D2E", structureAlt: "#2C4564", window: "#EAD7AE", ground: "#0D1828", accent: "#C2A368" },
  { sky: ["#0E2E2A", "#1E5E50"], sun: "#F1E2B6", sunGlow: "#9B7838", structure: "#0B221F", structureAlt: "#1A4A40", window: "#F1E2B6", ground: "#0A1E1B", accent: "#E7C98B" },
];

function getMotif(listing: Listing): "appartement" | "villa" | "studio" | "terrain" | "bureau" | "maison" | "neuf" {
  if (listing.transaction_type === "new") return "neuf";
  switch (listing.property_type) {
    case "Villa":
      return "villa";
    case "Studio":
      return "studio";
    case "Terrain":
      return "terrain";
    case "Bureau":
      return "bureau";
    case "Maison":
      return "maison";
    default:
      return "appartement";
  }
}

// Window grid for a building rect. `warm` = couleur dorée pour quelques fenêtres allumées
// (rendu soir premium). Si absent, toutes les fenêtres utilisent `color`.
function windows(rng: () => number, x: number, y: number, w: number, h: number, color: string, key: string, warm?: string) {
  const cols = Math.max(2, Math.round(w / 16));
  const rows = Math.max(2, Math.round(h / 18));
  const gapX = w / cols;
  const gapY = h / rows;
  const ww = Math.min(7, gapX * 0.5);
  const wh = Math.min(8, gapY * 0.5);
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (rng() < 0.28) continue; // some windows dark
      const lit = warm && rng() < 0.34;
      cells.push(
        <rect
          key={`${key}-${r}-${c}`}
          x={x + c * gapX + (gapX - ww) / 2}
          y={y + r * gapY + (gapY - wh) / 2}
          width={ww}
          height={wh}
          rx={1}
          fill={lit ? warm : color}
          opacity={lit ? 0.82 + rng() * 0.18 : 0.5 + rng() * 0.4}
        />
      );
    }
  }
  return cells;
}

export function ListingVisual({ listing, className = "", rounded = false }: ListingVisualProps) {
  const seed = hashString(listing.id);
  const rng = mulberry32(seed);
  const palette = palettes[seed % palettes.length];
  const motif = getMotif(listing);
  const gid = `lv-${listing.id}`;
  const W = 400;
  const H = 300;
  const horizon = 214;
  const sunX = 60 + Math.floor(rng() * 280);
  const sunY = 48 + Math.floor(rng() * 46);

  const buildings = () => {
    switch (motif) {
      case "appartement":
      case "bureau":
      case "neuf": {
        const count = 4 + Math.floor(rng() * 3);
        const blocks = [];
        let cx = 18;
        for (let i = 0; i < count && cx < W - 30; i += 1) {
          const bw = 42 + Math.floor(rng() * 34);
          const bh = 70 + Math.floor(rng() * 110);
          const by = horizon - bh;
          const fill = i % 2 === 0 ? palette.structure : palette.structureAlt;
          blocks.push(<rect key={`b-${i}`} x={cx} y={by} width={bw} height={bh} fill={fill} />);
          if (motif === "bureau") {
            // glass facade: vertical mullions + window grid
            blocks.push(...windows(rng, cx + 4, by + 6, bw - 8, bh - 10, palette.window, `w-${i}`, palette.sun));
          } else {
            blocks.push(...windows(rng, cx + 5, by + 8, bw - 10, bh - 14, palette.window, `w-${i}`, palette.sun));
          }
          // rooftop accent
          blocks.push(<rect key={`r-${i}`} x={cx + bw / 2 - 1.5} y={by - 12} width={3} height={12} fill={palette.accent} opacity={0.8} />);
          cx += bw + 6 + Math.floor(rng() * 10);
        }
        if (motif === "neuf") {
          // construction crane
          const craneX = W - 70 - Math.floor(rng() * 40);
          const craneTop = 70;
          blocks.push(
            <g key="crane" stroke={palette.accent} strokeWidth={3} fill="none" opacity={0.92}>
              <line x1={craneX} y1={horizon} x2={craneX} y2={craneTop} />
              <line x1={craneX - 46} y1={craneTop + 8} x2={craneX + 78} y2={craneTop + 8} />
              <line x1={craneX} y1={craneTop} x2={craneX - 40} y2={craneTop + 8} />
              <line x1={craneX} y1={craneTop} x2={craneX + 70} y2={craneTop + 8} />
              <line x1={craneX + 60} y1={craneTop + 8} x2={craneX + 60} y2={craneTop + 30} strokeWidth={2} />
            </g>
          );
        }
        return blocks;
      }
      case "villa": {
        // wide low villa + pool + palm
        const vy = horizon - 78;
        const vw = 196;
        const vx = 150;
        return (
          <g key="villa">
            <rect x={vx} y={vy} width={vw} height={78} fill={palette.structure} />
            <rect x={vx} y={vy + 30} width={vw} height={48} fill={palette.structureAlt} opacity={0.65} />
            {windows(rng, vx + 12, vy + 14, vw - 24, 24, palette.window, "vw", palette.sun)}
            <rect x={vx + 18} y={vy + 44} width={20} height={34} fill={palette.accent} opacity={0.85} />
            {/* pool */}
            <rect x={36} y={horizon - 26} width={96} height={26} rx={6} fill={palette.accent} opacity={0.32} />
            <rect x={36} y={horizon - 26} width={96} height={8} rx={4} fill={palette.window} opacity={0.25} />
            {/* palm */}
            <g stroke={palette.accent} strokeWidth={4} fill="none" opacity={0.9}>
              <line x1={120} y1={horizon} x2={116} y2={horizon - 52} />
              <path d="M116 248 q -22 -14 -34 -8 M116 248 q 20 -16 34 -10 M116 250 q -14 -22 -6 -34 M116 250 q 16 -20 8 -34" transform={`translate(0 ${horizon - 300})`} />
            </g>
          </g>
        );
      }
      case "maison": {
        const hy = horizon - 70;
        const hx = 130;
        const hw = 150;
        return (
          <g key="maison">
            <rect x={hx} y={hy} width={hw} height={70} fill={palette.structure} />
            <path d={`M${hx - 14} ${hy} L${hx + hw / 2} ${hy - 42} L${hx + hw + 14} ${hy} Z`} fill={palette.structureAlt} />
            {windows(rng, hx + 14, hy + 12, hw - 28, 28, palette.window, "hw", palette.sun)}
            <rect x={hx + hw / 2 - 13} y={hy + 34} width={26} height={36} fill={palette.accent} opacity={0.85} />
            {/* garden hedge */}
            <rect x={40} y={horizon - 16} width={72} height={16} rx={8} fill={palette.accent} opacity={0.28} />
          </g>
        );
      }
      case "studio": {
        // single tasteful building, framed
        const sy = horizon - 120;
        const sx = 132;
        const sw = 136;
        return (
          <g key="studio">
            <rect x={sx} y={sy} width={sw} height={120} fill={palette.structure} />
            <rect x={sx} y={sy} width={sw} height={120} fill="none" stroke={palette.accent} strokeWidth={2} opacity={0.5} />
            {windows(rng, sx + 12, sy + 12, sw - 24, 96, palette.window, "sw", palette.sun)}
            <rect x={sx + sw / 2 - 16} y={horizon - 30} width={32} height={30} fill={palette.accent} opacity={0.8} />
          </g>
        );
      }
      case "terrain":
      default: {
        // land plot: boundary, contour lines, stakes, sun
        return (
          <g key="terrain">
            <path d={`M40 ${horizon} L150 ${horizon - 40} L300 ${horizon - 18} L360 ${horizon} Z`} fill={palette.structureAlt} opacity={0.45} />
            <path
              d={`M30 ${horizon + 6} L120 ${horizon - 30} L250 ${horizon - 14} L372 ${horizon + 10} L372 290 L30 290 Z`}
              fill="none"
              stroke={palette.accent}
              strokeWidth={2}
              strokeDasharray="8 7"
              opacity={0.85}
            />
            {[70, 150, 250, 330].map((sx, i) => (
              <g key={`stake-${i}`} stroke={palette.accent} strokeWidth={3} opacity={0.8}>
                <line x1={sx} y1={horizon - 6 - i} x2={sx} y2={horizon - 26 - i} />
                <circle cx={sx} cy={horizon - 28 - i} r={3} fill={palette.accent} />
              </g>
            ))}
            {[0, 1, 2].map((i) => (
              <path
                key={`contour-${i}`}
                d={`M40 ${250 + i * 14} q 160 -${18 - i * 4} 320 0`}
                fill="none"
                stroke={palette.window}
                strokeWidth={1}
                opacity={0.12}
              />
            ))}
          </g>
        );
      }
    }
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Illustration ${listing.property_type} — ${listing.city}`}
      className={`${className} ${rounded ? "rounded-[inherit]" : ""}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="55%" stopColor={palette.sky[1]} />
          <stop offset="100%" stopColor={palette.sunGlow} stopOpacity="0.32" />
        </linearGradient>
        <radialGradient id={`${gid}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.sun} stopOpacity="1" />
          <stop offset="32%" stopColor={palette.sun} stopOpacity="0.5" />
          <stop offset="68%" stopColor={palette.sunGlow} stopOpacity="0.26" />
          <stop offset="100%" stopColor={palette.sunGlow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sunGlow} stopOpacity="0" />
          <stop offset="100%" stopColor={palette.sun} stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={`${gid}-refl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sun} stopOpacity="0.16" />
          <stop offset="58%" stopColor={palette.sun} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${gid}-vig`} cx="50%" cy="42%" r="75%">
          <stop offset="58%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={`${gid}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="60%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${gid}-sky)`} />

      {/* sun — halo, light streak, core */}
      <circle cx={sunX} cy={sunY} r={96} fill={`url(#${gid}-sun)`} />
      <rect x={0} y={sunY - 1.5} width={W} height={3} fill={palette.sun} opacity={0.1} />
      <circle cx={sunX} cy={sunY} r={14} fill={palette.sun} opacity={0.95} />

      {/* faint stars / texture dots */}
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={`star-${i}`} cx={20 + rng() * 360} cy={16 + rng() * 110} r={rng() * 1.2} fill={palette.window} opacity={0.22} />
      ))}

      {/* distant skyline — profondeur (rng séparé, ne perturbe pas le motif) */}
      {(() => {
        const r2 = mulberry32(seed ^ 0x9e3779b9);
        const out = [];
        let cx = -8;
        let i = 0;
        while (cx < W + 8) {
          const bw = 22 + Math.floor(r2() * 30);
          const bh = 26 + Math.floor(r2() * 62);
          out.push(<rect key={`dist-${i}`} x={cx} y={horizon - bh} width={bw} height={bh} fill={palette.structure} opacity={0.4} rx={1} />);
          cx += bw + 2 + Math.floor(r2() * 6);
          i += 1;
        }
        return out;
      })()}

      {/* horizon haze */}
      <rect x={0} y={horizon - 46} width={W} height={54} fill={`url(#${gid}-haze)`} />

      {buildings()}

      {/* ground + reflet */}
      <rect x={0} y={horizon} width={W} height={H - horizon} fill={palette.ground} />
      <rect x={0} y={horizon} width={W} height={H - horizon} fill={`url(#${gid}-refl)`} />
      <rect x={0} y={horizon} width={W} height={2} fill={palette.accent} opacity={0.45} />

      {/* atmosphère + cadrage */}
      <rect width={W} height={H} fill={`url(#${gid}-vig)`} />
      <rect width={W} height={H} fill={`url(#${gid}-scrim)`} />
    </svg>
  );
}
