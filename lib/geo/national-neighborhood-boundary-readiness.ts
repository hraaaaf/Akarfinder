import { GEO_NEIGHBORHOODS } from "./geo-entity-registry";
import { CASABLANCA_TARGET_BOUNDARY_EVIDENCE } from "./casablanca-target-boundary-evidence";

export type NationalNeighborhoodBoundaryStatus =
  | "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY"
  | "OFFICIAL_IDENTITY_ONLY"
  | "IDENTITY_ONLY_PRODUCT_GEOGRAPHY"
  | "METRO_ATTACHMENT"
  | "HOLD_NO_PRODUCT_BOUNDARY"
  | "PUBLISHED_PRODUCT_BOUNDARY";

export type NationalNeighborhoodBoundaryReadiness = {
  districtId: string;
  citySlug: string;
  districtSlug: string;
  canonicalName: string;
  status: NationalNeighborhoodBoundaryStatus;
  publicationAllowed: boolean;
  geometryRole:
    | "PRODUCT_BOUNDARY"
    | "OFFICIAL_REFERENCE_ONLY"
    | "IDENTITY_ONLY"
    | "NONE";
  reason: string;
};

const casaEvidence = new Map(
  CASABLANCA_TARGET_BOUNDARY_EVIDENCE.map((entry) => [entry.slug, entry]),
);

export const NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS: readonly NationalNeighborhoodBoundaryReadiness[] =
  GEO_NEIGHBORHOODS.map((district) => {
    const casa = district.city_slug === "casablanca" ? casaEvidence.get(district.slug) : undefined;

    if (casa) {
      return {
        districtId: district.id,
        citySlug: district.city_slug,
        districtSlug: district.slug,
        canonicalName: district.canonical_name,
        status: casa.evidenceStatus === "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY"
          ? "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY" as const
          : "OFFICIAL_IDENTITY_ONLY" as const,
        publicationAllowed: false,
        geometryRole: casa.evidenceStatus === "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY"
          ? "OFFICIAL_REFERENCE_ONLY" as const
          : "IDENTITY_ONLY" as const,
        reason: casa.evidenceNote,
      };
    }

    if (district.id === "district_casablanca_bouskoura") {
      return {
        districtId: district.id,
        citySlug: district.city_slug,
        districtSlug: district.slug,
        canonicalName: district.canonical_name,
        status: "METRO_ATTACHMENT" as const,
        publicationAllowed: false,
        geometryRole: "IDENTITY_ONLY" as const,
        reason:
          "Bouskoura is an explicit Casablanca peri-urban product identity and canonical city polarity; no duplicate or synthetic product polygon is promoted.",
      };
    }

    return {
      districtId: district.id,
      citySlug: district.city_slug,
      districtSlug: district.slug,
      canonicalName: district.canonical_name,
      status: "IDENTITY_ONLY_PRODUCT_GEOGRAPHY" as const,
      publicationAllowed: false,
      geometryRole: "IDENTITY_ONLY" as const,
      reason:
        "Canonical product identity and verified map anchor exist, but no independently certified product-neighborhood polygon is registered. The verified landmark anchor is for positioning only and is not a boundary claim.",
    };
  });

export const NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY = {
  canonicalNeighborhoodCount: NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.length,
  explicitStatusCount: NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.length,
  publishedProductBoundaryCount: NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.filter(
    (entry) => entry.status === "PUBLISHED_PRODUCT_BOUNDARY" && entry.publicationAllowed,
  ).length,
  unpublishedCount: NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.filter(
    (entry) => !entry.publicationAllowed,
  ).length,
  syntheticBoundaryCount: 0,
} as const;

export function getNationalNeighborhoodBoundaryReadiness(districtId: string) {
  return NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.find((entry) => entry.districtId === districtId) ?? null;
}
