import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import {
  buildPublicPropertyDetailV2,
  type PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — Galerie média annonce",
  robots: { index: false, follow: false },
};

const QA_NOW = "2026-08-16T00:00:00.000Z";

type MediaState = "gallery" | "preview" | "forbidden" | "unknown" | "broken";

function normalizeState(value: string | string[] | undefined): MediaState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "preview" || first === "forbidden" || first === "unknown" || first === "broken") return first;
  return "gallery";
}

function createListing(state: MediaState): Listing {
  const base: Listing = {
    id: `visual-qa-announcement-media-${state}`,
    title: "Appartement contemporain avec terrasse à Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_450_000,
    currency: "DH",
    surface_m2: 132,
    price_per_m2: 18_560,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Observée récemment",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 92,
    reliability_available: true,
    is_mre_friendly: true,
    description: "Fixture QA interne dédiée au contrat média ANN-L2. Les images utilisées sont des assets de démonstration versionnés dans AkarFinder et ne représentent aucune annonce réelle.",
    image_url: "",
    reliability_explanation: "Fixture QA interne.",
    source_name: "AkarFinder",
    seller_name: "AkarFinder QA",
    rooms_count: 5,
    built_surface_m2: 132,
    condition: "Très bon état",
    orientation: "Sud-Ouest",
    terrace_m2: 24,
    garage_spaces: 1,
    has_equipped_kitchen: true,
    premium_features: ["Terrasse", "Garage"],
    listed_at_label: "01 août 2026",
    updated_at_label: "16 août 2026",
    image_fallback_type: "apartment",
    allowed_ctas: ["compare"],
    can_show_contact: false,
    can_show_thumbnail: false,
    production_allowed: false,
    image_source: "Assets de démonstration AkarFinder",
    image_permission_status: "allowed",
    source_access_level: "partner_full",
    can_show_gallery: true,
    main_image_url: "/demo/properties/apartment-modern.jpg",
    gallery_image_urls: [
      "/demo/properties/gallery/apartment-modern-salon.jpg",
      "/demo/properties/gallery/apartment-modern-balcon.jpg",
      "/demo/properties/gallery/apartment-modern-entree.jpg",
    ],
    images_count: 4,
  };

  if (state === "preview") {
    return {
      ...base,
      source_access_level: "preview_allowed",
      can_show_gallery: false,
      gallery_image_urls: ["/demo/properties/gallery/apartment-modern-salon.jpg"],
      images_count: 1,
    };
  }

  if (state === "forbidden" || state === "unknown") {
    return {
      ...base,
      image_permission_status: state,
      can_show_gallery: false,
      images_count: 0,
    };
  }

  if (state === "broken") {
    return {
      ...base,
      can_show_gallery: false,
      main_image_url: "/demo/properties/does-not-exist.jpg",
      gallery_image_urls: [],
      images_count: 1,
    };
  }

  return base;
}

function buildQaDetail(listing: Listing): PublicPropertyDetailV2 {
  const value = buildPublicPropertyDetailV2(listing, {
    source_name: "AkarFinder",
    observed_at: QA_NOW,
    created_at: "2026-08-01T00:00:00.000Z",
    generated_at: QA_NOW,
  });
  if (!value) throw new Error("ANN-L2 media QA fixture must remain publishable as first-party QA data.");
  return value;
}

export default async function AnnouncementPageMediaVisualQa({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const state = normalizeState(params.state);
  const listing = createListing(state);
  const detail = buildQaDetail(listing);
  return <AnnouncementPageShell listing={listing} detail={detail} visualQa />;
}
