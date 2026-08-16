import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import type { AkarEstimateHistoryRuntime } from "@/lib/property-detail/akar-estimate-history-runtime";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L9 Historique prix",
  robots: { index: false, follow: false },
};

type QaState = "history" | "single" | "hidden";

function normalizeState(value: string | string[] | undefined): QaState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "single" || first === "hidden") return first;
  return "history";
}

function listing(state: QaState): Listing {
  return {
    id: `visual-qa-ann-l9-${state}`,
    title: "Appartement QA Historique prix à Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 1_200_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 12_000,
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
    description: "Fixture interne noindex pour certifier ANN-L9. Elle ne représente aucune annonce réelle.",
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

function runtime(state: QaState): AkarEstimateHistoryRuntime {
  if (state === "hidden") {
    return {
      history: {
        status: "unavailable",
        points: [],
        observationCount: 0,
        firstObservedAt: null,
        lastObservedAt: null,
      },
      estimate: null,
    };
  }

  const points = state === "single"
    ? [
        { observedAt: "2026-08-01T09:00:00.000Z", displayedPriceMad: 1_200_000, sourceOfferId: 10, sourceName: "Source QA A" },
      ]
    : [
        { observedAt: "2026-06-01T09:00:00.000Z", displayedPriceMad: 1_300_000, sourceOfferId: 10, sourceName: "Source QA A" },
        { observedAt: "2026-07-01T09:00:00.000Z", displayedPriceMad: 1_250_000, sourceOfferId: 10, sourceName: "Source QA A" },
        { observedAt: "2026-08-01T09:00:00.000Z", displayedPriceMad: 1_200_000, sourceOfferId: 20, sourceName: "Source QA B" },
      ];

  return {
    history: {
      status: "available",
      points,
      observationCount: points.length,
      firstObservedAt: points[0]?.observedAt ?? null,
      lastObservedAt: points.at(-1)?.observedAt ?? null,
    },
    estimate: null,
  };
}

export default async function AnnouncementPageAkarEstimateHistoryVisualQa({
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
  if (!detail) throw new Error("ANN-L9 QA fixture must remain publishable.");

  return (
    <AnnouncementPageShell
      listing={currentListing}
      detail={detail}
      akarEstimateHistory={runtime(state)}
      visualQa
    />
  );
}
