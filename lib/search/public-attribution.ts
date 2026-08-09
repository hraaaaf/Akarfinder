import type { Listing } from "@/lib/listings/types";
import { getSearchGatewaySourceById } from "@/lib/search-gateway/search-gateway-sources";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
import { getSourceAccessType } from "@/lib/sources/source-access-registry";

export type PublicAttributionKind =
  | "first_party"
  | "partner_authorized"
  | "external_web"
  | "public_index"
  | "market_signal"
  | "unknown";

export type PublicAttribution = {
  kind: PublicAttributionKind;
  typeLabel: string;
  sourceLabel: string;
  combinedLabel: string;
  badge?: string;
  primaryCtaLabel?: string;
};

const CANONICAL_LISTING_SOURCE_LABELS: Record<string, string> = {
  akarfinder: "AkarFinder",
  internal: "AkarFinder",
  first_party: "AkarFinder",
  own: "AkarFinder",
  mubawab: "Mubawab",
  avito: "Avito",
  sarouty: "Sarouty",
  agenz: "Agenz",
  logicimmo: "Logic-Immo",
  "logic-immo": "Logic-Immo",
  "logic immo": "Logic-Immo",
  "logicimmo maroc": "Logic-Immo",
  "logic-immo maroc": "Logic-Immo",
  "logic immo maroc": "Logic-Immo",
};

function normalizeSourceKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function makeAttribution(
  kind: PublicAttributionKind,
  typeLabel: string,
  sourceLabel: string,
  extras: Pick<PublicAttribution, "badge" | "primaryCtaLabel"> = {},
): PublicAttribution {
  return {
    kind,
    typeLabel,
    sourceLabel,
    combinedLabel: typeLabel === sourceLabel ? typeLabel : `${typeLabel} · ${sourceLabel}`,
    ...extras,
  };
}

export function deriveGatewayPublicAttribution(
  result: Pick<
    SearchGatewayNormalizedResult,
    "source_id" | "result_origin"
  >,
): PublicAttribution {
  const config = getSearchGatewaySourceById(result.source_id);
  const sourceLabel = config?.source_name ?? "Source originale";

  if (result.result_origin === "public_sitemap" || result.result_origin === "commoncrawl_cdx") {
    return makeAttribution("public_index", "Source publique indexée", sourceLabel, {
      badge: config?.source_badge ?? "public_indexed",
      primaryCtaLabel: config ? `Voir sur ${sourceLabel}` : "Voir la source originale",
    });
  }

  if (result.result_origin === "search_api") {
    return makeAttribution("external_web", "Résultat web externe", sourceLabel, {
      badge: config?.source_badge === "public_indexed" ? "external_web_result" : config?.source_badge ?? "external_web_result",
      primaryCtaLabel: config ? `Voir sur ${sourceLabel}` : "Voir la source originale",
    });
  }

  return makeAttribution("unknown", "Source externe", sourceLabel, {
    primaryCtaLabel: "Voir la source originale",
  });
}

function canonicalListingSourceLabel(sourceName: string | null | undefined): string | undefined {
  return CANONICAL_LISTING_SOURCE_LABELS[normalizeSourceKey(sourceName)];
}

export function deriveListingPublicAttribution(
  listing: Pick<
    Listing,
    | "source_name"
    | "source_access_level"
    | "source_authorization_status"
    | "source_display_type"
    | "source_badge"
    | "result_origin"
  >,
): PublicAttribution {
  const sourceKey = normalizeSourceKey(listing.source_name);
  const canonicalLabel = canonicalListingSourceLabel(listing.source_name);
  const accessType = getSourceAccessType(sourceKey);

  if (accessType === "first_party") {
    return makeAttribution("first_party", "AkarFinder", "AkarFinder");
  }

  if (
    accessType === "partner_authorized" ||
    listing.source_access_level === "partner_full" ||
    listing.source_authorization_status === "confirmed"
  ) {
    return makeAttribution(
      "partner_authorized",
      "Partenaire autorisé",
      canonicalLabel ?? "Partenaire autorisé",
      { badge: "authorized_source" },
    );
  }

  if (
    listing.source_display_type === "external_web_result" ||
    listing.source_badge === "external_web_result" ||
    listing.result_origin === "search_api"
  ) {
    return makeAttribution(
      "external_web",
      "Résultat web externe",
      canonicalLabel ?? "Source originale",
      { badge: "external_web_result" },
    );
  }

  if (
    listing.source_display_type === "public_index_source" ||
    listing.source_badge === "public_indexed"
  ) {
    return makeAttribution(
      "public_index",
      "Source publique indexée",
      canonicalLabel ?? "Source originale",
      { badge: "public_indexed" },
    );
  }

  if (
    listing.source_display_type === "audit_source" ||
    listing.source_badge === "market_signal"
  ) {
    return makeAttribution(
      "market_signal",
      "Signal marché",
      canonicalLabel ?? "Source de marché",
      { badge: "market_signal" },
    );
  }

  return makeAttribution("unknown", "Source", "Origine à confirmer");
}
