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

function cityPools(): Readonly<Record<string, readonly ContextualIllustrationAsset[]>> {
  return Object.fromEntries(
    Object.entries(CONTEXTUAL_CITY_VISUALS).map(([city, asset]) => [city, [asset] as const])
  );
}

/**
 * Production catalog for truth-safe contextual artwork.
 *
 * P0 deliberately ships no district or city/type variants. Those pools stay
 * empty until their structured signals and visual assets are separately
 * certified. The existing city artwork is retained as the only production
 * contextual tier in this foundation lot.
 */
export const CONTEXTUAL_ILLUSTRATION_CATALOG: ContextualIllustrationCatalog = {
  districtType: {},
  district: {},
  cityType: {},
  city: cityPools(),
};

export function contextualKey(...parts: string[]): string {
  return parts.join("\u001f");
}
