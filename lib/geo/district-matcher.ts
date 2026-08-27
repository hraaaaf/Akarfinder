// LISTING-DISTRICT-RECOVERY-1 — Matcher déterministe pour récupérer quartiers
// Analyse title, description, source_url sans scraping ni API externe

import { MOROCCO_DISTRICTS, getDistrictsForCity } from "./district-dictionary";

export type MatchConfidence = "high" | "medium" | "low";

export type DistrictMatch = {
  district: string | null;
  confidence: MatchConfidence;
  source: "title" | "description" | "source_url" | "metadata" | "none";
  reason: string;
  applyEligible: boolean;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Supprimer accents
    .replace(/[-_\s]+/g, " ") // Normaliser tirets/underscores/espaces
    .trim();
}

function matchDistrict(
  text: string | null,
  possibleDistricts: string[]
): { district: string | null; confidence: MatchConfidence } {
  if (!text) return { district: null, confidence: "low" };

  const normalized = normalize(text);
  const words = normalized.split(/\s+/);

  for (const district of possibleDistricts) {
    const districtNorm = normalize(district);

    // Exact match
    if (normalized.includes(districtNorm)) {
      return { district, confidence: "high" };
    }

    // Partial word match (au moins 3 caractères)
    const districtWords = districtNorm.split(/\s+/);
    for (const dw of districtWords) {
      if (dw.length >= 3 && words.some((w) => w.includes(dw))) {
        return { district, confidence: "medium" };
      }
    }
  }

  return { district: null, confidence: "low" };
}

function explicitDistrictFromSourceUrl(city: string, sourceUrl: string): string | null {
  const possibleDistricts = getDistrictsForCity(city);
  if (possibleDistricts.length === 0) return null;

  let pathname = sourceUrl;
  try {
    pathname = new URL(sourceUrl).pathname;
  } catch {
    // Relative/legacy source URLs are still safe to inspect segment-by-segment.
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Invalid percent-encoding is treated literally and cannot create a match.
      }
      return normalize(decoded).replace(/\s+/g, "-");
    });

  for (const district of possibleDistricts) {
    const districtSlug = normalize(district).replace(/\s+/g, "-");
    if (segments.includes(districtSlug)) return district;
  }

  return null;
}

export function hasExplicitSourceUrlDistrictConflict(
  city: string | null,
  requestedDistrict: string | null,
  sourceUrl: string | null,
): boolean {
  if (!city || !requestedDistrict || !sourceUrl) return false;

  const possibleDistricts = getDistrictsForCity(city);
  if (possibleDistricts.length === 0) return false;

  const requestedMatch = matchDistrict(requestedDistrict, possibleDistricts);
  if (!requestedMatch.district || requestedMatch.confidence !== "high") return false;

  const sourceDistrict = explicitDistrictFromSourceUrl(city, sourceUrl);
  if (!sourceDistrict) return false;

  return normalize(sourceDistrict) !== normalize(requestedMatch.district);
}

export function findDistrict(
  city: string | null,
  title: string | null,
  description: string | null,
  sourceUrl: string | null
): DistrictMatch {
  if (!city) {
    return {
      district: null,
      confidence: "low",
      source: "none",
      reason: "City unknown",
      applyEligible: false,
    };
  }

  const possibleDistricts = getDistrictsForCity(city);
  if (possibleDistricts.length === 0) {
    return {
      district: null,
      confidence: "low",
      source: "none",
      reason: `No districts defined for city: ${city}`,
      applyEligible: false,
    };
  }

  // Priority 1 : Title (most informative)
  const titleMatch = matchDistrict(title, possibleDistricts);
  if (titleMatch.district) {
    return {
      district: titleMatch.district,
      confidence: titleMatch.confidence,
      source: "title",
      reason: `Matched in title with ${titleMatch.confidence} confidence`,
      applyEligible: titleMatch.confidence === "high",
    };
  }

  // Priority 2 : Description (only high confidence eligible)
  const descMatch = matchDistrict(description, possibleDistricts);
  if (descMatch.district) {
    return {
      district: descMatch.district,
      confidence: descMatch.confidence,
      source: "description",
      reason: `Matched in description with ${descMatch.confidence} confidence`,
      applyEligible: descMatch.confidence === "high",
    };
  }

  // Priority 3 : Source URL (slug-based matching, high confidence only)
  const sourceUrlMatch = matchDistrict(sourceUrl, possibleDistricts);
  if (sourceUrlMatch.district && sourceUrlMatch.confidence === "high") {
    return {
      district: sourceUrlMatch.district,
      confidence: "high",
      source: "source_url",
      reason: `Matched in source_url with high confidence`,
      applyEligible: true,
    };
  }

  return {
    district: null,
    confidence: "low",
    source: "none",
    reason: "No match found",
    applyEligible: false,
  };
}
