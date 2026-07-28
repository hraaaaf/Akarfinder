import type {
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
    "No geometry is published until source identity, licence, canonical district mapping and topology review pass.",
    "A missing geometry remains missing; the registry must never synthesize or approximate neighborhood borders.",
    "Any public produced work must surface the required attribution.",
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

/**
 * Audited source references for Casablanca's 16 arrondissements.
 * These records are deliberately reference-only: they are not renderable geometry.
 */
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

/**
 * Renderable registry stays empty until relation geometry is materialized,
 * topology-validated and manually reviewed. No synthetic fallback is allowed.
 */
export const CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW: readonly NeighborhoodGeometryRecord[] = [];

export function listCasablancaShadowGeometryCandidates(): readonly NeighborhoodGeometryCandidateRecord[] {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_CANDIDATES;
}

export function listCasablancaShadowGeometries(): readonly NeighborhoodGeometryRecord[] {
  return CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW;
}
