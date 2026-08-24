import {
  GEO_NEIGHBORHOODS,
  normalizeGeoText,
  resolveCityEntity,
  resolveNeighborhoodEntity,
  type CanonicalNeighborhoodEntity,
} from "./geo-entity-registry";
import {
  NATIONAL_TERRITORY_META,
  NATIONAL_TERRITORY_PLACES,
  getNationalNeighborhoodsForPlace,
  type NationalTerritoryNeighborhood,
  type NationalTerritoryPlace,
} from "../map/national-territory-runtime.server";
import type { PartnerListingV2 } from "../partners/partner-listing-v2";

export type NationalGeoResolutionStatus =
  | "resolved_exact"
  | "resolved_neighborhood"
  | "resolved_city"
  | "unresolved";

export type NationalGeoResolutionConfidence = "high" | "medium" | "low" | "unknown";
export type CoordinateStatus = "valid" | "absent" | "invalid";

export type NationalGeoResolverInput = {
  city_raw: string;
  neighborhood_raw?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates_public_allowed?: boolean;
  private_address_present?: boolean;
};

export type NationalGeoResolverResult = {
  status: NationalGeoResolutionStatus;
  reason:
    | "canonical_registry_match"
    | "national_n2_label_match"
    | "exact_coordinates_city_only"
    | "city_only"
    | "ambiguous_neighborhood"
    | "unknown_neighborhood"
    | "unknown_city";
  city_raw: string;
  city: {
    id: string;
    slug: string;
    name: string;
    source: "geo_entity_registry" | "national_territory_v5";
  } | null;
  neighborhood_raw: string | null;
  canonical_neighborhood_id: string | null;
  neighborhood_slug: string | null;
  neighborhood_name: string | null;
  neighborhood_source: "geo_entity_registry" | "national_territory_v5" | null;
  neighborhood_source_kinds: NationalTerritoryNeighborhood["sourceKinds"];
  coordinate_status: CoordinateStatus;
  latitude: number | null;
  longitude: number | null;
  geo_precision: "exact_coordinates" | "neighborhood" | "city" | "unresolved";
  confidence: NationalGeoResolutionConfidence;
  position_publication_allowed: boolean;
  private_address_used_for_resolution: false;
  boundary_certified: false;
  source_refs: string[];
};

function normalizeNeighborhoodLookup(value: string): string {
  return normalizeGeoText(value).replace(/^quartier\s+/, "").trim();
}

function isValidCoordinatePair(latitude?: number | null, longitude?: number | null): boolean {
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function coordinateStatus(latitude?: number | null, longitude?: number | null): CoordinateStatus {
  if (latitude == null && longitude == null) return "absent";
  return isValidCoordinatePair(latitude, longitude) ? "valid" : "invalid";
}

function resolveNationalPlace(value: string): NationalTerritoryPlace | null {
  const registry = resolveCityEntity(value);
  const keys = new Set([
    normalizeGeoText(value),
    ...(registry ? [normalizeGeoText(registry.canonical_name), normalizeGeoText(registry.slug)] : []),
  ]);

  const matches = NATIONAL_TERRITORY_PLACES.filter(
    (place) => keys.has(normalizeGeoText(place.name)) || keys.has(normalizeGeoText(place.slug)),
  );
  return matches.length === 1 ? matches[0] : null;
}

function resolveCanonicalNeighborhood(
  cityName: string,
  rawNeighborhood: string,
): CanonicalNeighborhoodEntity | null {
  const direct = resolveNeighborhoodEntity(cityName, rawNeighborhood);
  if (direct) return direct;

  const stripped = normalizeNeighborhoodLookup(rawNeighborhood);
  if (!stripped || stripped === normalizeGeoText(rawNeighborhood)) return null;
  const city = resolveCityEntity(cityName);
  if (!city) return null;

  return GEO_NEIGHBORHOODS.find(
    (item) =>
      city.slug === item.city_slug &&
      [item.canonical_name, item.slug, ...item.aliases].some(
        (candidate) => normalizeNeighborhoodLookup(candidate) === stripped,
      ),
  ) ?? null;
}

function resolveNationalNeighborhood(
  place: NationalTerritoryPlace,
  rawNeighborhood: string,
): { row: NationalTerritoryNeighborhood | null; ambiguous: boolean } {
  const rows = getNationalNeighborhoodsForPlace(place);
  const exact = normalizeGeoText(rawNeighborhood);
  const exactMatches = rows.filter(
    (item) => normalizeGeoText(item.name) === exact || normalizeGeoText(item.slug) === exact,
  );
  if (exactMatches.length === 1) return { row: exactMatches[0], ambiguous: false };
  if (exactMatches.length > 1) return { row: null, ambiguous: true };

  const stripped = normalizeNeighborhoodLookup(rawNeighborhood);
  const strippedMatches = rows.filter(
    (item) =>
      normalizeNeighborhoodLookup(item.name) === stripped ||
      normalizeNeighborhoodLookup(item.slug) === stripped,
  );
  if (strippedMatches.length === 1) return { row: strippedMatches[0], ambiguous: false };
  return { row: null, ambiguous: strippedMatches.length > 1 };
}

function nationalNeighborhoodConfidence(row: NationalTerritoryNeighborhood): NationalGeoResolutionConfidence {
  return row.sourceKinds.length >= 2 ? "high" : "medium";
}

export function resolveNationalPartnerGeo(input: NationalGeoResolverInput): NationalGeoResolverResult {
  const rawCity = input.city_raw?.trim() ?? "";
  const rawNeighborhood = input.neighborhood_raw?.trim() || null;
  const coordStatus = coordinateStatus(input.latitude, input.longitude);
  const validCoordinates = coordStatus === "valid";
  const latitude = validCoordinates ? input.latitude! : null;
  const longitude = validCoordinates ? input.longitude! : null;

  const cityRegistry = rawCity ? resolveCityEntity(rawCity) : null;
  const place = rawCity ? resolveNationalPlace(rawCity) : null;

  if (!place) {
    return {
      status: "unresolved",
      reason: "unknown_city",
      city_raw: rawCity,
      city: null,
      neighborhood_raw: rawNeighborhood,
      canonical_neighborhood_id: null,
      neighborhood_slug: null,
      neighborhood_name: null,
      neighborhood_source: null,
      neighborhood_source_kinds: [],
      coordinate_status: coordStatus,
      latitude,
      longitude,
      geo_precision: "unresolved",
      confidence: "unknown",
      position_publication_allowed: validCoordinates && input.coordinates_public_allowed === true,
      private_address_used_for_resolution: false,
      boundary_certified: false,
      source_refs: validCoordinates ? ["partner_coordinates"] : [],
    };
  }

  const city = cityRegistry
    ? {
        id: cityRegistry.id,
        slug: cityRegistry.slug,
        name: cityRegistry.canonical_name,
        source: "geo_entity_registry" as const,
      }
    : {
        id: `national-city:${place.slug}`,
        slug: place.slug,
        name: place.name,
        source: "national_territory_v5" as const,
      };

  const baseSourceRefs = [
    cityRegistry ? "geo_entity_registry" : NATIONAL_TERRITORY_META.sourceArtifact,
    ...(validCoordinates ? ["partner_coordinates"] : []),
  ];

  if (rawNeighborhood) {
    const canonical = resolveCanonicalNeighborhood(city.name, rawNeighborhood);
    if (canonical) {
      return {
        status: validCoordinates ? "resolved_exact" : "resolved_neighborhood",
        reason: "canonical_registry_match",
        city_raw: rawCity,
        city,
        neighborhood_raw: rawNeighborhood,
        canonical_neighborhood_id: canonical.id,
        neighborhood_slug: canonical.slug,
        neighborhood_name: canonical.canonical_name,
        neighborhood_source: "geo_entity_registry",
        neighborhood_source_kinds: [],
        coordinate_status: coordStatus,
        latitude,
        longitude,
        geo_precision: validCoordinates ? "exact_coordinates" : "neighborhood",
        confidence: "high",
        position_publication_allowed: validCoordinates && input.coordinates_public_allowed === true,
        private_address_used_for_resolution: false,
        boundary_certified: false,
        source_refs: Array.from(new Set([...baseSourceRefs, "geo_entity_registry"])),
      };
    }

    const national = resolveNationalNeighborhood(place, rawNeighborhood);
    if (national.row) {
      return {
        status: validCoordinates ? "resolved_exact" : "resolved_neighborhood",
        reason: "national_n2_label_match",
        city_raw: rawCity,
        city,
        neighborhood_raw: rawNeighborhood,
        canonical_neighborhood_id: `district_national_${place.slug}_${national.row.slug}`,
        neighborhood_slug: national.row.slug,
        neighborhood_name: national.row.name,
        neighborhood_source: "national_territory_v5",
        neighborhood_source_kinds: national.row.sourceKinds,
        coordinate_status: coordStatus,
        latitude,
        longitude,
        geo_precision: validCoordinates ? "exact_coordinates" : "neighborhood",
        confidence: nationalNeighborhoodConfidence(national.row),
        position_publication_allowed: validCoordinates && input.coordinates_public_allowed === true,
        private_address_used_for_resolution: false,
        boundary_certified: false,
        source_refs: Array.from(new Set([...baseSourceRefs, NATIONAL_TERRITORY_META.sourceArtifact])),
      };
    }

    return {
      status: validCoordinates ? "resolved_exact" : "resolved_city",
      reason: national.ambiguous ? "ambiguous_neighborhood" : "unknown_neighborhood",
      city_raw: rawCity,
      city,
      neighborhood_raw: rawNeighborhood,
      canonical_neighborhood_id: null,
      neighborhood_slug: null,
      neighborhood_name: null,
      neighborhood_source: null,
      neighborhood_source_kinds: [],
      coordinate_status: coordStatus,
      latitude,
      longitude,
      geo_precision: validCoordinates ? "exact_coordinates" : "city",
      confidence: validCoordinates ? "medium" : "low",
      position_publication_allowed: validCoordinates && input.coordinates_public_allowed === true,
      private_address_used_for_resolution: false,
      boundary_certified: false,
      source_refs: baseSourceRefs,
    };
  }

  return {
    status: validCoordinates ? "resolved_exact" : "resolved_city",
    reason: validCoordinates ? "exact_coordinates_city_only" : "city_only",
    city_raw: rawCity,
    city,
    neighborhood_raw: null,
    canonical_neighborhood_id: null,
    neighborhood_slug: null,
    neighborhood_name: null,
    neighborhood_source: null,
    neighborhood_source_kinds: [],
    coordinate_status: coordStatus,
    latitude,
    longitude,
    geo_precision: validCoordinates ? "exact_coordinates" : "city",
    confidence: validCoordinates ? "medium" : "high",
    position_publication_allowed: validCoordinates && input.coordinates_public_allowed === true,
    private_address_used_for_resolution: false,
    boundary_certified: false,
    source_refs: baseSourceRefs,
  };
}

export function resolvePartnerListingV2Geo(
  listing: PartnerListingV2,
  options: { coordinates_public_allowed?: boolean } = {},
): NationalGeoResolverResult {
  return resolveNationalPartnerGeo({
    city_raw: listing.city,
    neighborhood_raw: listing.district,
    latitude: listing.latitude,
    longitude: listing.longitude,
    coordinates_public_allowed: options.coordinates_public_allowed === true,
    private_address_present: Boolean(listing.address_private?.trim()),
  });
}
