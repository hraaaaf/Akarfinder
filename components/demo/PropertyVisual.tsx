// DEMO-LISTING-VISUALS-1 — Fictional, locally-generated illustrative visuals
// for /demo property cards. Deliberately stylized (not photographic) so
// they can never be mistaken for a real listing photo or a copied image.
// Fully inline SVG: zero external requests, zero extra static assets.

export type PropertyVisualType =
  | "apartment-modern"
  | "villa-premium"
  | "residence-neuve"
  | "appartement-familial"
  | "studio-urbain"
  | "terrain"
  | "local-commercial";

type PropertyVisualProps = {
  type: PropertyVisualType;
  ratio?: "4:3" | "16:10";
  className?: string;
};

const RATIO_CLASS: Record<NonNullable<PropertyVisualProps["ratio"]>, string> = {
  "4:3": "aspect-[4/3]",
  "16:10": "aspect-[16/10]",
};

function ApartmentModern({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#eef4ff" />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#0B63CE" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky-${uid})`} />
      <rect x="60" y="60" width="90" height="200" rx="4" fill={`url(#glass-${uid})`} opacity="0.92" />
      <rect x="160" y="30" width="110" height="230" rx="4" fill="#071B33" opacity="0.85" />
      <rect x="280" y="90" width="70" height="170" rx="4" fill={`url(#glass-${uid})`} opacity="0.75" />
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <rect key={`w1-${row}-${col}`} x={175 + col * 30} y={45 + row * 26} width="18" height="14" fill="#eef4ff" opacity="0.55" />
        ))
      )}
      <rect x="0" y="260" width="400" height="40" fill="#c7dff7" opacity="0.6" />
    </>
  );
}

function VillaPremium({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky2-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3e2" />
          <stop offset="100%" stopColor="#fdf8f0" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky2-${uid})`} />
      <rect x="90" y="140" width="220" height="110" rx="3" fill="#f5f0e6" stroke="#e8d9b8" strokeWidth="2" />
      <rect x="90" y="110" width="130" height="40" rx="2" fill="#eadfca" />
      <polygon points="80,140 200,95 320,140" fill="#9B7838" opacity="0.85" />
      <rect x="130" y="180" width="30" height="45" fill="#0B63CE" opacity="0.5" />
      <rect x="230" y="180" width="30" height="45" fill="#0B63CE" opacity="0.5" />
      <rect x="180" y="195" width="40" height="55" fill="#7a5a2a" />
      <ellipse cx="330" cy="245" rx="45" ry="14" fill="#86efac" opacity="0.55" />
      <ellipse cx="60" cy="250" rx="55" ry="16" fill="#86efac" opacity="0.5" />
      <rect x="0" y="255" width="400" height="45" fill="#e5f4e0" opacity="0.7" />
    </>
  );
}

function ResidenceNeuve({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky3-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0e9fb" />
          <stop offset="100%" stopColor="#f4f7fd" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky3-${uid})`} />
      <rect x="30" y="120" width="80" height="140" rx="3" fill="#0f2d52" opacity="0.9" />
      <rect x="120" y="70" width="90" height="190" rx="3" fill="#0B63CE" opacity="0.92" />
      <rect x="220" y="100" width="80" height="160" rx="3" fill="#0f2d52" opacity="0.85" />
      <rect x="310" y="140" width="60" height="120" rx="3" fill="#0B63CE" opacity="0.75" />
      {Array.from({ length: 6 }).map((_, row) => (
        <rect key={`w2-${row}`} x="135" y={85 + row * 26} width="60" height="15" fill="#eef4ff" opacity="0.5" />
      ))}
      <rect x="0" y="255" width="400" height="45" fill="#dbe8fb" opacity="0.6" />
      <rect x="170" y="30" width="6" height="45" fill="#9B7838" />
      <polygon points="150,30 200,15 200,30" fill="#9B7838" opacity="0.7" />
    </>
  );
}

function AppartementFamilial({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky4-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9f0fb" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky4-${uid})`} />
      <rect x="70" y="90" width="260" height="170" rx="4" fill="#f1ede2" stroke="#e0d6bd" strokeWidth="2" />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <rect key={`w3-${row}-${col}`} x={90 + col * 44} y={110 + row * 36} width="26" height="22" fill="#7dd3fc" opacity="0.55" />
        ))
      )}
      <rect x="0" y="255" width="400" height="45" fill="#e7ecf5" opacity="0.7" />
    </>
  );
}

function StudioUrbain({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky5-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f5" />
          <stop offset="100%" stopColor="#f5f7fb" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky5-${uid})`} />
      <rect x="40" y="100" width="70" height="160" fill="#94a3b8" opacity="0.6" />
      <rect x="120" y="60" width="80" height="200" fill="#0f2d52" opacity="0.88" />
      <rect x="210" y="130" width="65" height="130" fill="#94a3b8" opacity="0.55" />
      <rect x="285" y="80" width="75" height="180" fill="#0B63CE" opacity="0.8" />
      {Array.from({ length: 7 }).map((_, row) => (
        <rect key={`w4-${row}`} x="135" y={75 + row * 24} width="50" height="12" fill="#eef4ff" opacity="0.5" />
      ))}
      <rect x="0" y="255" width="400" height="45" fill="#dfe5f0" opacity="0.65" />
    </>
  );
}

function Terrain({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky6-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef7ea" />
          <stop offset="100%" stopColor="#f7fbf3" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky6-${uid})`} />
      <rect x="40" y="60" width="320" height="200" fill="#dcefd2" opacity="0.6" />
      <g stroke="#9B7838" strokeWidth="2" opacity="0.7">
        <line x1="40" y1="120" x2="360" y2="120" />
        <line x1="40" y1="180" x2="360" y2="180" />
        <line x1="150" y1="60" x2="150" y2="260" />
        <line x1="260" y1="60" x2="260" y2="260" />
      </g>
      <rect x="40" y="60" width="320" height="200" fill="none" stroke="#7a9b5f" strokeWidth="3" />
    </>
  );
}

function LocalCommercial({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky7-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef1f8" />
          <stop offset="100%" stopColor="#f9fafc" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky7-${uid})`} />
      <rect x="60" y="110" width="280" height="150" fill="#f3f0e8" stroke="#e0d6bd" strokeWidth="2" />
      <rect x="80" y="180" width="90" height="80" fill="#0B63CE" opacity="0.5" />
      <rect x="230" y="180" width="90" height="80" fill="#0B63CE" opacity="0.5" />
      <rect x="60" y="90" width="280" height="24" fill="#9B7838" opacity="0.85" />
      <rect x="0" y="255" width="400" height="45" fill="#e9ecf2" opacity="0.6" />
    </>
  );
}

const RENDERERS: Record<PropertyVisualType, typeof ApartmentModern> = {
  "apartment-modern": ApartmentModern,
  "villa-premium": VillaPremium,
  "residence-neuve": ResidenceNeuve,
  "appartement-familial": AppartementFamilial,
  "studio-urbain": StudioUrbain,
  terrain: Terrain,
  "local-commercial": LocalCommercial,
};

let uidCounter = 0;

export function PropertyVisual({ type, ratio = "16:10", className = "" }: PropertyVisualProps) {
  const uid = (uidCounter++).toString();
  const Renderer = RENDERERS[type];

  return (
    <div className={`relative overflow-hidden ${RATIO_CLASS[ratio]} ${className}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <Renderer uid={uid} />
      </svg>
      <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        Visuel fictif
      </span>
    </div>
  );
}
