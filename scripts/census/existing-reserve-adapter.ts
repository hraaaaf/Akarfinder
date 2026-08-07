import type { DomainDiscoveryObservation } from "./domain-census";

export type B3UnregisteredReserveRow = {
  source_domain: string;
  canonical_url: string;
  provider: string;
  last_seen_at?: string | null;
  decision: string;
};

export type CensusReviewPriority = "HIGH" | "MEDIUM" | "LOW" | "NOISE";

export type ReserveDomainReviewSignal = {
  domain: string;
  priority: CensusReviewPriority;
  reasons: string[];
};

const KNOWN_NOISE_DOMAINS = new Set([
  "duckduckgo.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "reddit.com",
  "google.com",
  "support.google.com",
  "microsoft.com",
  "support.microsoft.com",
  "answers.microsoft.com",
  "stackoverflow.com",
  "linkedin.com",
  "ma.linkedin.com",
  "play.google.com",
  "wikipedia.org",
  "en.wikipedia.org",
  "en.m.wikipedia.org",
]);

// Discovery heuristic only. A match increases review priority; it never proves
// that the domain is a real-estate source and never grants acquisition rights.
const REAL_ESTATE_NAME_SIGNAL =
  /(?:immo|immobilier|property|properties|realty|estate|housing|homes?|maison|logement|sakane|sakan|beyti?|dar)/i;

const CLASSIFIED_NAME_SIGNAL = /(?:annonce|annonces|classified|souq|souk|market)/i;

function normalizeDomain(rawDomain: string): string {
  const domain = rawDomain.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!domain || !domain.includes(".")) throw new Error(`Invalid source_domain: ${rawDomain}`);
  return domain;
}

function isKnownNoise(domain: string): boolean {
  if (KNOWN_NOISE_DOMAINS.has(domain)) return true;
  return [...KNOWN_NOISE_DOMAINS].some((noise) => domain.endsWith(`.${noise}`));
}

export function classifyReserveDomainForReview(rawDomain: string): ReserveDomainReviewSignal {
  const domain = normalizeDomain(rawDomain);
  const reasons: string[] = [];

  if (isKnownNoise(domain)) {
    return { domain, priority: "NOISE", reasons: ["known_non_property_platform"] };
  }

  if (REAL_ESTATE_NAME_SIGNAL.test(domain)) reasons.push("real_estate_domain_name_signal");
  if (CLASSIFIED_NAME_SIGNAL.test(domain)) reasons.push("classified_domain_name_signal");
  if (domain.endsWith(".ma")) reasons.push("morocco_ccTLD_signal");

  if (reasons.includes("real_estate_domain_name_signal")) {
    return { domain, priority: "HIGH", reasons };
  }
  if (reasons.includes("classified_domain_name_signal") && reasons.includes("morocco_ccTLD_signal")) {
    return { domain, priority: "HIGH", reasons };
  }
  if (reasons.includes("morocco_ccTLD_signal") || reasons.includes("classified_domain_name_signal")) {
    return { domain, priority: "MEDIUM", reasons };
  }

  return { domain, priority: "LOW", reasons: ["insufficient_domain_level_evidence"] };
}

export function adaptB3UnregisteredReserveRows(
  rows: B3UnregisteredReserveRow[],
): DomainDiscoveryObservation[] {
  return rows.map((row, index) => {
    if (row.decision !== "reserve_unregistered_source") {
      throw new Error(`Row ${index} is not an unregistered-source reserve candidate`);
    }
    const domain = normalizeDomain(row.source_domain);
    const url = new URL(row.canonical_url);
    const urlDomain = normalizeDomain(url.hostname);
    if (domain !== urlDomain) {
      throw new Error(`Row ${index} source_domain does not match canonical_url hostname`);
    }

    return {
      url: row.canonical_url,
      provider: row.provider,
      observedAt: row.last_seen_at ?? null,
      registered: false,
      reviewState: "UNREVIEWED",
    };
  });
}
