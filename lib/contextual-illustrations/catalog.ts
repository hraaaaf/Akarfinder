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

const pool = (
  city: "Agadir" | "Marrakech" | "Casablanca",
  kind: "city" | "apartment" | "villa"
): readonly ContextualIllustrationAsset[] => {
  const label = city;
  const slug = city.toLowerCase();
  if (kind === "city") {
    const canonical = CONTEXTUAL_CITY_VISUALS[city];
    return [
      canonical,
      ...[2, 3, 4].map((n) => ({
        id: `${slug}-city-0${n}`,
        asset: `/images/contextual/${slug}/${slug}-city-0${n}.svg`,
        label,
      })),
    ];
  }
  return [1, 2, 3, 4].map((n) => ({
    id: `${slug}-${kind}-0${n}`,
    asset: `/images/contextual/${slug}/${slug}-${kind}-0${n}.svg`,
    label,
  }));
};

const AGADIR_CITY_VISUALS = pool("Agadir", "city");
const AGADIR_APARTMENT_VISUALS = pool("Agadir", "apartment");
const AGADIR_VILLA_VISUALS = pool("Agadir", "villa");
const MARRAKECH_CITY_VISUALS = pool("Marrakech", "city");
const MARRAKECH_APARTMENT_VISUALS = pool("Marrakech", "apartment");
const MARRAKECH_VILLA_VISUALS = pool("Marrakech", "villa");
const CASABLANCA_CITY_VISUALS = pool("Casablanca", "city");
const CASABLANCA_APARTMENT_VISUALS = pool("Casablanca", "apartment");
const CASABLANCA_VILLA_VISUALS = pool("Casablanca", "villa");

const CITY_POOL_OVERRIDES: Readonly<Record<string, readonly ContextualIllustrationAsset[]>> = {
  Agadir: AGADIR_CITY_VISUALS,
  Marrakech: MARRAKECH_CITY_VISUALS,
  Casablanca: CASABLANCA_CITY_VISUALS,
};

function cityPools(): Readonly<Record<string, readonly ContextualIllustrationAsset[]>> {
  return Object.fromEntries(
    Object.entries(CONTEXTUAL_CITY_VISUALS).map(([city, asset]) => [city, CITY_POOL_OVERRIDES[city] ?? [asset]])
  );
}

/**
 * Production catalog for truth-safe contextual artwork.
 *
 * P1 Agadir plus SCALE-1 Marrakech/Casablanca use only structured city and
 * property-type fields already exposed by Search. District pools remain empty
 * until a certified normalized district signal is available to Search.
 */
export const CONTEXTUAL_ILLUSTRATION_CATALOG: ContextualIllustrationCatalog = {
  districtType: {},
  district: {},
  cityType: {
    [contextualKey("Agadir", "Appartement")]: AGADIR_APARTMENT_VISUALS,
    [contextualKey("Agadir", "Villa")]: AGADIR_VILLA_VISUALS,
    [contextualKey("Marrakech", "Appartement")]: MARRAKECH_APARTMENT_VISUALS,
    [contextualKey("Marrakech", "Villa")]: MARRAKECH_VILLA_VISUALS,
    [contextualKey("Casablanca", "Appartement")]: CASABLANCA_APARTMENT_VISUALS,
    [contextualKey("Casablanca", "Villa")]: CASABLANCA_VILLA_VISUALS,
  },
  city: cityPools(),
};
