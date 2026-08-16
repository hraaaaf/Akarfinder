import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import type { Listing } from "@/lib/listings/types";
import {
  buildPublicPropertyDetailV2,
  type PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

export const metadata: Metadata = {
  title: "QA — Akar Intelligence annonce",
  robots: { index: false, follow: false },
};

const QA_NOW = "2026-08-16T00:00:00.000Z";
type IntelligenceState = "full" | "no-score" | "no-market" | "attention" | "invalid-score" | "minimal";

function normalizeState(value: string | string[] | undefined): IntelligenceState {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "no-score" || first === "no-market" || first === "attention" || first === "invalid-score" || first === "minimal") return first;
  return "full";
}

function listing(state: IntelligenceState): Listing {
  return {
    id: `visual-qa-announcement-intelligence-${state}`,
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
    is_mre_friendly: false,
    description: "Fixture interne noindex pour certifier ANN-L4. Elle ne représente aucune annonce réelle.",
    image_url: "",
    reliability_explanation: "Fixture QA interne.",
    source_name: "AkarFinder",
    seller_name: "AkarFinder QA",
    rooms_count: 5,
    built_surface_m2: 132,
    garage_spaces: 1,
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

function baseDetail(value: Listing): PublicPropertyDetailV2 {
  const detail = buildPublicPropertyDetailV2(value, {
    source_name: "AkarFinder",
    observed_at: QA_NOW,
    generated_at: QA_NOW,
  });
  if (!detail) throw new Error("ANN-L4 QA fixture must remain publishable as first-party QA data.");
  return detail;
}

function detailForState(value: Listing, state: IntelligenceState): PublicPropertyDetailV2 {
  const detail = baseDetail(value);
  if (state === "full") {
    return {
      ...detail,
      conclusion: {
        ...detail.conclusion,
        akar_score: 86,
        akar_score_label: "Dossier bien documenté",
        coverage_label: "5/5 dimensions documentaires disponibles",
        attention_label: "1 point à examiner dans les données disponibles",
      },
      market: { status: "available", label: "Prix demandé proche du repère indicatif", price_per_m2: 18_560 },
      multisource: { status: "supported", label: "Plusieurs offres rapprochées à comparer" },
    };
  }
  if (state === "no-score") {
    return {
      ...detail,
      conclusion: {
        ...detail.conclusion,
        akar_score: null,
        akar_score_label: "Analyse documentaire partielle",
        coverage_label: "2/5 dimensions documentaires disponibles",
        attention_label: null,
      },
      market: { status: "unavailable", label: null, price_per_m2: null },
      multisource: { status: "not_shown", label: null },
    };
  }
  if (state === "no-market") {
    return {
      ...detail,
      conclusion: { ...detail.conclusion, akar_score: 78, akar_score_label: "Lecture documentaire disponible", coverage_label: "4/5 dimensions documentaires disponibles", attention_label: null },
      market: { status: "unavailable", label: "Ce repère obsolète ne doit pas être affiché", price_per_m2: null },
      multisource: { status: "supported", label: "Plusieurs offres rapprochées à comparer" },
    };
  }
  if (state === "attention") {
    return {
      ...detail,
      conclusion: { ...detail.conclusion, akar_score: 67, akar_score_label: "Dossier à examiner", coverage_label: "3/5 dimensions documentaires disponibles", attention_label: "2 points à examiner dans les données disponibles" },
      market: { status: "available", label: "Prix demandé au-dessus du repère indicatif", price_per_m2: 18_560 },
      multisource: { status: "not_shown", label: null },
    };
  }
  if (state === "invalid-score") {
    return {
      ...detail,
      conclusion: {
        ...detail.conclusion,
        akar_score: 140,
        akar_score_label: "Excellent dossier",
        coverage_label: "5/5 dimensions documentaires disponibles",
        attention_label: null,
      },
      market: { status: "unavailable", label: null, price_per_m2: null },
      multisource: { status: "not_shown", label: null },
    };
  }
  return {
    ...detail,
    conclusion: { ...detail.conclusion, akar_score: null, akar_score_label: null, coverage_label: null, attention_label: null },
    market: { status: "unavailable", label: null, price_per_m2: null },
    multisource: { status: "not_shown", label: null },
  };
}

export default async function AnnouncementPageIntelligenceVisualQa({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const state = normalizeState(params.state);
  const currentListing = listing(state);
  const detail = detailForState(currentListing, state);
  return <AnnouncementPageShell listing={currentListing} detail={detail} visualQa />;
}