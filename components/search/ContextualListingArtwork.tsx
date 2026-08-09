import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";

export const CONTEXTUAL_CITY_VISUALS = {
  Agadir: { asset: "/images/cities/agadir.svg", label: "Agadir" },
  Casablanca: { asset: "/images/cities/casablanca.svg", label: "Casablanca" },
  Fes: { asset: "/images/fes-card.svg", label: "Fès" },
  "Fès": { asset: "/images/fes-card.svg", label: "Fès" },
  Marrakech: { asset: "/images/cities/marrakech.svg", label: "Marrakech" },
  Rabat: { asset: "/images/cities/rabat.svg", label: "Rabat" },
  Tanger: { asset: "/images/cities/tanger.svg", label: "Tanger" },
} as const;

type ContextualCity = keyof typeof CONTEXTUAL_CITY_VISUALS;

type ContextualListingArtworkProps = {
  city?: string | null;
  propertyType?: string | null;
  className?: string;
};

export function getContextualCityVisual(city?: string | null) {
  if (!city || !(city in CONTEXTUAL_CITY_VISUALS)) return null;
  return CONTEXTUAL_CITY_VISUALS[city as ContextualCity];
}

export function ContextualListingArtwork({
  city,
  propertyType,
  className = "",
}: ContextualListingArtworkProps) {
  const cityVisual = getContextualCityVisual(city);

  if (cityVisual) {
    return (
      <img
        src={cityVisual.asset}
        alt=""
        aria-hidden="true"
        data-contextual-city={cityVisual.label}
        className={`block h-full w-full object-cover object-center ${className}`.trim()}
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (propertyType) {
    return (
      <PropertyTypeArtwork
        kind={propertyType}
        className={className}
        decorative
      />
    );
  }

  return (
    <div
      data-contextual-neutral
      className={`grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center dark:from-deepblue dark:to-slate-900 ${className}`.trim()}
    >
      <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground dark:text-white/55">
        Annonce indexée
      </span>
    </div>
  );
}
