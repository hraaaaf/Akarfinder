import type { Listing } from "@/lib/listings/types";
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
