import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import {
  CONTEXTUAL_CITY_VISUALS,
  getContextualCityVisual,
} from "@/lib/contextual-illustrations/catalog";
import { resolveContextualIllustration } from "@/lib/contextual-illustrations/resolver";

export { CONTEXTUAL_CITY_VISUALS, getContextualCityVisual };

type ContextualListingArtworkProps = {
  stableRepresentationKey: string;
  city?: string | null;
  normalizedDistrict?: string | null;
  propertyType?: string | null;
  className?: string;
};

export function ContextualListingArtwork({
  stableRepresentationKey,
  city,
  normalizedDistrict,
  propertyType,
  className = "",
}: ContextualListingArtworkProps) {
  const contextualVisual = resolveContextualIllustration({
    stableRepresentationKey,
    normalizedCity: city,
    normalizedDistrict,
    normalizedPropertyType: propertyType,
  });

  if (contextualVisual) {
    return (
      <img
        src={contextualVisual.asset}
        alt=""
        aria-hidden="true"
        data-contextual-city={contextualVisual.label}
        data-contextual-asset-id={contextualVisual.id}
        data-contextual-tier={contextualVisual.tier}
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
