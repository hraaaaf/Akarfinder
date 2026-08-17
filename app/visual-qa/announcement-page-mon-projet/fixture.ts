import type { Listing } from "@/lib/listings/types";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const ANN_L12_QA_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-08-17T10:00:00.000Z";

export const annL12QaListing: Listing = {
  id: "visual-qa-ann-l12-project",
  title: "Appartement premium partenaire à Agdal",
  city: "Rabat",
  neighborhood: "Agdal",
  price: 2_350_000,
  currency: "DH",
  surface_m2: 138,
  price_per_m2: 17_029,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Observée récemment",
  source_type: "Agence",
  reliability_label: "Informations complètes",
  reliability_score: 94,
  reliability_available: true,
  is_mre_friendly: true,
  description: "Fixture QA ANN-L12 non indexée pour certifier Mon Projet personnalisé sur la vraie fiche AkarFinder.",
  image_url: "",
  reliability_explanation: "Fixture QA interne.",
  source_name: "AkarFinder",
  seller_name: "Agence Atlas QA",
  listing_url: "https://example.com/annonce-qa",
  whatsapp: "+212600000000",
  image_permission_status: "unknown",
  source_access_level: "partner_full",
  image_fallback_type: "apartment",
  partner_type: "agency",
  partner_tier: "agency_premium",
  organization_type: "agency",
  commercial_tier: "gold",
  partner_activation_status: "active",
  source_authorization_status: "confirmed",
  partner_validation_status: "validated",
  source_badge: "premium_partner",
  source_attribution_label: "Agence partenaire QA",
  allowed_ctas: ["visit", "whatsapp", "view_original", "compare"],
  can_show_contact: true,
  can_show_gallery: false,
  can_show_thumbnail: false,
  production_allowed: false,
  latitude: 34.0012,
  longitude: -6.8492,
  geo_precision: "exact",
  geo_source: "manual_import",
  garage_spaces: 1,
};

export const annL12QaDetail = (() => {
  const detail = buildPublicPropertyDetailV2(annL12QaListing, {
    source_name: "AkarFinder",
    observed_at: NOW,
    created_at: "2026-08-01T00:00:00.000Z",
    generated_at: NOW,
  });
  if (!detail) throw new Error("ANN-L12 QA fixture must remain publishable.");
  return detail;
})();

export const annL13QaMarketComparables: MarketComparableSet = {
  status: "certified",
  reason: "certified",
  scope: "neighborhood",
  observedAt: "2026-08-04T09:00:00.000Z",
  sampleCount: 4,
  distribution: {
    sampleCount: 4,
    comparableStockCount: 4,
    minPricePerM2: 15_900,
    p25PricePerM2: 16_250,
    medianPricePerM2: 16_800,
    p75PricePerM2: 17_150,
    maxPricePerM2: 17_700,
    targetPricePerM2: 17_029,
    targetPosition: "within_distribution",
    targetGapToMedianPct: 1.36,
  },
  comparables: [
    { listingId: "qa-l13-c1", propertyClusterId: "qa-l13-cluster-1", scope: "neighborhood", displayedPriceMad: 2_180_000, surfaceM2: 136, pricePerM2: 16_029.41, observedAt: "2026-08-01T09:00:00.000Z", sourceCount: 1, sourceAttribution: ["Source QA A"], surfaceDeltaRatio: 0.0145 },
    { listingId: "qa-l13-c2", propertyClusterId: "qa-l13-cluster-2", scope: "neighborhood", displayedPriceMad: 2_290_000, surfaceM2: 137, pricePerM2: 16_715.33, observedAt: "2026-08-02T09:00:00.000Z", sourceCount: 2, sourceAttribution: ["Source QA A", "Source QA B"], surfaceDeltaRatio: 0.0072 },
    { listingId: "qa-l13-c3", propertyClusterId: "qa-l13-cluster-3", scope: "neighborhood", displayedPriceMad: 2_340_000, surfaceM2: 139, pricePerM2: 16_834.53, observedAt: "2026-08-03T09:00:00.000Z", sourceCount: 1, sourceAttribution: ["Source QA A"], surfaceDeltaRatio: 0.0072 },
    { listingId: "qa-l13-c4", propertyClusterId: "qa-l13-cluster-4", scope: "neighborhood", displayedPriceMad: 2_420_000, surfaceM2: 140, pricePerM2: 17_285.71, observedAt: "2026-08-04T09:00:00.000Z", sourceCount: 1, sourceAttribution: ["Source QA A"], surfaceDeltaRatio: 0.0145 },
  ],
};
