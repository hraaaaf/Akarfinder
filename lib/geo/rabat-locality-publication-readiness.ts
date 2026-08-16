import { RABAT_ALL_PRODUCT_LOCALITIES } from "@/lib/geo/rabat-locality-registry";
import { getRabatLocalityGeometryDecision } from "@/lib/geo/rabat-locality-geometry-registry";

export type RabatPublicationBlocker =
  | "taxonomy_not_certified"
  | "geometry_not_certified"
  | "metrics_not_available"
  | "context_not_available";

export type RabatPublicationDecision = "legacy_covered" | "blocked" | "candidate_for_c8_activation";

export type RabatLocalityPublicationReadiness = {
  localityId: string;
  slug: string;
  taxonomyReady: boolean;
  geometryReady: boolean;
  metricsReady: boolean;
  contextReady: boolean;
  blockers: RabatPublicationBlocker[];
  coveredByC0C7MarketZone: boolean;
  decision: RabatPublicationDecision;
  c8NewPublicActivationEligible: boolean;
};

const C0_C7_MARKET_ZONE_LOCALITY_IDS = new Set([
  "district_rabat_agdal",
  "district_rabat_hay_riad",
  "district_rabat_hassan",
  "district_rabat_souissi",
]);

export const RABAT_C8D_PUBLICATION_READINESS: readonly RabatLocalityPublicationReadiness[] =
  RABAT_ALL_PRODUCT_LOCALITIES.map((locality) => {
    const taxonomyReady = locality.taxonomy_status === "certified";
    const geometryReady = getRabatLocalityGeometryDecision(locality.id).status === "certified";
    const metricsReady = locality.metrics_availability === "legacy_c3_available";
    const contextReady = locality.context_availability === "first_party_available";
    const coveredByC0C7MarketZone = C0_C7_MARKET_ZONE_LOCALITY_IDS.has(locality.id);
    const blockers: RabatPublicationBlocker[] = [];

    if (!taxonomyReady) blockers.push("taxonomy_not_certified");
    if (!geometryReady) blockers.push("geometry_not_certified");
    if (!metricsReady) blockers.push("metrics_not_available");
    if (!contextReady) blockers.push("context_not_available");

    const decision: RabatPublicationDecision = blockers.length
      ? "blocked"
      : coveredByC0C7MarketZone
        ? "legacy_covered"
        : "candidate_for_c8_activation";

    return {
      localityId: locality.id,
      slug: locality.slug,
      taxonomyReady,
      geometryReady,
      metricsReady,
      contextReady,
      blockers,
      coveredByC0C7MarketZone,
      decision,
      c8NewPublicActivationEligible: decision === "candidate_for_c8_activation",
    };
  });

export function getRabatC8DPublicationReadiness(localityId: string): RabatLocalityPublicationReadiness | null {
  return RABAT_C8D_PUBLICATION_READINESS.find((entry) => entry.localityId === localityId) ?? null;
}

export function listRabatC8DNewActivationCandidates(): RabatLocalityPublicationReadiness[] {
  return RABAT_C8D_PUBLICATION_READINESS.filter((entry) => entry.c8NewPublicActivationEligible);
}
