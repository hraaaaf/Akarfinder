// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 13-15.
// Wraps classify.ts's classifyOpenSerpResult (unchanged pilot logic, national
// city/district extractors injected) with the additional gates the mission
// requires before ANY discovered result may become a public listing:
//   - source domain must be "approved_discovery"/"partner"/"authorized_static"
//     in the registry (section 12) — unclassified/blocked domains never admit;
//   - safe http(s) URL, no javascript:/data: scheme;
//   - no PII surviving redaction (phone/WhatsApp/email/secret-token hits);
//   - admission confidence HIGH (strong per-domain URL pattern matched) or
//     MEDIUM (textual detail signals) — anything weaker stays unclassified.
// Never fetches a URL, never invents a field: every value here already
// existed on the SERP result (title/snippet/url) or is null.

import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpClassifiedResult, OpenSerpIngestionQuery } from "./types";
import { classifyOpenSerpResult } from "./classify";
import { extractCityNational, extractDistrictNational } from "./national-utils";
import { redactSensitiveText, toTransactionType } from "./utils";
import { getDomainStatus, isDomainAdmissible, isDomainExternalWebResult } from "./domain-registry";

export type AdmissionConfidence = "high" | "medium" | "low";

export type AdmissionDecision = {
  admitted: boolean;
  confidence: AdmissionConfidence;
  reasons: string[];
  classified: OpenSerpClassifiedResult | null;
  domain_status: ReturnType<typeof getDomainStatus>;
  external_web_result: boolean;
};

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
  return false;
}

export function decideAdmission(input: {
  result: OpenSerpRawResult;
  query: OpenSerpIngestionQuery;
  engine: "bing" | "ecosia" | "duckduckgo";
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

  // Defense-in-depth consistency check, added after this mission's own
  // Wave 1 apply found an admitted candidate whose stored transaction_type
  // ("sale") contradicted its own title's plain-language content ("a
  // Louer"/rent) -- the exact mechanism was not conclusively reproduced
  // via static analysis of classify.ts's fallback formula, so rather than
  // changing shared, pilot-critical logic on a guess, this independently
  // re-derives the transaction type from the TITLE ALONE (the single most
  // reliable, human-facing signal -- unlike classify.ts's own combined
  // title+snippet+URL derivation, a snippet or URL slug disagreeing with
  // the title cannot silently override it here) and refuses to admit if it
  // contradicts the stored value. Never silently "fixes" the value -- an
  // inconsistent candidate is excluded, not corrected.
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

  if (classified.classification_lane !== "individual_listing") {
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

  if (confidence === "low") {
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

  return {
    admitted: true,
    confidence,
    reasons,
    classified,
    domain_status: domainStatus,
    external_web_result: isDomainExternalWebResult(classified.source_domain),
  };
}
