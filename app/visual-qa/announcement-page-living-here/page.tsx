import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import { buildConvergedLivingHereForListing } from "@/lib/geo/living-here-converged-service";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { Listing } from "@/lib/listings/types";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L6 Vivre ici",
  robots: { index: false, follow: false },
};

type QaState = "exact" | "context" | "no-route" | "hidden";

const L5_QA_NOW = new Date("2026-08-26T12:00:00.000Z");

function normalizeState(value: string | string[] | undefined): QaState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "context" || first === "no-route" || first === "hidden") return first;
  return "exact";
}

function listing(state: QaState): Listing {
  return {
    id: `visual-qa-ann-l6-${state}`,
    title: "Appartement QA Vivre ici à Agdal",
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
    description: "Fixture interne noindex pour certifier ANN-L6. Elle ne représente aucune annonce réelle.",
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

const qaEvidence = {
  providerId: "qa-provider",
  attribution: "Fixture QA interne",
  observedAt: "2026-08-16T12:00:00.000Z",
};

function model(state: QaState): LivingHereModel {
  if (state === "hidden") {
    return {
      version: "1.0",
      listingId: "visual-qa-ann-l6-hidden",
      visibility: "hidden",
      reason: "geo_unavailable",
      origin: { coordinate: null, displayMode: "hidden", exact: false },
      canShowPreciseRouteTimes: false,
      pois: [],
      isochrones: [],
      attribution: [],
    };
  }

  const exact = state !== "context";
  const withRoutes = state === "exact";
  const pois: LivingHereModel["pois"] = [
    {
      id: "qa-school",
      name: "École QA Agdal",
      category: "education",
      categoryLabel: "Écoles & crèches",
      coordinate: { latitude: 33.9912, longitude: -6.8468 },
      confidence: "provider_verified",
      providerId: qaEvidence.providerId,
      attribution: qaEvidence.attribution,
      observedAt: qaEvidence.observedAt,
      routes: withRoutes ? [
        { mode: "walking", distanceMeters: 540, durationSeconds: 420, providerId: "qa-routing", attribution: qaEvidence.attribution, observedAt: qaEvidence.observedAt },
        { mode: "driving", distanceMeters: 760, durationSeconds: 180, providerId: "qa-routing", attribution: qaEvidence.attribution, observedAt: qaEvidence.observedAt },
      ] : [],
    },
    {
      id: "qa-pharmacy",
      name: "Pharmacie QA Ibn Sina",
      category: "health",
      categoryLabel: "Santé",
      coordinate: { latitude: 33.9897, longitude: -6.8491 },
      confidence: "provider_verified",
      providerId: qaEvidence.providerId,
      attribution: qaEvidence.attribution,
      observedAt: qaEvidence.observedAt,
      routes: withRoutes ? [
        { mode: "walking", distanceMeters: 610, durationSeconds: 480, providerId: "qa-routing", attribution: qaEvidence.attribution, observedAt: qaEvidence.observedAt },
      ] : [],
    },
    {
      id: "qa-tram",
      name: "Station QA Agdal",
      category: "transport",
      categoryLabel: "Transports",
      coordinate: { latitude: 33.992, longitude: -6.8501 },
      confidence: "provider_verified",
      providerId: qaEvidence.providerId,
      attribution: qaEvidence.attribution,
      observedAt: qaEvidence.observedAt,
      routes: [],
    },
    {
      id: "qa-market",
      name: "Marché QA Agdal",
      category: "groceries",
      categoryLabel: "Courses & marchés",
      coordinate: { latitude: 33.9889, longitude: -6.8469 },
      confidence: "provider_verified",
      providerId: qaEvidence.providerId,
      attribution: qaEvidence.attribution,
      observedAt: qaEvidence.observedAt,
      routes: [],
    },
  ];

  const polygon = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { qa: true },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-6.851, 33.988], [-6.845, 33.988], [-6.845, 33.994], [-6.851, 33.994], [-6.851, 33.988],
        ]],
      },
    }],
  };

  return {
    version: "1.0",
    listingId: `visual-qa-ann-l6-${state}`,
    visibility: exact ? "full" : "context",
    reason: exact ? "exact_verified" : "neighborhood_context_only",
    origin: {
      coordinate: { latitude: 33.9908, longitude: -6.8481 },
      displayMode: exact ? "exact_pin" : "neighborhood_context",
      exact,
    },
    canShowPreciseRouteTimes: withRoutes,
    pois,
    isochrones: withRoutes ? ([5, 10, 15] as const).map((minutes) => ({
      minutes,
      mode: "walking" as const,
      geojson: polygon,
      providerId: "qa-isochrone",
      attribution: qaEvidence.attribution,
      observedAt: qaEvidence.observedAt,
    })) : [],
    attribution: [qaEvidence.attribution],
  };
}

export default async function AnnouncementPageLivingHereVisualQa({
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
  if (!detail) throw new Error("ANN-L6 QA fixture must remain publishable.");
  const livingHere = state === "context"
    ? await buildConvergedLivingHereForListing(currentListing, { now: L5_QA_NOW })
    : state === "exact"
      ? await buildConvergedLivingHereForListing(currentListing, {
          now: L5_QA_NOW,
          exactMeasurementsOverride: model("exact"),
        })
      : model(state);
  return (
    <AnnouncementPageShell
      listing={currentListing}
      detail={detail}
      livingHere={livingHere}
      mapStyleUrl="/visual-qa/announcement-page-living-here/map-style"
      visualQa
    />
  );
}
