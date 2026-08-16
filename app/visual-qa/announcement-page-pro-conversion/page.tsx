import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import {
  buildPublicPropertyDetailV2,
  type PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L11 Pro & conversion",
  robots: { index: false, follow: false },
};

const NOW = "2026-08-16T00:00:00.000Z";

const listing: Listing = {
  id: "visual-qa-ann-l11-partner",
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
  description: "Fixture QA ANN-L11 non indexée pour certifier la matrice professionnelle et les CTA autorisés.",
  image_url: "",
  reliability_explanation: "Fixture QA interne.",
  source_name: "Agence Atlas QA",
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
  allowed_ctas: ["visit", "whatsapp", "phone", "view_original", "compare"],
  can_show_contact: true,
  can_show_gallery: false,
  can_show_thumbnail: false,
  production_allowed: false,
};

function buildQaDetail(): PublicPropertyDetailV2 {
  const value = buildPublicPropertyDetailV2(listing, {
    source_name: "Agence Atlas QA",
    observed_at: NOW,
    created_at: "2026-08-01T00:00:00.000Z",
    generated_at: NOW,
  });
  if (!value) throw new Error("ANN-L11 QA fixture must remain publishable.");
  return value;
}

const detail = buildQaDetail();

export default function AnnouncementPageProConversionQa() {
  return <AnnouncementPageShell listing={listing} detail={detail} visualQa />;
}
