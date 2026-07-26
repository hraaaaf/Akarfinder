import type { Listing } from "@/lib/listings/types";
import { buildAkarInfoPassportForListing } from "@/lib/akarinfo/akarinfo-passport";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";
import { hasCertifiedExactCoordinates } from "@/lib/ux/certified-property-map";

export type PropertyPassportModel = {
  propertyId: string;
  identityLabel: "Propriété rapprochée" | "Représentation unique";
  informationLevel: string;
  sourceType: string;
  sourceName: string | null;
  sourceActionLabel: string;
  locationLabel: string;
  geoLabel: "Coordonnées exactes certifiées" | "Localisation déclarative";
  qualityItems: Array<{ label: string; value: string }>;
  pointsToVerify: string[];
  summary: string;
  unavailableEvidence: string[];
};

function percent(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)} %`;
}

export function buildPropertyPassportModel(listing: Listing): PropertyPassportModel {
  const akarInfo = buildAkarInfoPassportForListing(listing);
  const completeness = percent(listing.data_completeness_score);
  const reliability = listing.reliability_available === false
    ? null
    : percent(listing.reliability_score);
  const qualityItems: Array<{ label: string; value: string }> = [];

  if (completeness) qualityItems.push({ label: "Complétude des informations", value: completeness });
  if (reliability) qualityItems.push({ label: "Fiabilité disponible", value: reliability });
  if (listing.freshness_label) qualityItems.push({ label: "Fraîcheur", value: listing.freshness_label });
  if (listing.display_policy_reason) qualityItems.push({ label: "Politique d’affichage", value: listing.display_policy_reason });

  return {
    propertyId: getCanonicalPropertyId(listing),
    identityLabel: listing.duplicate_group_id?.trim() ? "Propriété rapprochée" : "Représentation unique",
    informationLevel: akarInfo.information_level_label,
    sourceType: akarInfo.source_type_label,
    sourceName: listing.source_name?.trim() || null,
    sourceActionLabel: akarInfo.source_original_label,
    locationLabel: listing.neighborhood
      ? `${listing.city}, ${listing.neighborhood}`
      : listing.district
        ? `${listing.city}, ${listing.district}`
        : listing.city,
    geoLabel: hasCertifiedExactCoordinates(listing)
      ? "Coordonnées exactes certifiées"
      : "Localisation déclarative",
    qualityItems,
    pointsToVerify: akarInfo.points_to_verify,
    summary: akarInfo.summary,
    unavailableEvidence: [
      "Historique de prix certifié",
      "Chronologie multi-source certifiée",
      "Nombre total de représentations vérifiées",
    ],
  };
}
