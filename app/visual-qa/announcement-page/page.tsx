import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — Page annonce ultra premium",
  robots: { index: false, follow: false },
};

const QA_NOW = "2026-08-16T00:00:00.000Z";

const listing: Listing = {
  id: "visual-qa-announcement-page",
  title: "Villa contemporaine avec jardin à Anfa Supérieur",
  city: "Casablanca",
  neighborhood: "Anfa Supérieur",
  price: 6_250_000,
  currency: "DH",
  surface_m2: 450,
  price_per_m2: 13_889,
  property_type: "Villa",
  transaction_type: "buy",
  bedrooms: 5,
  bathrooms: 4,
  freshness_label: "Observée récemment",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 92,
  reliability_available: true,
  is_mre_friendly: true,
  description:
    "Fixture QA stable destinée à vérifier la hiérarchie, les espacements et les états riches de la future page annonce. Elle n’est jamais indexée ni présentée comme une annonce réelle.",
  image_url: "",
  reliability_explanation: "Fixture QA interne.",
  source_name: "AkarFinder",
  seller_name: "AkarFinder QA",
  rooms_count: 7,
  built_surface_m2: 450,
  plot_surface_m2: 680,
  condition: "Très bon état",
  property_age_range: "Récent",
  orientation: "Sud-Ouest",
  floors_count: 2,
  garden_m2: 140,
  terrace_m2: 45,
  garage_spaces: 2,
  has_pool: true,
  has_concierge: true,
  has_equipped_kitchen: true,
  has_moroccan_living_room: true,
  has_european_living_room: true,
  premium_features: ["Piscine", "Jardin", "Terrasse"],
  listed_at_label: "01 août 2026",
  updated_at_label: "16 août 2026",
  latitude: 33.5908,
  longitude: -7.6552,
  geo_precision: "exact",
  geo_source: "manual_import",
  geo_label: "Coordonnées QA exactes",
  image_permission_status: "unknown",
  source_access_level: "partner_full",
  image_fallback_type: "villa",
  allowed_ctas: ["compare"],
  can_show_gallery: false,
  can_show_contact: false,
  can_show_thumbnail: false,
  production_allowed: false,
};

const detail = buildPublicPropertyDetailV2(listing, {
  source_name: "AkarFinder",
  observed_at: QA_NOW,
  created_at: "2026-08-01T00:00:00.000Z",
  generated_at: QA_NOW,
});

if (!detail) {
  throw new Error("Announcement page visual QA fixture must remain publishable as first-party QA data.");
}

export default function AnnouncementPageVisualQa() {
  return <AnnouncementPageShell listing={listing} detail={detail} visualQa />;
}
