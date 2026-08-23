import { gunzipSync } from "node:zlib";
import places0 from "@/lib/map/national-territory-data/places-0";
import boundariesAll from "@/lib/map/national-territory-data/boundaries-all";

// Generated from the validated V5 source artifact (run 32634250993).
// Full 10,799-neighborhood provenance stays in that artifact; N1 ships city/town
// labels, candidate boundaries and per-city neighborhood counts only.

export type NationalTerritoryPlace = {
  slug: string;
  name: string;
  center: { lng: number; lat: number } | null;
  boundaryRelationId: number | null;
  confidence: "official_hcp" | "osm_open_map";
  population: number | null;
  neighborhoodCount: number;
};

function decodeJson<T>(value: string): T {
  return JSON.parse(gunzipSync(Buffer.from(value, "base64")).toString("utf8")) as T;
}

export const NATIONAL_TERRITORY_PLACES = decodeJson<NationalTerritoryPlace[]>(places0);
export const NATIONAL_TERRITORY_BOUNDARIES = decodeJson<GeoJSON.FeatureCollection>(
  boundariesAll,
);

export const NATIONAL_TERRITORY_META = {
  sourceArtifact: "carte-national-territory-registry-v5-32634250993",
  sourceRun: 32634250993,
  cityCount: NATIONAL_TERRITORY_PLACES.length,
  boundaryCount: NATIONAL_TERRITORY_BOUNDARIES.features.length,
  neighborhoodCount: 10799,
  geometrySource: "OpenStreetMap",
  geometryLicense: "ODbL-1.0",
  hcpYear: 2024,
} as const;

const placeBySlug = new Map(NATIONAL_TERRITORY_PLACES.map((place) => [place.slug, place] as const));

export function getNationalTerritoryPlace(slug: string) {
  return placeBySlug.get(slug) ?? null;
}
