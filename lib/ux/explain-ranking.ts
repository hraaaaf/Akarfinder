import type { Listing } from "@/lib/listings/types";
import { hasCertifiedExactCoordinates } from "@/lib/ux/certified-property-map";

export type ExplainRankingSignal = {
  code:
    | "structured_information"
    | "information_completeness"
    | "reliability_available"
    | "freshness_available"
    | "certified_coordinates"
    | "partner_authorized"
    | "canonical_property";
  label: string;
  evidence: string;
};

export type ExplainRankingModel = {
  title: string;
  summary: string;
  signals: ExplainRankingSignal[];
  limitation: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildExplainRankingModel(listing: Listing): ExplainRankingModel {
  const signals: ExplainRankingSignal[] = [];

  if (listing.search_result_display_mode !== "thin_indexed_result") {
    signals.push({
      code: "structured_information",
      label: "Informations structurées disponibles",
      evidence: "La fiche contient des champs immobiliers structurés publiables.",
    });
  }

  if (Number.isFinite(listing.data_completeness_score) && (listing.data_completeness_score ?? 0) > 0) {
    signals.push({
      code: "information_completeness",
      label: "Niveau de complétude disponible",
      evidence: `Complétude publiée : ${Math.round(listing.data_completeness_score!)} / 100.`,
    });
  }

  if (listing.reliability_available === true && Number.isFinite(listing.reliability_score)) {
    signals.push({
      code: "reliability_available",
      label: "Fiabilité documentée",
      evidence: `Indicateur de fiabilité publié : ${Math.round(listing.reliability_score)} / 100.`,
    });
  }

  if (hasText(listing.freshness_label)) {
    signals.push({
      code: "freshness_available",
      label: "Fraîcheur renseignée",
      evidence: listing.freshness_label.trim(),
    });
  }

  if (hasCertifiedExactCoordinates(listing)) {
    signals.push({
      code: "certified_coordinates",
      label: "Coordonnées exactes certifiées",
      evidence: "La position individuelle respecte le contrat géographique public.",
    });
  }

  if (listing.source_access_level === "partner_full") {
    signals.push({
      code: "partner_authorized",
      label: "Source partenaire autorisée",
      evidence: "Le niveau d’accès de la source autorise une fiche enrichie.",
    });
  }

  if (hasText(listing.duplicate_group_id)) {
    signals.push({
      code: "canonical_property",
      label: "Propriété rapprochée",
      evidence: "Cette représentation appartient à un groupe canonique certifié.",
    });
  }

  return {
    title: "Pourquoi ce résultat peut apparaître ici",
    summary:
      signals.length > 0
        ? "AkarFinder expose uniquement les signaux publics disponibles pour cette fiche."
        : "Aucun signal public détaillé n’est disponible pour expliquer davantage ce résultat.",
    signals,
    limitation:
      "Ces éléments peuvent contribuer à la présentation du résultat, mais ne révèlent ni les pondérations, ni un score de classement, ni la position relative exacte.",
  };
}
