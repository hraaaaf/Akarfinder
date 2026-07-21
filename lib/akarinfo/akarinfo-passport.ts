import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
import type { PublicLifestyleSummary } from "@/lib/market-reference/types";
import { getPublicLifestyleSummary } from "@/lib/market-reference/public-safety";
import { getInternalDistrictReferenceByCityAndDistrict } from "@/lib/market-reference/reference-resolver";
import { getSourceAccessType } from "@/lib/sources/source-access-registry";
import { canHaveInternalDetail } from "@/lib/listings/listing-boundary";
import type { Listing } from "@/lib/listings/types";
import type { ObservationSummary } from "@/lib/observation/types";
import { buildObservationFingerprint } from "@/lib/observation/fingerprint";
import { computeObservationSummary } from "@/lib/observation/observation-policy";
import { getObservationStore } from "@/lib/observation/observation-store";
import type { PublicResultSimilaritySummary } from "@/lib/public-result-similarity/types";
import type { PublicResultChecklistSummary } from "@/lib/public-result-checklist/types";
import { buildPublicResultChecklist } from "@/lib/public-result-checklist/build-checklist";
import { assertPublicResultChecklistSafety } from "@/lib/public-result-checklist/public-safety";
import type { PublicSerpIntelligenceSummaryV1 } from "@/lib/intelligence/public-serp-intelligence-types";
import { getPublicSerpIntelligenceFromListing } from "@/lib/intelligence/public-serp-intelligence-v1";

export type AkarInfoPassportKind =
  | "gateway_external"
  | "structured_internal"
  | "partner_authorized";

export type AkarInfoPassport = {
  kind: AkarInfoPassportKind;
  information_level_label: "Aperçu limité" | "Fiche structurée" | "Fiche enrichie";
  source_type_label:
    | "Résultat web externe"
    | "Fiche structurée AkarFinder"
    | "Page partenaire autorisée";
  source_name?: string;
  source_original_label: string;
  summary: string;
  points_to_verify: string[];
  lifestyle_summary: PublicLifestyleSummary | null;
  future_signals: string[];
  observation?: ObservationSummary;
  similar_results?: PublicResultSimilaritySummary;
  checklist?: PublicResultChecklistSummary;
  intelligence?: PublicSerpIntelligenceSummaryV1;
};

function resolveLifestyleSummary(
  city?: string,
  district?: string,
): PublicLifestyleSummary | null {
  if (!city || !district) {
    return null;
  }

  const districtReference = getInternalDistrictReferenceByCityAndDistrict(
    city,
    district,
  );

  if (!districtReference) {
    return null;
  }

  return getPublicLifestyleSummary(districtReference);
}

function getListingPointsToVerify(listing: Listing): string[] {
  const baseChecks = [
    "Confirmer la disponibilité réelle et les conditions avant visite.",
    "Vérifier la surface, l'étage, les charges et les documents utiles.",
  ];

  if (listing.transaction_type === "new") {
    return [
      "Confirmer le calendrier, la typologie et les conditions de réservation.",
      "Demander le plan, l'orientation et les frais annexes applicables.",
      ...baseChecks,
    ];
  }

  if (listing.transaction_type === "rent") {
    return [
      "Confirmer le loyer, les charges et les conditions d'entrée.",
      "Vérifier le mobilier, le stationnement et les modalités du bail.",
      ...baseChecks,
    ];
  }

  return [
    "Confirmer le prix affiché, la disponibilité et les conditions de vente.",
    "Vérifier la localisation précise, l'état du bien et les annexes utiles.",
    ...baseChecks,
  ];
}

export function buildAkarInfoPassportForListing(
  listing: Listing,
): AkarInfoPassport {
  const sourceAccessType = getSourceAccessType(listing.source_name ?? "");
  const internalDetailAllowed = canHaveInternalDetail(listing);
  const partnerAuthorized =
    sourceAccessType === "partner_authorized" ||
    listing.source_access_level === "partner_full";

  if (!internalDetailAllowed) {
    return {
      kind: "gateway_external",
      information_level_label: "Aperçu limité",
      source_type_label: "Résultat web externe",
      source_name: listing.source_name,
      source_original_label: "Source originale à consulter",
      summary:
        "AkarFinder montre ici un aperçu limité. Le contact, la visite et les détails complets restent gérés par la source originale.",
      points_to_verify: [
        "Vérifier le prix, la disponibilité et les photos sur la source originale.",
        "Confirmer l'adresse précise, le mode de contact et la fraîcheur de l'annonce.",
        "Contrôler les conditions avant déplacement ou prise de rendez-vous.",
      ],
      lifestyle_summary: null,
      future_signals: [
        "Fraîcheur source",
        "Historique d'annonce",
        "Repères complémentaires",
      ],
    };
  }

  const intelligence = getPublicSerpIntelligenceFromListing(listing);

  return {
    kind: partnerAuthorized ? "partner_authorized" : "structured_internal",
    information_level_label: partnerAuthorized
      ? "Fiche enrichie"
      : "Fiche structurée",
    source_type_label: partnerAuthorized
      ? "Page partenaire autorisée"
      : "Fiche structurée AkarFinder",
    source_name: listing.source_name,
    source_original_label: partnerAuthorized
      ? "Contact autorisé si prévu sur la fiche"
      : "Source et détails à confirmer",
    summary: partnerAuthorized
      ? "Cette fiche peut afficher plus de contexte et des actions autorisées, tout en restant prudente sur les éléments à confirmer."
      : "Cette fiche structure les informations disponibles pour préparer votre lecture du bien, sans remplacer les vérifications de terrain.",
    points_to_verify: getListingPointsToVerify(listing),
    lifestyle_summary: resolveLifestyleSummary(
      listing.city,
      listing.neighborhood || listing.district,
    ),
    future_signals: [
      "Fraîcheur source",
      "Historique d'annonce",
      "Repères internes sécurisés",
    ],
    ...(intelligence ? { intelligence } : {}),
  };
}

function resolveGatewayObservationSummary(
  result: SearchGatewayNormalizedResult,
): ObservationSummary {
  const fingerprint = buildObservationFingerprint({
    original_url: result.original_url,
    source_host: result.domain,
    title: result.title,
  });

  const existingRecord = getObservationStore().get(fingerprint);
  return computeObservationSummary(existingRecord, "external_web");
}

function resolveGatewayChecklist(
  result: SearchGatewayNormalizedResult,
  similarResults: PublicResultSimilaritySummary | undefined,
  observation: ObservationSummary,
): PublicResultChecklistSummary | undefined {
  const checklist = buildPublicResultChecklist({
    title: result.title,
    snippet: result.snippet,
    original_url: result.original_url,
    similar_possible: similarResults?.similar_possible,
    observation_labels: observation.labels,
  });

  if (!checklist) {
    return undefined;
  }

  assertPublicResultChecklistSafety(checklist);
  return checklist;
}

export function buildAkarInfoPassportForGatewayResult(
  result: SearchGatewayNormalizedResult,
  similarResults?: PublicResultSimilaritySummary,
): AkarInfoPassport {
  const observation = resolveGatewayObservationSummary(result);

  return {
    kind: "gateway_external",
    information_level_label: "Aperçu limité",
    source_type_label: "Résultat web externe",
    source_name: result.source_name,
    source_original_label: "Source originale obligatoire",
    summary:
      "AkarFinder référence ce résultat du web avec un aperçu limité et vous renvoie vers la source originale pour le détail complet.",
    points_to_verify: [
      "Vérifier la disponibilité, le prix et les photos sur la source originale.",
      "Confirmer le mode de contact et la date de mise à jour avant toute démarche.",
      "Relire les détails sensibles directement sur le site d'origine.",
    ],
    lifestyle_summary: null,
    future_signals: [
      "Fraîcheur source",
      "Historique d'annonce",
      "Repères quartier si la localisation est exploitable",
    ],
    observation,
    similar_results: similarResults,
    checklist: resolveGatewayChecklist(result, similarResults, observation),
  };
}
