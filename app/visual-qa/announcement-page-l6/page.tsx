import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { Listing } from "@/lib/listings/types";
import { buildPublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — ANN-L6 Vivre ici",
  robots: { index: false, follow: false },
};

const listing: Listing = {
  id: "visual-qa-ann-l6",
  title: "Villa QA Vivre ici à Casablanca",
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
  freshness_label: "Fixture QA",
  source_type: "Source analysée",
  reliability_label: "Informations complètes",
  reliability_score: 92,
  is_mre_friendly: false,
  description: "Fixture interne noindex pour certifier ANN-L6. Aucune donnée n’est présentée comme une annonce réelle.",
  image_url: "",
  reliability_explanation: "Fixture QA",
  source_name: "AkarFinder",
  latitude: 33.5908,
  longitude: -7.6552,
  geo_precision: "exact",
  geo_source: "manual_import",
  geo_label: "Coordonnées QA",
  image_permission_status: "unknown",
  source_access_level: "partner_full",
  image_fallback_type: "villa",
  can_show_gallery: false,
  can_show_contact: false,
  production_allowed: false,
};

const detail = buildPublicPropertyDetailV2(listing, {
  source_name: "AkarFinder",
  observed_at: "2026-08-16T12:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  generated_at: "2026-08-16T12:00:00.000Z",
});

if (!detail) throw new Error("ANN-L6 QA detail fixture must remain publishable");

const livingHere: LivingHereModel = {
  version: "1.0",
  listingId: listing.id,
  visibility: "full",
  reason: "exact_verified",
  origin: {
    coordinate: { latitude: 33.5908, longitude: -7.6552 },
    displayMode: "exact_pin",
    exact: true,
  },
  canShowPreciseRouteTimes: true,
  pois: [
    {
      id: "qa-school",
      name: "École QA Anfa",
      category: "education",
      categoryLabel: "Écoles & crèches",
      coordinate: { latitude: 33.5922, longitude: -7.6539 },
      confidence: "provider_verified",
      providerId: "qa-provider",
      attribution: "Fixture QA locale",
      observedAt: "2026-08-16T12:00:00.000Z",
      routes: [
        { mode: "walking", distanceMeters: 420, durationSeconds: 330, providerId: "qa-routing", attribution: "Fixture QA locale", observedAt: "2026-08-16T12:00:00.000Z" },
        { mode: "driving", distanceMeters: 610, durationSeconds: 180, providerId: "qa-routing", attribution: "Fixture QA locale", observedAt: "2026-08-16T12:00:00.000Z" },
      ],
    },
    {
      id: "qa-pharmacy",
      name: "Pharmacie QA Atlas",
      category: "health",
      categoryLabel: "Santé",
      coordinate: { latitude: 33.5897, longitude: -7.6568 },
      confidence: "provider_verified",
      providerId: "qa-provider",
      attribution: "Fixture QA locale",
      observedAt: "2026-08-16T12:00:00.000Z",
      routes: [{ mode: "walking", distanceMeters: 310, durationSeconds: 245, providerId: "qa-routing", attribution: "Fixture QA locale", observedAt: "2026-08-16T12:00:00.000Z" }],
    },
    {
      id: "qa-market",
      name: "Marché QA du quartier",
      category: "groceries",
      categoryLabel: "Courses & marchés",
      coordinate: { latitude: 33.5889, longitude: -7.6529 },
      confidence: "provider_verified",
      providerId: "qa-provider",
      attribution: "Fixture QA locale",
      observedAt: "2026-08-16T12:00:00.000Z",
      routes: [{ mode: "walking", distanceMeters: 690, durationSeconds: 540, providerId: "qa-routing", attribution: "Fixture QA locale", observedAt: "2026-08-16T12:00:00.000Z" }],
    },
  ],
  isochrones: [5, 10, 15].map((minutes) => ({
    minutes: minutes as 5 | 10 | 15,
    mode: "walking" as const,
    providerId: "qa-routing",
    attribution: "Fixture QA locale",
    observedAt: "2026-08-16T12:00:00.000Z",
    geojson: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { minutes },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-7.6552 - minutes * 0.00018, 33.5908 - minutes * 0.00012],
            [-7.6552 + minutes * 0.00018, 33.5908 - minutes * 0.00012],
            [-7.6552 + minutes * 0.00018, 33.5908 + minutes * 0.00012],
            [-7.6552 - minutes * 0.00018, 33.5908 + minutes * 0.00012],
            [-7.6552 - minutes * 0.00018, 33.5908 - minutes * 0.00012],
          ]],
        },
      }],
    },
  })),
  attribution: ["Fixture QA locale"],
};

export default function AnnouncementPageL6VisualQa() {
  return (
    <AnnouncementPageShell
      listing={listing}
      detail={detail}
      livingHere={livingHere}
      mapStyleUrl="/visual-qa/ann-l6-map-style.json"
      visualQa
    />
  );
}
