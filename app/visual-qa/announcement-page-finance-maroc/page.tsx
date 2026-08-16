import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L10 Finance Maroc",
  robots: { index: false, follow: false },
};

function listing(): Listing {
  return {
    id: "visual-qa-ann-l10",
    title: "Appartement QA Finance Maroc à Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_000_000,
    currency: "DH",
    surface_m2: 120,
    price_per_m2: 16_666.67,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Fixture QA",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 92,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Fixture interne noindex pour certifier ANN-L10. Elle ne représente aucune annonce réelle.",
    image_url: "",
    reliability_explanation: "Fixture QA interne.",
    source_name: "AkarFinder",
    seller_name: "AkarFinder QA",
    rooms_count: 5,
    built_surface_m2: 120,
    image_fallback_type: "apartment",
    image_source: "Asset de démonstration AkarFinder",
    image_permission_status: "allowed",
    source_access_level: "preview_allowed",
    main_image_url: "/demo/properties/apartment-modern.jpg",
    gallery_image_urls: [],
    allowed_ctas: ["compare"],
    can_show_contact: false,
    can_show_thumbnail: false,
    can_show_gallery: false,
    production_allowed: false,
  };
}

export default function FinanceMarocVisualQa() {
  const currentListing = listing();
  const detail = buildPublicPropertyDetailV2(currentListing, {
    source_name: "AkarFinder",
    observed_at: "2026-08-16T12:00:00.000Z",
    generated_at: "2026-08-16T12:00:00.000Z",
  });
  if (!detail) throw new Error("ANN-L10 QA fixture must remain publishable.");

  return <AnnouncementPageShell listing={currentListing} detail={detail} visualQa />;
}
