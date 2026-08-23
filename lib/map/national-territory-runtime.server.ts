import { gunzipSync } from "node:zlib";
import places0 from "@/lib/map/national-territory-data/places-0";
import boundaries0 from "@/lib/map/national-territory-data/boundaries-0";
import boundaries1 from "@/lib/map/national-territory-data/boundaries-1";
import boundaries2 from "@/lib/map/national-territory-data/boundaries-2";
import boundaries3 from "@/lib/map/national-territory-data/boundaries-3";
import boundaries4 from "@/lib/map/national-territory-data/boundaries-4";
import boundaries5 from "@/lib/map/national-territory-data/boundaries-5";
import boundaries6 from "@/lib/map/national-territory-data/boundaries-6";
import boundaries7 from "@/lib/map/national-territory-data/boundaries-7";

// Generated from the validated V5 source artifact (run 32634250993).
// Full 10,799-neighborhood provenance stays in that artifact; N1 ships city/town
// labels, candidate boundaries and per-city neighborhood counts only.
// Rendering geometry is topology-preserving simplified at 0.005 degrees; source
// identity, relation id, attribution and non-official-boundary claim are unchanged.

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

const boundaryChunks = [
  boundaries0,
  boundaries1,
  boundaries2,
  boundaries3,
  boundaries4,
  boundaries5,
  boundaries6,
  boundaries7,
].map((chunk) => decodeJson<GeoJSON.FeatureCollection>(chunk));

export const NATIONAL_TERRITORY_BOUNDARIES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: boundaryChunks.flatMap((collection) => collection.features),
};

export const NATIONAL_TERRITORY_META = {
  sourceArtifact: "carte-national-territory-registry-v5-32634250993",
  sourceRun: 32634250993,
  cityCount: NATIONAL_TERRITORY_PLACES.length,
  boundaryCount: NATIONAL_TERRITORY_BOUNDARIES.features.length,
  neighborhoodCount: 10799,
  geometrySource: "OpenStreetMap",
  geometryLicense: "ODbL-1.0",
  hcpYear: 2024,
  renderGeometrySimplificationToleranceDegrees: 0.005,
} as const;

const placeBySlug = new Map(
  NATIONAL_TERRITORY_PLACES.map((place) => [place.slug, place] as const),
);

export function getNationalTerritoryPlace(slug: string) {
  return placeBySlug.get(slug) ?? null;
}
