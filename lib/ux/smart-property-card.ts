import type { Listing } from "@/lib/listings/types";

export type SmartPropertyCardModel = {
  title: string;
  locationLabel: string;
  price: number | null;
  pricePerM2: number | null;
  facts: string[];
  freshnessLabel: string;
  sourceLabel: string;
  canonicalStatus: "certified_group" | "single_representation";
  canonicalLabel: string;
  marketClaim: null;
  sourceCount: null;
  priceHistory: null;
};

function positiveInteger(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

export function buildSmartPropertyCardModel(listing: Listing): SmartPropertyCardModel {
  const facts: string[] = [];
  const surface = positiveInteger(listing.surface_m2);
  const bedrooms = positiveInteger(listing.bedrooms);
  const bathrooms = positiveInteger(listing.bathrooms);

  // UX-PREMIUM-CARD-LAYOUT-SPECS-D — canonical scan order: bedrooms, bathrooms, surface.
  if (bedrooms != null) facts.push(`\u{1F6CF}\uFE0E ${bedrooms} ch.`);
  if (bathrooms != null) facts.push(`\u{1F6C1}\uFE0E ${bathrooms} sdb`);
  if (surface != null) facts.push(`\u2194 ${surface.toLocaleString("fr-MA")} m²`);

  const hasCertifiedGroup = Boolean(listing.duplicate_group_id?.trim());

  return {
    title: listing.title,
    locationLabel: listing.neighborhood?.trim()
      ? `${listing.city}, ${listing.neighborhood}`
      : listing.city,
    price: listing.price,
    pricePerM2:
      typeof listing.price_per_m2 === "number" && listing.price_per_m2 > 0
        ? listing.price_per_m2
        : null,
    facts,
    freshnessLabel: listing.freshness_label,
    sourceLabel:
      listing.source_attribution_label?.trim() ||
      listing.source_name?.trim() ||
      "Source non précisée",
    canonicalStatus: hasCertifiedGroup
      ? "certified_group"
      : "single_representation",
    canonicalLabel: hasCertifiedGroup
      ? "Représentation rapprochée d’un bien potentiel"
      : "Représentation individuelle",
    // These fields stay explicitly unavailable until certified DATA is supplied.
    marketClaim: null,
    sourceCount: null,
    priceHistory: null,
  };
}

export function smartCardInventsMarketEvidence(model: SmartPropertyCardModel): false {
  void model;
  return false;
}
