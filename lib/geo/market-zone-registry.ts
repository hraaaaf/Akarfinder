import { geometryAreaKm2 } from "@/lib/geo/geometry-area";
import {
  type NeighborhoodGeometry,
  validateNeighborhoodGeometryRecord,
} from "@/lib/geo/neighborhood-geometry-registry";

export type MarketZonePublicationStatus = "shadow" | "canary" | "published";

export type MarketZoneEvidenceSource = {
  provider: string;
  dataset: string;
  sourceUrl: string;
  licenseId?: string;
  licenseUrl?: string;
  attribution?: string;
  retrievedAt: string;
  sourceEntityType?: string;
  sourceEntityId?: number | string;
  digestSha256?: string;
};

export type MarketZoneRecord = {
  version: "v1";
  id: string;
  cityCanonicalId: string;
  slug: string;
  displayName: string;
  aliases: readonly string[];
  semanticType: "market_zone";
  officialBoundary: false;
  canonicalNeighborhoodIds: readonly string[];
  geometry: NeighborhoodGeometry;
  areaKm2: number;
  derivationMethod: string;
  evidence: readonly MarketZoneEvidenceSource[];
  publicationStatus: MarketZonePublicationStatus;
  reviewed: boolean;
  notes: readonly string[];
};

export type MarketZoneValidationIssue = {
  code:
    | "invalid_id"
    | "invalid_semantic_type"
    | "official_boundary_forbidden"
    | "missing_binding"
    | "missing_derivation"
    | "missing_evidence"
    | "invalid_area"
    | "area_mismatch"
    | "invalid_geometry"
    | "production_without_review";
  message: string;
};

export function validateMarketZoneRecord(record: MarketZoneRecord): MarketZoneValidationIssue[] {
  const issues: MarketZoneValidationIssue[] = [];

  if (!record.id.startsWith("market_zone_")) {
    issues.push({ code: "invalid_id", message: "Une market zone doit utiliser un identifiant market_zone_* stable." });
  }
  if (record.semanticType !== "market_zone") {
    issues.push({ code: "invalid_semantic_type", message: "La sémantique doit rester explicitement market_zone." });
  }
  if (record.officialBoundary !== false) {
    issues.push({ code: "official_boundary_forbidden", message: "Une market zone AkarFinder ne peut jamais être présentée comme frontière officielle." });
  }
  if (!record.canonicalNeighborhoodIds.length) {
    issues.push({ code: "missing_binding", message: "Une market zone doit déclarer au moins un binding canonique AkarFinder." });
  }
  if (!record.derivationMethod.trim()) {
    issues.push({ code: "missing_derivation", message: "La méthode de dérivation doit être documentée." });
  }
  if (!record.evidence.length || record.evidence.some((source) => !source.provider.trim() || !source.dataset.trim() || !source.sourceUrl.trim() || !source.retrievedAt.trim())) {
    issues.push({ code: "missing_evidence", message: "Chaque market zone doit conserver une provenance exploitable." });
  }
  if (!Number.isFinite(record.areaKm2) || record.areaKm2 <= 0) {
    issues.push({ code: "invalid_area", message: "areaKm2 doit être strictement positive et finie." });
  }

  const geometryIssues = validateNeighborhoodGeometryRecord({
    version: "v1",
    cityCanonicalId: record.cityCanonicalId,
    neighborhoodCanonicalId: record.id,
    displayName: record.displayName,
    aliases: record.aliases,
    geometry: record.geometry,
    source: {
      provider: record.evidence[0]?.provider ?? "AkarFinder",
      dataset: record.evidence[0]?.dataset ?? "market-zone",
      sourceUrl: record.evidence[0]?.sourceUrl ?? "about:blank",
      licenseId: record.evidence[0]?.licenseId ?? "DERIVED",
      licenseUrl: record.evidence[0]?.licenseUrl ?? "about:blank",
      attribution: record.evidence[0]?.attribution ?? "AkarFinder market zone",
      retrievedAt: record.evidence[0]?.retrievedAt ?? "1970-01-01T00:00:00.000Z",
    },
    publicationStatus: record.publicationStatus,
    reviewed: record.reviewed,
  });
  if (geometryIssues.length) {
    issues.push({ code: "invalid_geometry", message: geometryIssues.map((issue) => issue.message).join(" ") });
  }

  if (Number.isFinite(record.areaKm2) && record.areaKm2 > 0) {
    const calculated = geometryAreaKm2(record.geometry);
    const relativeError = Math.abs(calculated - record.areaKm2) / record.areaKm2;
    if (!Number.isFinite(calculated) || relativeError > 1e-6) {
      issues.push({ code: "area_mismatch", message: `areaKm2=${record.areaKm2} ne correspond pas à la géométrie recalculée (${calculated}).` });
    }
  }

  if (record.publicationStatus !== "shadow" && !record.reviewed) {
    issues.push({ code: "production_without_review", message: "Une market zone ne peut quitter Shadow sans revue explicite." });
  }

  return issues;
}

export function marketZonesChangeRanking(): false {
  return false;
}
