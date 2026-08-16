import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import {
  buildPublicPropertyDetailV2,
  type PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — Property Core annonce",
  robots: { index: false, follow: false },
};

const QA_NOW = "2026-08-16T00:00:00.000Z";

type CoreState = "normal" | "no-price" | "long-title" | "sparse" | "dense";

function normalizeState(value: string | string[] | undefined): CoreState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "no-price" || first === "long-title" || first === "sparse" || first === "dense") return first;
  return "normal";
}

const longDescription =
  "Appartement de démonstration interne AkarFinder utilisé uniquement pour certifier la hiérarchie du Property Core. " +
  "La description est volontairement longue afin de vérifier un affichage progressif lisible sur mobile et desktop, sans masquer la provenance ni transformer une donnée absente en affirmation. " +
  "Le contenu de cette fixture ne représente aucune annonce réelle. Les surfaces, équipements, prix et caractéristiques présents ici servent exclusivement aux tests visuels et fonctionnels du chantier ANN-L3. " +
  "Le bouton Voir plus doit rester accessible au clavier, conserver un target confortable et révéler le texte complet sans provoquer de débordement horizontal.";

function baseListing(state: CoreState): Listing {
  const base: Listing = {
    id: `visual-qa-announcement-core-${state}`,
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
    description: longDescription,
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
    listed_at_label: "01 août 2026",
    updated_at_label: "16 août 2026",
    image_fallback_type: "apartment",
    image_source: "Asset de démonstration AkarFinder",
    image_permission_status: "allowed",
    source_access_level: "preview_allowed",
    main_image_url: "/demo/properties/apartment-modern.jpg",
    gallery_image_urls: [],
    images_count: 1,
    allowed_ctas: ["compare"],
    can_show_contact: false,
    can_show_thumbnail: false,
    can_show_gallery: false,
    production_allowed: false,
  };

  if (state === "no-price") {
    return { ...base, price: null, price_per_m2: null };
  }

  if (state === "long-title") {
    return {
      ...base,
      title:
        "Appartement familial traversant avec grande terrasse, double exposition et espaces de vie généreux dans une résidence calme au cœur du quartier Agdal à Rabat",
    };
  }

  if (state === "sparse") {
    return {
      ...base,
      surface_m2: 58,
      bedrooms: 0,
      bathrooms: 0,
      price_per_m2: null,
      rooms_count: undefined,
      built_surface_m2: undefined,
      condition: undefined,
      orientation: undefined,
      terrace_m2: undefined,
      garage_spaces: undefined,
      has_equipped_kitchen: false,
      description: "Description courte et volontairement limitée pour la fixture sparse ANN-L3.",
    };
  }

  if (state === "dense") {
    return {
      ...base,
      built_surface_m2: 128,
      plot_surface_m2: 180,
      terrace_m2: 24,
      garden_m2: 32,
      rooms_count: 6,
      property_age_range: "5 à 10 ans",
      orientation: "Sud-Ouest",
      floor_type: "Marbre et parquet",
      floors_count: 4,
      garage_spaces: 2,
      has_pool: true,
      has_concierge: true,
      has_equipped_kitchen: true,
      has_moroccan_living_room: true,
      has_european_living_room: true,
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
  if (!value) throw new Error("ANN-L3 Property Core QA fixture must remain publishable as first-party QA data.");
  return value;
}

export default async function AnnouncementPageCoreVisualQa({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const state = normalizeState(params.state);
  const listing = baseListing(state);
  const detail = buildQaDetail(listing);
  return <AnnouncementPageShell listing={listing} detail={detail} visualQa />;
}
