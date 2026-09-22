import { GEO_NEIGHBORHOODS } from "@/lib/geo/geo-entity-registry";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_CANDIDATES } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";

export type CasablancaTargetNeighborhoodReadiness =
  | "VERIFIED_PRODUCT_IDENTITY_NO_BOUNDARY"
  | "SHADOW_ADMIN_REFERENCE_ONLY"
  | "HOLD_NO_PRODUCT_BOUNDARY";

export type CasablancaTargetNeighborhood = {
  slug: string;
  canonicalName: string;
  targetVisible: boolean;
  canonicalNeighborhoodId: string | null;
  readiness: CasablancaTargetNeighborhoodReadiness;
  adminReference: {
    sourceEntityId: number;
    sourceAdminLevel: string;
    publicationStatus: "shadow";
  } | null;
  geometryPublicationAllowed: false;
  reason: string;
};

const TARGET_CITY_NEIGHBORHOODS = [
  { slug: "maarif", canonicalName: "Maârif" },
  { slug: "racine", canonicalName: "Racine" },
  { slug: "bourgogne", canonicalName: "Bourgogne" },
  { slug: "ain-diab", canonicalName: "Aïn Diab" },
  { slug: "hay-hassani", canonicalName: "Hay Hassani" },
  { slug: "sidi-maarouf", canonicalName: "Sidi Maârouf" },
  { slug: "finance-city", canonicalName: "Casablanca Finance City" },
  { slug: "californie", canonicalName: "Californie" },
] as const;

export const CASABLANCA_TARGET_NEIGHBORHOOD_READINESS: readonly CasablancaTargetNeighborhood[] =
  TARGET_CITY_NEIGHBORHOODS.map((target) => {
    const canonical = GEO_NEIGHBORHOODS.find(
      (neighborhood) => neighborhood.city_slug === "casablanca" && neighborhood.slug === target.slug,
    ) ?? null;
    const adminReference = CASABLANCA_NEIGHBORHOOD_GEOMETRY_CANDIDATES.find(
      (candidate) =>
        candidate.cityCanonicalId === "casablanca" &&
        candidate.neighborhoodCanonicalId === target.slug,
    ) ?? null;

    if (adminReference) {
      return {
        slug: target.slug,
        canonicalName: target.canonicalName,
        targetVisible: true,
        canonicalNeighborhoodId: canonical?.id ?? null,
        readiness: "SHADOW_ADMIN_REFERENCE_ONLY" as const,
        adminReference: {
          sourceEntityId: adminReference.sourceEntityId,
          sourceAdminLevel: adminReference.sourceAdminLevel,
          publicationStatus: adminReference.publicationStatus,
        },
        geometryPublicationAllowed: false as const,
        reason:
          "An OSM administrative reference exists, but administrative scope is not automatically equivalent to the modern real-estate product neighborhood.",
      };
    }

    if (canonical) {
      return {
        slug: target.slug,
        canonicalName: target.canonicalName,
        targetVisible: true,
        canonicalNeighborhoodId: canonical.id,
        readiness: "VERIFIED_PRODUCT_IDENTITY_NO_BOUNDARY" as const,
        adminReference: null,
        geometryPublicationAllowed: false as const,
        reason:
          "Canonical product identity exists, but no independently certified product boundary is registered.",
      };
    }

    return {
      slug: target.slug,
      canonicalName: target.canonicalName,
      targetVisible: true,
      canonicalNeighborhoodId: null,
      readiness: "HOLD_NO_PRODUCT_BOUNDARY" as const,
      adminReference: null,
      geometryPublicationAllowed: false as const,
      reason:
        "The TARGET label is not yet a canonical Casablanca neighborhood with a certified product boundary.",
    };
  });

export const CASABLANCA_TARGET_NEIGHBORHOOD_READINESS_SUMMARY = {
  targetNeighborhoodCount: CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.length,
  canonicalIdentityCount: CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.filter(
    (item) => item.canonicalNeighborhoodId,
  ).length,
  shadowAdminReferenceCount: CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.filter(
    (item) => item.readiness === "SHADOW_ADMIN_REFERENCE_ONLY",
  ).length,
  holdNoProductBoundaryCount: CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.filter(
    (item) => item.readiness === "HOLD_NO_PRODUCT_BOUNDARY",
  ).length,
  publishedProductBoundaryCount: 0,
} as const;

export function casablancaTargetReadinessChangesRanking(): false {
  return false;
}
