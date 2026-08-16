import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L8 Marché & comparables",
  robots: { index: false, follow: false },
};

type QaState = "neighborhood" | "city" | "no-position" | "hidden";

function normalizeState(value: string | string[] | undefined): QaState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "city" || first === "no-position" || first === "hidden") return first;
  return "neighborhood";
}

function listing(state: QaState): Listing {
  return {
    id: `visual-qa-ann-l8-${state}`,
    title: "Appartement QA Marché & comparables à Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    price: state === "no-position" ? null : 2_200_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: state === "no-position" ? null : 22_000,
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
    description: "Fixture interne noindex pour certifier ANN-L8. Elle ne représente aucune annonce réelle.",
    image_url: "",
    reliability_explanation: "Fixture QA interne.",
    source_name: "AkarFinder",
    seller_name: "AkarFinder QA",
    rooms_count: 5,
    built_surface_m2: 100,
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

function comparable(index: number, scope: "neighborhood" | "city") {
  const prices = [1_850_000, 2_000_000, 2_150_000, 2_300_000];
  const surfaces = [92, 98, 104, 108];
  const price = prices[index]!;
  const surface = surfaces[index]!;
  return {
    listingId: `qa-comparable-${index + 1}`,
    propertyClusterId: `qa-cluster-${index + 1}`,
    scope,
    displayedPriceMad: price,
    surfaceM2: surface,
    pricePerM2: Math.round((price / surface) * 100) / 100,
    observedAt: `2026-08-0${index + 1}T09:00:00.000Z`,
    sourceCount: index === 1 ? 2 : 1,
    sourceAttribution: index === 1 ? ["Source QA A", "Source QA B"] : ["Source QA A"],
    surfaceDeltaRatio: Math.abs(surface - 100) / 100,
  };
}

function model(state: QaState): MarketComparableSet {
  if (state === "hidden") {
    return {
      status: "unavailable",
      reason: "insufficient_verified_sample",
      scope: null,
      observedAt: null,
      sampleCount: 2,
      distribution: null,
      comparables: [],
    };
  }

  const scope = state === "city" ? "city" : "neighborhood";
  const noPosition = state === "no-position";
  return {
    status: "certified",
    reason: "certified",
    scope,
    observedAt: "2026-08-04T09:00:00.000Z",
    sampleCount: 4,
    distribution: {
      sampleCount: 4,
      comparableStockCount: 4,
      minPricePerM2: 20_108.7,
      p25PricePerM2: 20_281.38,
      medianPricePerM2: 20_531.68,
      p75PricePerM2: 20_923.08,
      maxPricePerM2: 21_296.3,
      targetPricePerM2: noPosition ? null : 22_000,
      targetPosition: noPosition ? null : "above_distribution",
      targetGapToMedianPct: noPosition ? null : 7.15,
    },
    comparables: [0, 1, 2, 3].map((index) => comparable(index, scope)),
  };
}

export default async function AnnouncementPageMarketComparablesVisualQa({
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
  if (!detail) throw new Error("ANN-L8 QA fixture must remain publishable.");

  return (
    <AnnouncementPageShell
      listing={currentListing}
      detail={detail}
      marketComparables={model(state)}
      visualQa
    />
  );
}
