import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { StreetRealityModel } from "@/lib/geo/street-reality";
import type { Listing } from "@/lib/listings/types";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L7 Street Reality",
  robots: { index: false, follow: false },
};

type QaState = "exact" | "context" | "fallback" | "hidden";

function normalizeState(value: string | string[] | undefined): QaState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "context" || first === "fallback" || first === "hidden") return first;
  return "exact";
}

function listing(state: QaState): Listing {
  return {
    id: `visual-qa-ann-l7-${state}`,
    title: "Appartement QA Street Reality à Agdal",
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
    freshness_label: "Fixture QA",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 92,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Fixture interne noindex pour certifier ANN-L7. Elle ne représente aucune annonce réelle.",
    image_url: "",
    reliability_explanation: "Fixture QA interne.",
    source_name: "AkarFinder",
    seller_name: "AkarFinder QA",
    rooms_count: 5,
    built_surface_m2: 132,
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
    latitude: state === "hidden" ? null : 33.9908,
    longitude: state === "hidden" ? null : -6.8481,
    geo_precision: state === "context" ? "neighborhood_centroid" : state === "hidden" ? undefined : "exact",
    geo_source: state === "context" ? "neighborhood_centroid" : state === "hidden" ? undefined : "manual_import",
    geo_label: state === "context" ? "Contexte quartier QA" : state === "hidden" ? undefined : "Coordonnées exactes QA",
  };
}

function model(state: QaState): StreetRealityModel {
  if (state === "hidden") {
    return {
      visibility: "hidden",
      referenceKind: null,
      referenceLabel: null,
      providerId: null,
      attribution: null,
      observedAt: null,
      maxDistanceMeters: null,
      assets: [],
    };
  }

  const context = state === "context";
  const fallback = state === "fallback";
  return {
    visibility: context ? "context" : "full",
    referenceKind: context ? "neighborhood" : "property",
    referenceLabel: context ? "Vue de rue à proximité — Agdal" : "Vue de rue à proximité du bien",
    providerId: "mapillary",
    attribution: "Mapillary",
    observedAt: "2026-08-16T12:00:00.000Z",
    maxDistanceMeters: context ? 600 : 250,
    assets: [
      {
        id: `qa-street-${state}-1`,
        coordinate: { latitude: 33.9909, longitude: -6.8480 },
        distanceMeters: context ? 210 : 18,
        capturedAt: "2026-07-01T10:00:00.000Z",
        thumbnailUrl: fallback ? null : "/visual-qa/announcement-page-street-reality/street-thumb",
        viewerUrl: "https://www.mapillary.com/app/?pKey=qa-street-1",
        creatorUsername: "qa_mapper_one",
      },
      {
        id: `qa-street-${state}-2`,
        coordinate: { latitude: 33.9911, longitude: -6.8478 },
        distanceMeters: context ? 360 : 46,
        capturedAt: null,
        thumbnailUrl: "/visual-qa/announcement-page-street-reality/street-thumb",
        viewerUrl: "https://www.mapillary.com/app/?pKey=qa-street-2",
        creatorUsername: "qa_mapper_two",
      },
    ],
  };
}

export default async function AnnouncementPageStreetRealityVisualQa({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const state = normalizeState(params.state);
  const currentListing = listing(state);
  const detail = buildPublicPropertyDetailV2(currentListing, {
    source_name: "AkarFinder",
    observed_at: "2026-08-16T12:00:00.000Z",
    generated_at: "2026-08-16T12:00:00.000Z",
  });
  if (!detail) throw new Error("ANN-L7 QA fixture must remain publishable.");

  return (
    <AnnouncementPageShell
      listing={currentListing}
      detail={detail}
      streetReality={model(state)}
      visualQa
    />
  );
}
