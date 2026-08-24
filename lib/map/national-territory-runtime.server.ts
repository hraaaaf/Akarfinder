import { brotliDecompressSync, gunzipSync } from "node:zlib";
import places0 from "@/lib/map/national-territory-data/places-0";
import boundaries0 from "@/lib/map/national-territory-data/boundaries-0";
import boundaries1 from "@/lib/map/national-territory-data/boundaries-1";
import boundaries2 from "@/lib/map/national-territory-data/boundaries-2";
import boundaries3 from "@/lib/map/national-territory-data/boundaries-3";
import boundaries4 from "@/lib/map/national-territory-data/boundaries-4";
import boundaries5 from "@/lib/map/national-territory-data/boundaries-5";
import boundaries6 from "@/lib/map/national-territory-data/boundaries-6";
import boundaries7 from "@/lib/map/national-territory-data/boundaries-7";
import neighborhoods0 from "@/lib/map/national-territory-data/neighborhoods-n2-0";
import neighborhoods1 from "@/lib/map/national-territory-data/neighborhoods-n2-1";
import neighborhoods2 from "@/lib/map/national-territory-data/neighborhoods-n2-2";
import neighborhoods3 from "@/lib/map/national-territory-data/neighborhoods-n2-3";
import neighborhoods4 from "@/lib/map/national-territory-data/neighborhoods-n2-4";
import neighborhoods5 from "@/lib/map/national-territory-data/neighborhoods-n2-5";
import neighborhoods6 from "@/lib/map/national-territory-data/neighborhoods-n2-6";
import neighborhoods7 from "@/lib/map/national-territory-data/neighborhoods-n2-7";

// N2 is derived from the validated V5 source artifact (run 32634250993).
// It promotes sourced neighborhood/locality labels and point repères only.
// No neighborhood polygon is published unless separately qualified.

export type NationalTerritoryPlace = {
  slug: string;
  name: string;
  center: { lng: number; lat: number } | null;
  boundaryRelationId: number | null;
  confidence: "official_hcp" | "osm_open_map";
  population: number | null;
  neighborhoodCount: number;
};

export type NationalTerritoryNeighborhood = {
  slug: string;
  name: string;
  center: { lng: number; lat: number } | null;
  sourceKinds: Array<"barid_postal_neighborhood" | "osm_neighborhood_label">;
  boundaryStatus: "not_claimed";
  publicationStatus: "label_candidate";
};

type PackedNeighborhood = [name: string, lng: number | null, lat: number | null, sourceFlag: number];
type PackedNeighborhoodIndex = Record<string, PackedNeighborhood[]>;

function decodeJson<T>(value: string): T {
  return JSON.parse(gunzipSync(Buffer.from(value, "base64")).toString("utf8")) as T;
}

function parentKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function slugBase(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "quartier";
}

function unpackNeighborhoods(rows: PackedNeighborhood[]): NationalTerritoryNeighborhood[] {
  const seen = new Map<string, number>();
  return rows.map(([name, lng, lat, sourceFlag]) => {
    const base = slugBase(name);
    const next = (seen.get(base) ?? 0) + 1;
    seen.set(base, next);
    const sourceKinds: NationalTerritoryNeighborhood["sourceKinds"] = [];
    if (sourceFlag & 1) sourceKinds.push("osm_neighborhood_label");
    if (sourceFlag & 2) sourceKinds.push("barid_postal_neighborhood");
    return {
      slug: next === 1 ? base : `${base}-${next}`,
      name,
      center: lng !== null && lat !== null ? { lng, lat } : null,
      sourceKinds,
      boundaryStatus: "not_claimed",
      publicationStatus: "label_candidate",
    };
  });
}

export const NATIONAL_TERRITORY_PLACES = decodeJson<NationalTerritoryPlace[]>(places0);
const packedNeighborhoods = [
  neighborhoods0, neighborhoods1, neighborhoods2, neighborhoods3,
  neighborhoods4, neighborhoods5, neighborhoods6, neighborhoods7,
].join("");
const PACKED_NEIGHBORHOODS_BY_PARENT = JSON.parse(
  brotliDecompressSync(Buffer.from(packedNeighborhoods, "base64")).toString("utf8"),
) as PackedNeighborhoodIndex;
const NATIONAL_NEIGHBORHOODS_BY_PARENT = Object.fromEntries(
  Object.entries(PACKED_NEIGHBORHOODS_BY_PARENT).map(([key, rows]) => [key, unpackNeighborhoods(rows)]),
) as Record<string, NationalTerritoryNeighborhood[]>;

const boundaryChunks = [
  boundaries0, boundaries1, boundaries2, boundaries3,
  boundaries4, boundaries5, boundaries6, boundaries7,
].map((chunk) => decodeJson<GeoJSON.FeatureCollection>(chunk));

export const NATIONAL_TERRITORY_BOUNDARIES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: boundaryChunks.flatMap((collection) => collection.features),
};

const mappedNeighborhoods = Object.values(NATIONAL_NEIGHBORHOODS_BY_PARENT).flat();

export const NATIONAL_TERRITORY_META = {
  sourceArtifact: "carte-national-territory-registry-v5-32634250993",
  sourceRun: 32634250993,
  cityCount: NATIONAL_TERRITORY_PLACES.length,
  boundaryCount: NATIONAL_TERRITORY_BOUNDARIES.features.length,
  neighborhoodCount: 10799,
  n2MappedNeighborhoodCount: mappedNeighborhoods.length,
  n2NeighborhoodParentGroupCount: Object.keys(NATIONAL_NEIGHBORHOODS_BY_PARENT).length,
  n2MappedNeighborhoodCenterCount: mappedNeighborhoods.filter((item) => item.center).length,
  neighborhoodGeometryPublicationCount: 0,
  geometrySource: "OpenStreetMap",
  geometryLicense: "ODbL-1.0",
  hcpYear: 2024,
  renderGeometrySimplificationToleranceDegrees: 0.005,
} as const;

const placeBySlug = new Map(NATIONAL_TERRITORY_PLACES.map((place) => [place.slug, place] as const));

export function getNationalTerritoryPlace(slug: string) {
  return placeBySlug.get(slug) ?? null;
}

export function getNationalNeighborhoodsForPlace(place: NationalTerritoryPlace) {
  return NATIONAL_NEIGHBORHOODS_BY_PARENT[parentKey(place.name)] ?? [];
}
