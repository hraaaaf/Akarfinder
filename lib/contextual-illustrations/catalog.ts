export type ContextualIllustrationAsset = {
  id: string;
  asset: string;
  label: string;
};

export type ContextualIllustrationCatalog = {
  districtType: Readonly<Record<string, readonly ContextualIllustrationAsset[]>>;
  district: Readonly<Record<string, readonly ContextualIllustrationAsset[]>>;
  cityType: Readonly<Record<string, readonly ContextualIllustrationAsset[]>>;
  city: Readonly<Record<string, readonly ContextualIllustrationAsset[]>>;
};

export function contextualKey(...parts: string[]): string {
  return parts.join("\u001f");
}

export const CONTEXTUAL_CITY_VISUALS = {
  Agadir: { id: "agadir-city-01", asset: "/images/cities/agadir.svg", label: "Agadir" },
  Casablanca: { id: "casablanca-city-01", asset: "/images/cities/casablanca.svg", label: "Casablanca" },
  Fes: { id: "fes-city-01", asset: "/images/fes-card.svg", label: "Fès" },
  "Fès": { id: "fes-city-01", asset: "/images/fes-card.svg", label: "Fès" },
  Marrakech: { id: "marrakech-city-01", asset: "/images/cities/marrakech.svg", label: "Marrakech" },
  Rabat: { id: "rabat-city-01", asset: "/images/cities/rabat.svg", label: "Rabat" },
  Tanger: { id: "tanger-city-01", asset: "/images/cities/tanger.svg", label: "Tanger" },
} as const satisfies Readonly<Record<string, ContextualIllustrationAsset>>;

type ContextualCity = keyof typeof CONTEXTUAL_CITY_VISUALS;

export function getContextualCityVisual(city?: string | null): ContextualIllustrationAsset | null {
  if (!city || !(city in CONTEXTUAL_CITY_VISUALS)) return null;
  return CONTEXTUAL_CITY_VISUALS[city as ContextualCity];
}

const AGADIR_CITY_VISUALS: readonly ContextualIllustrationAsset[] = [
  CONTEXTUAL_CITY_VISUALS.Agadir,
  { id: "agadir-city-02", asset: "/images/contextual/agadir/agadir-city-02.svg", label: "Agadir" },
  { id: "agadir-city-03", asset: "/images/contextual/agadir/agadir-city-03.svg", label: "Agadir" },
  { id: "agadir-city-04", asset: "/images/contextual/agadir/agadir-city-04.svg", label: "Agadir" },
];

const AGADIR_APARTMENT_VISUALS: readonly ContextualIllustrationAsset[] = [
  { id: "agadir-apartment-01", asset: "/images/contextual/agadir/agadir-apartment-01.svg", label: "Agadir" },
  { id: "agadir-apartment-02", asset: "/images/contextual/agadir/agadir-apartment-02.svg", label: "Agadir" },
  { id: "agadir-apartment-03", asset: "/images/contextual/agadir/agadir-apartment-03.svg", label: "Agadir" },
  { id: "agadir-apartment-04", asset: "/images/contextual/agadir/agadir-apartment-04.svg", label: "Agadir" },
];

const AGADIR_VILLA_VISUALS: readonly ContextualIllustrationAsset[] = [
  { id: "agadir-villa-01", asset: "/images/contextual/agadir/agadir-villa-01.svg", label: "Agadir" },
  { id: "agadir-villa-02", asset: "/images/contextual/agadir/agadir-villa-02.svg", label: "Agadir" },
  { id: "agadir-villa-03", asset: "/images/contextual/agadir/agadir-villa-03.svg", label: "Agadir" },
  { id: "agadir-villa-04", asset: "/images/contextual/agadir/agadir-villa-04.svg", label: "Agadir" },
];

function cityPools(): Readonly<Record<string, readonly ContextualIllustrationAsset[]>> {
  return Object.fromEntries(
    Object.entries(CONTEXTUAL_CITY_VISUALS).map(([city, asset]) => [
      city,
      city === "Agadir" ? AGADIR_CITY_VISUALS : [asset] as const,
    ])
  );
}

/**
 * Production catalog for truth-safe contextual artwork.
 *
 * The Agadir P1 pilot adds only city and city/type pools backed by structured
 * Search fields already present in the public DTO. District pools remain empty
 * until a certified normalized district signal is available to Search.
 */
export const CONTEXTUAL_ILLUSTRATION_CATALOG: ContextualIllustrationCatalog = {
  districtType: {},
  district: {},
  cityType: {
    [contextualKey("Agadir", "Appartement")]: AGADIR_APARTMENT_VISUALS,
    [contextualKey("Agadir", "Villa")]: AGADIR_VILLA_VISUALS,
  },
  city: cityPools(),
};
