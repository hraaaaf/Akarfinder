import { getOptionAPropertyType } from "@/lib/property-types/presentation";

type PropertyTypeArtworkProps = {
  kind: string;
  className?: string;
  decorative?: boolean;
};

const PREMIUM_PROPERTY_TYPE_IMAGES = {
  Appartement: "/images/property-types-premium/appartement.svg",
  Villa: "/images/property-types-premium/villa.svg",
  Terrain: "/images/property-types-premium/terrain.webp",
  Studio: "/images/property-types-premium/studio.webp",
  Riad: "/images/property-types-premium/riad.webp",
  Bureau: "/images/property-types-premium/bureau.webp",
} as const;

function GenericHouseArtwork({
  className = "",
  decorative = false,
}: Omit<PropertyTypeArtworkProps, "kind">) {
  return (
    <svg
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Illustration premium Maison"}
    >
      <defs>
        <linearGradient id="fallback-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#071B3C" />
          <stop offset="1" stopColor="#0B63CE" />
        </linearGradient>
        <linearGradient id="fallback-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEF6FF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="30" fill="#FFFFFF" />
      <circle cx="332" cy="142" r="124" fill="url(#fallback-blue)" />
      <circle cx="456" cy="105" r="82" fill="#DCEBFF" opacity=".72" />
      <path
        d="M36 303C172 268 263 295 356 277C463 256 523 249 610 276V360H36Z"
        fill="url(#fallback-ground)"
      />
      <path d="M159 168L321 62L483 168V291H159Z" fill="#FFFFFF" />
      <path d="M204 151H438V291H204Z" fill="#EEF6FF" />
      <rect x="236" y="176" width="48" height="47" rx="8" fill="#071B3C" />
      <rect x="358" y="176" width="48" height="47" rx="8" fill="#C59A45" opacity=".85" />
      <rect x="296" y="211" width="53" height="80" rx="8" fill="#071B3C" />
      <path
        d="M153 170L321 57L489 170"
        stroke="#C59A45"
        strokeWidth="9"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M134 286H518"
        stroke="#071B3C"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".16"
      />
    </svg>
  );
}

export function PropertyTypeArtwork({
  kind,
  className = "",
  decorative = false,
}: PropertyTypeArtworkProps) {
  const optionAType = getOptionAPropertyType(kind);

  if (!optionAType) {
    return <GenericHouseArtwork className={className} decorative={decorative} />;
  }

  return (
    <img
      src={PREMIUM_PROPERTY_TYPE_IMAGES[optionAType]}
      alt={decorative ? "" : `Illustration premium ${optionAType}`}
      aria-hidden={decorative ? true : undefined}
      className={`block h-full w-full object-cover object-center ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
