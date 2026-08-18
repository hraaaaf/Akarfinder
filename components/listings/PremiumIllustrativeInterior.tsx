import type { Listing } from "@/lib/listings/types";

type PremiumIllustrativeInteriorProps = {
  listing: Listing;
  className?: string;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    h ^= input.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function PremiumIllustrativeInterior({
  listing,
  className = "",
}: PremiumIllustrativeInteriorProps) {
  const seed = hashString(listing.id);
  const warmVariant = seed % 3;
  const wall = ["#F4EEE6", "#EFE9DF", "#F6F1E9"][warmVariant];
  const wallShade = ["#DDD2C3", "#D9D0C4", "#E0D5C6"][warmVariant];
  const sofa = ["#17395E", "#123A52", "#203A56"][warmVariant];
  const accent = ["#C8A466", "#B99255", "#D1B27A"][warmVariant];
  const rug = ["#E8DED1", "#E5D9CB", "#EDE3D8"][warmVariant];
  const gid = `premium-interior-${listing.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 960 600"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Illustration intérieure ${listing.property_type} à ${listing.city}`}
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`${gid}-wall`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={wall} />
          <stop offset="100%" stopColor={wallShade} />
        </linearGradient>
        <linearGradient id={`${gid}-window`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCEAF2" />
          <stop offset="55%" stopColor="#BFD5DF" />
          <stop offset="100%" stopColor="#8AA4B3" />
        </linearGradient>
        <linearGradient id={`${gid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C7A987" />
          <stop offset="100%" stopColor="#9E7958" />
        </linearGradient>
        <linearGradient id={`${gid}-sofa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sofa} />
          <stop offset="100%" stopColor="#0B2545" />
        </linearGradient>
        <radialGradient id={`${gid}-light`} cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#FFF8E8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFF8E8" stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0B2545" floodOpacity="0.16" />
        </filter>
      </defs>

      <rect width="960" height="600" fill={`url(#${gid}-wall)`} />
      <rect x="0" y="0" width="960" height="600" fill={`url(#${gid}-light)`} />

      <rect x="505" y="58" width="365" height="300" rx="8" fill="#F8F5EF" stroke="#D8D0C4" strokeWidth="10" />
      <rect x="523" y="76" width="329" height="264" rx="3" fill={`url(#${gid}-window)`} />
      <line x1="687" y1="76" x2="687" y2="340" stroke="#E8ECEA" strokeWidth="7" />
      <line x1="523" y1="208" x2="852" y2="208" stroke="#E8ECEA" strokeWidth="7" />
      <path d="M523 300 C610 255 730 250 852 285 L852 340 L523 340 Z" fill="#6E8791" opacity="0.35" />
      <circle cx="792" cy="128" r="34" fill="#F6DFA6" opacity="0.8" />

      <rect x="0" y="382" width="960" height="218" fill={`url(#${gid}-floor)`} />
      {[70, 175, 285, 405, 535, 675, 820].map((x, index) => (
        <line key={x} x1={x} y1="382" x2={x + 70 + index * 4} y2="600" stroke="#7F5B42" strokeOpacity="0.22" strokeWidth="2" />
      ))}

      <rect x="92" y="80" width="270" height="196" rx="10" fill="#E9E1D6" stroke="#D5C9B8" strokeWidth="4" />
      <rect x="111" y="100" width="232" height="158" rx="4" fill="#F8F3EC" />
      <path d="M134 220 C185 152 255 143 321 188 C283 195 235 211 195 244 Z" fill={accent} opacity="0.75" />
      <circle cx="287" cy="135" r="25" fill="#0B63CE" opacity="0.15" />

      <ellipse cx="385" cy="500" rx="275" ry="86" fill={rug} opacity="0.95" />
      <ellipse cx="385" cy="500" rx="225" ry="58" fill="#F4ECE2" opacity="0.55" />

      <g filter={`url(#${gid}-shadow)`}>
        <rect x="158" y="326" width="430" height="142" rx="34" fill={`url(#${gid}-sofa)`} />
        <rect x="139" y="358" width="70" height="117" rx="30" fill="#102E50" />
        <rect x="536" y="358" width="70" height="117" rx="30" fill="#102E50" />
        <rect x="190" y="297" width="172" height="80" rx="30" fill="#20486E" />
        <rect x="371" y="297" width="172" height="80" rx="30" fill="#1A4167" />
        <rect x="242" y="329" width="70" height="52" rx="16" fill={accent} opacity="0.95" />
        <rect x="424" y="325" width="78" height="55" rx="18" fill="#E7DED3" />
      </g>

      <g filter={`url(#${gid}-shadow)`}>
        <ellipse cx="650" cy="492" rx="108" ry="38" fill="#6E4E37" opacity="0.25" />
        <ellipse cx="650" cy="468" rx="104" ry="38" fill="#E8D7BE" />
        <ellipse cx="650" cy="461" rx="92" ry="28" fill="#F2E6D5" />
        <rect x="638" y="477" width="24" height="70" rx="10" fill="#6F5540" />
        <rect x="592" y="538" width="116" height="14" rx="7" fill="#6F5540" />
      </g>

      <g>
        <rect x="748" y="314" width="18" height="155" rx="9" fill="#7C5D44" />
        <ellipse cx="757" cy="298" rx="56" ry="22" fill={accent} />
        <path d="M710 292 Q757 226 804 292 Z" fill="#EFE4D2" stroke={accent} strokeWidth="4" />
        <circle cx="757" cy="302" r="8" fill="#FFF3C7" />
      </g>

      <g transform="translate(82 355)">
        <rect x="0" y="82" width="64" height="70" rx="10" fill="#B99069" />
        <path d="M32 84 C0 62 2 26 28 38 C21 9 57 6 55 36 C82 20 94 53 70 69 C93 78 81 110 55 98 Z" fill="#64846C" />
        <path d="M35 86 C28 55 38 30 49 12" fill="none" stroke="#496D56" strokeWidth="6" strokeLinecap="round" />
      </g>

      <rect x="24" y="22" width="250" height="54" rx="27" fill="#FFFFFF" fillOpacity="0.75" />
      <circle cx="54" cy="49" r="8" fill="#C8A466" />
      <text x="76" y="55" fontFamily="system-ui, sans-serif" fontSize="17" fontWeight="700" fill="#0B2545">
        Illustration immobilière
      </text>
    </svg>
  );
}
