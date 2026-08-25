// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 13-15.
// Wraps classify.ts's classifyOpenSerpResult (unchanged pilot logic, national
// city/district extractors injected) with the additional gates the mission
// requires before ANY discovered result may become a public listing:
//   - source domain must be "approved_discovery"/"partner"/"authorized_static"
//     in the registry (section 12) — unclassified/blocked domains never admit;
//   - safe http(s) URL, no javascript:/data: scheme;
//   - no PII surviving redaction (phone/WhatsApp/email/secret-token hits);
//   - admission confidence HIGH/MEDIUM, OR explicit ville+quartier+prix facts
//     on a quarantined real-estate candidate.
// Never fetches a URL, never invents a field: every value here already
// existed on the SERP result (title/snippet/url) or is null.

import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpClassifiedResult, OpenSerpIngestionQuery } from "./types";
import { classifyOpenSerpResult } from "./classify";
import { extractCityNational, extractDistrictNational } from "./national-utils";
import { redactSensitiveText, toTransactionType } from "./utils";
import { getDomainStatus, isDomainAdmissible, isDomainExternalWebResult } from "./domain-registry";
import { hasMinimumListingFacts } from "./minimum-listing-facts";

export type AdmissionConfidence = "high" | "medium" | "low";

export type AdmissionDecision = {
  admitted: boolean;
  confidence: AdmissionConfidence;
  reasons: string[];
  classified: OpenSerpClassifiedResult | null;
  domain_status: ReturnType<typeof getDomainStatus>;
  external_web_result: boolean;
};

const MINIMUM_FACTS_OVERRIDE_REASON = "minimum_city_district_price_override";

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !/^(javascript|data):/i.test(value);
  } catch {
    return false;
  }
}

function hasSensitiveValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const redacted = redactSensitiveText(value);
  return (
    redacted.phone_hits > 0 || redacted.whatsapp_hits > 0 || redacted.personal_email_hits > 0 || redacted.secret_hits > 0
  );
}

// Structural page-type checks beyond classify.ts's own lane logic — a second,
// independent guard against homepages/category/search/profile pages slipping
// through as "individual_listing" purely from a strong URL regex match.
function looksLikeNonListingPage(canonicalUrl: string, sourceDomain: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(canonicalUrl).pathname;
  } catch {
    return true;
  }
  if (pathname === "/" || pathname === "") return true; // homepage
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  // A bare 1-segment path on a portal domain is very likely a category/
  // search hub, not a single listing (individual listing URLs on every
  // approved domain carry a numeric ID or multi-segment slug — see
  // data/openserp/source-domain-registry.json listing_url_patterns).
  if (segments.length === 1 && !/\d/.test(segments[0]) && sourceDomain !== segments[0]) {
    return true;
  }
  // A final segment that is a bare plural category noun + transaction verb
  // ("maisons-a-vendre", "villas-a-louer", "appartements-a-vendre", ...)
  // with no numeric ID anywhere in the path is a search/category hub for
  // that category, not one specific unit -- regardless of how many path
  // segments precede it.
  const lastSegment = segments[segments.length - 1];
  const hasNumericId = segments.some((segment) => /\d/.test(segment));
  if (!hasNumericId && /^(appartements?|villas?|terrains?|bureaux|maisons?|studios?)-a-(vendre|louer)$/.test(lastSegment)) {
    return true;
  }
  return false;
}

export function decideAdmission(input: {
  result: OpenSerpRawResult;
  query: OpenSerpIngestionQuery;
  // OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1: "searxng_yandex" added for the
  // same reason as classify.ts's identical widening -- a pure provenance
  // label, no admission-gating logic anywhere in this file branches on it.
  engine: "bing" | "ecosia" | "duckduckgo" | "searxng_yandex";
  discovered_at: string;
  fallbackRank: number;
}): AdmissionDecision {
  const classified = classifyOpenSerpResult({
    result: input.result,
    query: input.query,
    engine: input.engine,
    discovered_at: input.discovered_at,
    fallbackRank: input.fallbackRank,
    extractCityFn: extractCityNational,
    extractDistrictFn: extractDistrictNational,
  });

  if (!classified) {
    return {
      admitted: false,
      confidence: "low",
      reasons: ["unparseable_result"],
      classified: null,
      domain_status: "unclassified",
      external_web_result: false,
    };
  }

  const domainStatus = getDomainStatus(classified.source_domain);
  const domainAdmissible = isDomainAdmissible(classified.source_domain);
  const reasons: string[] = [...classified.classification_reasons];
  const minimumListingFacts = hasMinimumListingFacts(classified);

  // Defense-in-depth consistency check: independently re-derive transaction
  // type from the title alone and reject contradictions rather than "fixing"
  // them from weaker snippet/URL/query evidence.
  const independentTransactionCheck = toTransactionType(classified.title);
  if (
    independentTransactionCheck !== null &&
    classified.extracted.transaction_type !== null &&
    independentTransactionCheck !== classified.extracted.transaction_type
  ) {
    reasons.push("transaction_type_inconsistent");
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  if (!domainAdmissible) {
    reasons.push(`domain_status_${domainStatus}`);
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  // Normal path remains `individual_listing`. The only widened lane is
  // `quarantine`, and only when ville + quartier + trusted price are explicit
  // facts in the indexed result. Discovery/category/out-of-scope lanes remain
  // blocked even if their snippet happens to preview a listing.
  const minimumFactsLaneOverride =
    classified.classification_lane === "quarantine" && minimumListingFacts;
  if (classified.classification_lane !== "individual_listing" && !minimumFactsLaneOverride) {
    reasons.push(`classification_lane_${classified.classification_lane}`);
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }
  if (minimumFactsLaneOverride) reasons.push(MINIMUM_FACTS_OVERRIDE_REASON);

  if (!isSafeExternalUrl(classified.canonical_source_url) || !isSafeExternalUrl(classified.original_url)) {
    reasons.push("unsafe_external_url");
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  if (
    hasSensitiveValue(classified.title) ||
    hasSensitiveValue(classified.snippet) ||
    hasSensitiveValue(classified.original_url)
  ) {
    reasons.push("pii_or_secret_detected");
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  if (looksLikeNonListingPage(classified.canonical_source_url, classified.source_domain)) {
    reasons.push("looks_like_non_listing_page");
    return {
      admitted: false,
      confidence: "low",
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  const confidence: AdmissionConfidence = classified.classification_reasons.includes("strong_individual_path")
    ? "high"
    : classified.classification_reasons.includes("textual_detail_signals")
      ? "medium"
      : "low";

  if (confidence === "low" && !minimumListingFacts) {
    reasons.push("insufficient_admission_confidence");
    return {
      admitted: false,
      confidence,
      reasons,
      classified,
      domain_status: domainStatus,
      external_web_result: isDomainExternalWebResult(classified.source_domain),
    };
  }

  if (confidence === "low" && minimumListingFacts && !reasons.includes(MINIMUM_FACTS_OVERRIDE_REASON)) {
    reasons.push(MINIMUM_FACTS_OVERRIDE_REASON);
  }

  return {
    admitted: true,
    confidence,
    reasons,
    classified,
    domain_status: domainStatus,
    external_web_result: isDomainExternalWebResult(classified.source_domain),
  };
}
