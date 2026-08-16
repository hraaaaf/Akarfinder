import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import {
  buildPublicPropertyDetailV2,
  type PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L11 source only",
  robots: { index: false, follow: false },
};

const listing: Listing = {
  id: "visual-qa-ann-l11-source-only",
  title: "Appartement indexé sans contact direct",
  city: "Rabat",
  neighborhood: "Hassan",
  price: 1_850_000,
  currency: "DH",
  surface_m2: 112,
  price_per_m2: 16_518,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 2,
  bathrooms: 2,
  freshness_label: "Observée récemment",
  source_type: "Source analysée",
  reliability_label: "Infos limitées",
  reliability_score: 82,
  reliability_available: true,
  is_mre_friendly: false,
  description: "Fixture QA sans autorisation de contact direct.",
  image_url: "",
  reliability_explanation: "Fixture QA interne.",
  source_name: "AkarFinder",
  seller_name: "Source publique QA",
  listing_url: "https://example.com/source-only",
  whatsapp: "+212611111111",
  source_access_level: "indexed_only",
  allowed_ctas: ["view_original", "view_source", "compare"],
  can_show_contact: false,
  image_permission_status: "unknown",
  image_fallback_type: "apartment",
  source_attribution_label: "Source publique indexée QA",
  production_allowed: false,
};

function detail(): PublicPropertyDetailV2 {
  const value = buildPublicPropertyDetailV2(listing, {
    source_name: "AkarFinder",
    observed_at: "2026-08-16T00:00:00.000Z",
    generated_at: "2026-08-16T00:00:00.000Z",
  });
  if (!value) throw new Error("ANN-L11 source-only fixture must remain publishable.");
  return value;
}

export default function AnnouncementPageProConversionSourceOnlyQa() {
  return <AnnouncementPageShell listing={listing} detail={detail()} visualQa />;
}
