import type { Listing } from "../listings/types";
import { getSourceAccessType } from "../sources/source-access-registry";
import { buildPublicSerpIntelligenceForListing } from "../intelligence/public-serp-intelligence-v1";

export const PUBLIC_PROPERTY_DETAIL_VERSION = "2.0" as const;

export type PublicDetailProvenanceKind =
  | "declared"
  | "calculated"
  | "inferred"
  | "verified_document";

export type PublicDetailFact = {
  key: string;
  label: string;
  value: string;
  provenance: PublicDetailProvenanceKind;
  provenance_label: string;
};

export type PublicDetailHistoryItem = {
  label: string;
  value: string;
  kind: "source" | "akarfinder_observation";
};

export type PublicPropertyDetailV2 = {
  version: typeof PUBLIC_PROPERTY_DETAIL_VERSION;
  listing_id: string;
  conclusion: {
    title: string;
    summary: string;
    akar_score: number | null;
    akar_score_label: string | null;
    coverage_label: string | null;
    attention_label: string | null;
  };
  fit: {
    status: "not_calculated";
    label: "Compatibilité personnalisée non calculée";
    explanation: string;
  };
  market: {
    status: "available" | "unavailable";
    label: string | null;
    price_per_m2: number | null;
  };
  facts: {
    essential: PublicDetailFact[];
    surfaces: PublicDetailFact[];
    layout: PublicDetailFact[];
    building: PublicDetailFact[];
    features: PublicDetailFact[];
  };
  environment: {
    city: string | null;
    district: string | null;
    geo_precision_label: string | null;
  };
  costs: {
    status: "not_provided";
    label: "Coûts complémentaires non renseignés";
  };
  history: PublicDetailHistoryItem[];
  provenance: {
    source_name: string;
    source_url: string | null;
    source_access_type: "first_party" | "partner_authorized";
    fact_provenance_label: string;
    verified_document_count: 0;
    verified_document_label: "Aucune vérification documentaire affichable";
  };
  multisource: {
    status: "supported" | "not_shown";
    label: string | null;
  };
  professional: {
    source_name: string;
    seller_name: string | null;
    profile_status: "profile_layer_pending";
  };
  disclaimer: string;
};

export type PublicPropertyDetailContextV2 = {
  source_name: string;
  observed_at: string;
  created_at?: string | null;
  generated_at?: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sourceFactProvenance(sourceName: string): {
  provenance: PublicDetailProvenanceKind;
  label: string;
} {
  const normalized = sourceName.toLowerCase().trim();
  const accessType = getSourceAccessType(sourceName);

  if (accessType === "partner_authorized") {
    return { provenance: "declared", label: "Déclaré par le partenaire" };
  }

  if (["akarfinder", "first_party", "own"].includes(normalized)) {
    return { provenance: "declared", label: "Déclaré dans AkarFinder" };
  }

  return { provenance: "inferred", label: "Origine exacte à confirmer" };
}

function fact(
  key: string,
  label: string,
  value: string | null | undefined,
  provenance: { provenance: PublicDetailProvenanceKind; label: string },
): PublicDetailFact | null {
  if (!value || value === "0") return null;
  return {
    key,
    label,
    value,
    provenance: provenance.provenance,
    provenance_label: provenance.label,
  };
}

function booleanFact(
  key: string,
  label: string,
  value: boolean | undefined,
  provenance: { provenance: PublicDetailProvenanceKind; label: string },
): PublicDetailFact | null {
  if (value !== true) return null;
  return {
    key,
    label,
    value: "Oui",
    provenance: provenance.provenance,
    provenance_label: provenance.label,
  };
}

function compact<T>(values: Array<T | null>): T[] {
  return values.filter((value): value is T => value !== null);
}

function getMarketSignal(
  intelligence: ReturnType<typeof buildPublicSerpIntelligenceForListing>,
): string | null {
  return intelligence?.signals.find((signal) => signal.code === "market_context")?.label ?? null;
}

function getMultiSourceSignal(
  intelligence: ReturnType<typeof buildPublicSerpIntelligenceForListing>,
): string | null {
  return intelligence?.signals.find((signal) => signal.code === "multisource")?.label ?? null;
}

function buildConclusion(
  intelligence: NonNullable<ReturnType<typeof buildPublicSerpIntelligenceForListing>>,
  marketLabel: string | null,
): string {
  const parts = [intelligence.score_label];
  if (marketLabel) parts.push(marketLabel);
  if (intelligence.attention_label) parts.push(intelligence.attention_label);
  return `${parts.join(". ")}. Cette lecture décrit les informations disponibles et ne remplace pas les vérifications du bien, des documents, du prix ou de la disponibilité.`;
}

export function buildPublicPropertyDetailV2(
  listing: Listing,
  context: PublicPropertyDetailContextV2,
): PublicPropertyDetailV2 | null {
  const accessType = getSourceAccessType(context.source_name);
  if (accessType !== "first_party" && accessType !== "partner_authorized") return null;

  const publicIntelligence = buildPublicSerpIntelligenceForListing(listing, {
    source_name: context.source_name,
    observed_at: context.observed_at,
    generated_at: context.generated_at,
  });
  if (!publicIntelligence) return null;

  const sourceProvenance = sourceFactProvenance(context.source_name);
  const calculated = { provenance: "calculated" as const, label: "Calculé par AkarFinder" };
  const marketLabel = getMarketSignal(publicIntelligence);
  const multiSourceLabel = getMultiSourceSignal(publicIntelligence);

  const essential = compact([
    fact("property_type", "Type de bien", listing.property_type, sourceProvenance),
    fact(
      "transaction_type",
      "Transaction",
      listing.transaction_type === "rent" ? "Location" : listing.transaction_type === "new" ? "Neuf" : "Vente",
      sourceProvenance,
    ),
    listing.price != null && listing.price > 0
      ? fact("price", "Prix demandé", `${formatNumber(listing.price)} DH`, sourceProvenance)
      : null,
    listing.price_per_m2 != null && listing.price_per_m2 > 0
      ? fact("price_per_m2", "Prix au m²", `${formatNumber(listing.price_per_m2)} DH/m²`, calculated)
      : null,
  ]);

  const surfaces = compact([
    listing.surface_m2 > 0 ? fact("surface_total", "Surface", `${formatNumber(listing.surface_m2)} m²`, sourceProvenance) : null,
    listing.built_surface_m2 && listing.built_surface_m2 > 0
      ? fact("surface_built", "Surface construite", `${formatNumber(listing.built_surface_m2)} m²`, sourceProvenance)
      : null,
    listing.plot_surface_m2 && listing.plot_surface_m2 > 0
      ? fact("surface_land", "Terrain", `${formatNumber(listing.plot_surface_m2)} m²`, sourceProvenance)
      : null,
    listing.terrace_m2 && listing.terrace_m2 > 0
      ? fact("terrace", "Terrasse", `${formatNumber(listing.terrace_m2)} m²`, sourceProvenance)
      : null,
    listing.garden_m2 && listing.garden_m2 > 0
      ? fact("garden", "Jardin", `${formatNumber(listing.garden_m2)} m²`, sourceProvenance)
      : null,
  ]);

  const layout = compact([
    (listing.rooms_count ?? 0) > 0 ? fact("rooms", "Pièces", String(listing.rooms_count), sourceProvenance) : null,
    listing.bedrooms > 0 ? fact("bedrooms", "Chambres", String(listing.bedrooms), sourceProvenance) : null,
    listing.bathrooms > 0 ? fact("bathrooms", "Salles de bain", String(listing.bathrooms), sourceProvenance) : null,
  ]);

  const building = compact([
    fact("condition", "État", listing.condition, sourceProvenance),
    fact("property_age", "Âge du bien", listing.property_age_range, sourceProvenance),
    fact("orientation", "Orientation", listing.orientation, sourceProvenance),
    fact("floor_type", "Type de sol", listing.floor_type, sourceProvenance),
    (listing.floors_count ?? 0) > 0 ? fact("floors", "Nombre d’étages", String(listing.floors_count), sourceProvenance) : null,
  ]);

  const features = compact([
    (listing.garage_spaces ?? 0) > 0 ? fact("garage", "Garage", `${listing.garage_spaces} place${listing.garage_spaces === 1 ? "" : "s"}`, sourceProvenance) : null,
    booleanFact("pool", "Piscine", listing.has_pool, sourceProvenance),
    booleanFact("concierge", "Concierge", listing.has_concierge, sourceProvenance),
    booleanFact("equipped_kitchen", "Cuisine équipée", listing.has_equipped_kitchen, sourceProvenance),
    booleanFact("moroccan_living", "Salon marocain", listing.has_moroccan_living_room, sourceProvenance),
    booleanFact("european_living", "Salon européen", listing.has_european_living_room, sourceProvenance),
  ]);

  const history: PublicDetailHistoryItem[] = [];
  const createdAt = formatDate(context.created_at);
  const observedAt = formatDate(context.observed_at);
  if (createdAt) {
    history.push({
      label: "Première présence enregistrée dans AkarFinder",
      value: createdAt,
      kind: "akarfinder_observation",
    });
  }
  if (observedAt && observedAt !== createdAt) {
    history.push({
      label: "Dernière observation AkarFinder",
      value: observedAt,
      kind: "akarfinder_observation",
    });
  }
  if (listing.listed_at_label && !/indisponible/i.test(listing.listed_at_label)) {
    history.unshift({ label: "Publication indiquée par la source", value: listing.listed_at_label, kind: "source" });
  }
  if (listing.updated_at_label && !/indisponible/i.test(listing.updated_at_label)) {
    history.push({ label: "Mise à jour indiquée par la source", value: listing.updated_at_label, kind: "source" });
  }

  return {
    version: PUBLIC_PROPERTY_DETAIL_VERSION,
    listing_id: listing.id,
    conclusion: {
      title: "Conclusion AkarFinder",
      summary: buildConclusion(publicIntelligence, marketLabel),
      akar_score: publicIntelligence.score,
      akar_score_label: publicIntelligence.score_label,
      coverage_label: publicIntelligence.coverage_label,
      attention_label: publicIntelligence.attention_label,
    },
    fit: {
      status: "not_calculated",
      label: "Compatibilité personnalisée non calculée",
      explanation:
        "Aucun score de compatibilité n’est affiché sans profil de recherche utilisateur. Le Property Fit Score sera calculé séparément à partir de vos contraintes, préférences et priorités.",
    },
    market: {
      status: marketLabel ? "available" : "unavailable",
      label: marketLabel,
      price_per_m2: listing.price_per_m2 ?? null,
    },
    facts: { essential, surfaces, layout, building, features },
    environment: {
      city: listing.city || null,
      district: listing.neighborhood || listing.district || null,
      geo_precision_label: listing.geo_label ?? null,
    },
    costs: {
      status: "not_provided",
      label: "Coûts complémentaires non renseignés",
    },
    history,
    provenance: {
      source_name: context.source_name,
      source_url: listing.listing_url ?? null,
      source_access_type: accessType,
      fact_provenance_label: sourceProvenance.label,
      verified_document_count: 0,
      verified_document_label: "Aucune vérification documentaire affichable",
    },
    multisource: {
      status: multiSourceLabel ? "supported" : "not_shown",
      label: multiSourceLabel,
    },
    professional: {
      source_name: context.source_name,
      seller_name: listing.seller_name ?? null,
      profile_status: "profile_layer_pending",
    },
    disclaimer:
      "AkarFinder structure et analyse les informations disponibles. Les champs absents restent non renseignés. Aucune donnée manquante n’est inventée.",
  };
}
