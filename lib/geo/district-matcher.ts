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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_\s]+/g, " ")
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
    if (normalized.includes(districtNorm)) return { district, confidence: "high" };

    const districtWords = districtNorm.split(/\s+/);
    for (const dw of districtWords) {
      if (dw.length >= 3 && words.some((w) => w.includes(dw))) {
        return { district, confidence: "medium" };
      }
    }
  }

  return { district: null, confidence: "low" };
}

function matchSourceUrlDistrict(
  sourceUrl: string | null,
  possibleDistricts: string[]
): { district: string | null; confidence: MatchConfidence } {
  if (!sourceUrl) return { district: null, confidence: "low" };

  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => normalize(decodeURIComponent(segment)));

    for (const district of possibleDistricts) {
      const districtNorm = normalize(district);
      if (segments.some((segment) => segment === districtNorm)) {
        return { district, confidence: "high" };
      }
    }
  } catch {
    return { district: null, confidence: "low" };
  }

  return { district: null, confidence: "low" };
}

export function findDistrict(
  city: string | null,
  title: string | null,
  description: string | null,
  sourceUrl: string | null
): DistrictMatch {
  if (!city) {
    return { district: null, confidence: "low", source: "none", reason: "City unknown", applyEligible: false };
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

  const sourceUrlMatch = matchSourceUrlDistrict(sourceUrl, possibleDistricts);
  const titleMatch = matchDistrict(title, possibleDistricts);

  if (
    sourceUrlMatch.district &&
    titleMatch.district &&
    titleMatch.confidence === "high" &&
    sourceUrlMatch.district !== titleMatch.district
  ) {
    return {
      district: null,
      confidence: "low",
      source: "none",
      reason: `Conflicting explicit districts: source_url=${sourceUrlMatch.district}, title=${titleMatch.district}`,
      applyEligible: false,
    };
  }

  if (sourceUrlMatch.district) {
    return {
      district: sourceUrlMatch.district,
      confidence: "high",
      source: "source_url",
      reason: "Matched exact district path segment in source_url",
      applyEligible: true,
    };
  }

  if (titleMatch.district) {
    return {
      district: titleMatch.district,
      confidence: titleMatch.confidence,
      source: "title",
      reason: `Matched in title with ${titleMatch.confidence} confidence`,
      applyEligible: titleMatch.confidence === "high",
    };
  }

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

  return { district: null, confidence: "low", source: "none", reason: "No match found", applyEligible: false };
}
