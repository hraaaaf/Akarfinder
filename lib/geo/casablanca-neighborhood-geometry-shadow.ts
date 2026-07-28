import casablancaGeometryCollection from "@/data/geo/casablanca-arrondissements-osm.json";
import type {
  NeighborhoodGeometry,
  NeighborhoodGeometryCandidateRecord,
  NeighborhoodGeometryRecord,
} from "@/lib/geo/neighborhood-geometry-registry";

export const CASABLANCA_GEOMETRY_SOURCE_POLICY = {
  provider: "OpenStreetMap contributors",
  dataset: "OpenStreetMap database",
  licenseId: "ODbL-1.0",
  licenseUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© OpenStreetMap contributors",
  usageMode: "shadow-only",
  notes: [
    "All 16 arrondissement geometries are materialized from explicit OSM relations and topology-audited before use.",
    "Public rendering remains disabled unless the dedicated server-side geometry canary is explicitly enabled.",
    "Any produced work must surface the required OpenStreetMap attribution.",
  ],
} as const;

const RETRIEVED_AT = "2026-07-28T00:00:00.000Z";

function candidate(
  sourceEntityId: number,
  neighborhoodCanonicalId: string,
  displayName: string,
  aliases: readonly string[] = [],
): NeighborhoodGeometryCandidateRecord {
  return {
    version: "v1",
    cityCanonicalId: "casablanca",
    neighborhoodCanonicalId,
    displayName,
    aliases,
    sourceEntityType: "osm_relation",
    sourceEntityId,
    sourceAdminLevel: "10",
    source: {
      provider: CASABLANCA_GEOMETRY_SOURCE_POLICY.provider,
      dataset: CASABLANCA_GEOMETRY_SOURCE_POLICY.dataset,
      sourceUrl: `https://www.openstreetmap.org/relation/${sourceEntityId}`,
      licenseId: CASABLANCA_GEOMETRY_SOURCE_POLICY.licenseId,
      licenseUrl: CASABLANCA_GEOMETRY_SOURCE_POLICY.licenseUrl,
      attribution: CASABLANCA_GEOMETRY_SOURCE_POLICY.attribution,
      retrievedAt: RETRIEVED_AT,
    },
    geometryStatus: "reference_only",
    publicationStatus: "shadow",
    reviewed: false,
  };
}

export const CASABLANCA_NEIGHBORHOOD_GEOMETRY_CANDIDATES: readonly NeighborhoodGeometryCandidateRecord[] = [
  candidate(2801287, "anfa", "Anfa", ["آنفا"]),
  candidate(2801474, "maarif", "Maârif", ["Maarif", "المعاريف"]),
  candidate(4743250, "sidi-belyout", "Sidi Belyout", ["سيدي بليوط"]),
  candidate(2801343, "hay-hassani", "Hay Hassani", ["حي الحسني"]),
  candidate(2801442, "ain-chock", "Aïn Chock", ["Ain Chock", "عين الشق"]),
  candidate(2801452, "al-fida", "Al Fida", ["الفداء"]),
  candidate(2801453, "mers-sultan", "Mers Sultan", ["مرس السلطان"]),
  candidate(2801460, "ain-sebaa", "Aïn Sebaa", ["Ain Sebaa", "عين السبع"]),
  candidate(2801458, "hay-mohammadi", "Hay Mohammadi", ["الحي المحمدي"]),
  candidate(2801457, "roches-noires", "Roches Noires", ["Essoukhour Assawda", "الصخور السوداء"]),
  candidate(2801461, "sidi-bernoussi", "Sidi Bernoussi", ["سيدي البرنوصي"]),
  candidate(2801372, "sidi-moumen", "Sidi Moumen", ["سيدي مومن"]),
  candidate(2801402, "moulay-rachid", "Moulay Rachid", ["مولاي رشيد"]),
  candidate(2801406, "sidi-othmane", "Sidi Othmane", ["سيدي عثمان"]),
  candidate(2801410, "ben-msick", "Ben M'sick", ["Ben Msick", "بن مسيك"]),
  candidate(2801415, "sbata", "Sbata", ["سباتة"]),
];

type MaterializedFeature = {
  properties: {
    cityCanonicalId: string;
    neighborhoodCanonicalId: string;
    displayName: string;
    aliases: string[];
    sourceEntityId: number;
    sourceUrl: string;
    licenseId: string;
    licenseUrl: string;
    attribution: string;
    retrievedAt: string;
  };
  geometry: NeighborhoodGeometry;
};

const MATERIALIZED_FEATURES = (casablancaGeometryCollection as unknown as { features: MaterializedFeature[] }).features;

export const CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW: readonly NeighborhoodGeometryRecord[] = MATERIALIZED_FEATURES.map(
  (feature) => ({
    version: "v1",
    cityCanonicalId: feature.properties.cityCanonicalId,
    neighborhoodCanonicalId: feature.properties.neighborhoodCanonicalId,
    displayName: feature.properties.displayName,
    aliases: feature.properties.aliases,
    geometry: feature.geometry,
    source: {
      provider: CASABLANCA_GEOMETRY_SOURCE_POLICY.provider,
      dataset: CASABLANCA_GEOMETRY_SOURCE_POLICY.dataset,
      sourceUrl: feature.properties.sourceUrl,
      licenseId: feature.properties.licenseId,
      licenseUrl: feature.properties.licenseUrl,
      attribution: feature.properties.attribution,
      retrievedAt: feature.properties.retrievedAt,
    },
    publicationStatus: "shadow",
    reviewed: false,
  }),
);

export function listCasablancaShadowGeometryCandidates(): readonly NeighborhoodGeometryCandidateRecord[] {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_CANDIDATES;
}

export function listCasablancaShadowGeometries(): readonly NeighborhoodGeometryRecord[] {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW;
}

export function casablancaShadowGeometryIsComplete(): boolean {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.length === 16;
}
