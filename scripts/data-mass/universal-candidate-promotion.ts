import {
  classifyReservoirCandidate,
  type CandidateClassification,
  type ReservoirCandidate,
} from "./reservoir-qualification";

export type ExternalIndexPromotionStatus = "EXTERNAL_INDEX_CANDIDATE" | "REJECTED";
export type ExternalIndexRejectionReason =
  | "INVALID_URL"
  | "NON_REAL_ESTATE"
  | "NON_LISTING_PAGE"
  | "FOREIGN_LIKELY"
  | "GEOGRAPHY_UNKNOWN"
  | "EXCLUDED_DOMAIN_ROLE";

export interface UniversalDiscoveryCandidate extends ReservoirCandidate {
  provider: string;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
}

export interface UniversalCandidatePromotionRow {
  canonicalUrl: string | null;
  sourceDomain: string;
  providers: string[];
  rawRows: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  classification: CandidateClassification | null;
  promotionStatus: ExternalIndexPromotionStatus;
  rejectionReason: ExternalIndexRejectionReason | null;
}

export interface UniversalCandidatePromotionSummary {
  rawRows: number;
  canonicalUrls: number;
  acceptedCanonicalUrls: number;
  rejectedCanonicalUrls: number;
  invalidUrlRows: number;
  duplicateRowsCollapsed: number;
  acceptedByDomain: Record<string, number>;
  rejectedByReason: Record<ExternalIndexRejectionReason, number>;
  acceptedByProvider: Record<string, number>;
}

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "yclid",
  "_ga",
  "_gl",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref_src",
]);

function isTrackingParam(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_PARAMS.has(normalized);
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

export function canonicalizeExternalIndexUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    parsed.hostname = normalizeDomain(parsed.hostname);
    parsed.hash = "";

    if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }

    const semanticParams = [...parsed.searchParams.entries()]
      .filter(([name]) => !isTrackingParam(name))
      .sort(([nameA, valueA], [nameB, valueB]) => {
        const byName = nameA.localeCompare(nameB);
        return byName || valueA.localeCompare(valueB);
      });

    parsed.search = "";
    for (const [name, value] of semanticParams) parsed.searchParams.append(name, value);

    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");

    return parsed.toString();
  } catch {
    return null;
  }
}

function minIso(values: Array<string | null | undefined>): string | null {
  const normalized = values.filter((value): value is string => Boolean(value)).sort();
  return normalized[0] ?? null;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const normalized = values.filter((value): value is string => Boolean(value)).sort();
  return normalized.at(-1) ?? null;
}

function mergeText(values: Array<string | null | undefined>): string | null {
  const normalized = [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort();
  return normalized.length ? normalized.join(" | ") : null;
}

function rejectionReason(classification: CandidateClassification): ExternalIndexRejectionReason | null {
  if (classification.domainRole === "SOCIAL" || classification.domainRole === "DISCOVERY_TRANSPORT" || classification.domainRole === "FOREIGN_ONLY") {
    return "EXCLUDED_DOMAIN_ROLE";
  }
  if (!classification.likelyRealEstate) return "NON_REAL_ESTATE";
  if (classification.pageKind !== "LIKELY_LISTING_DETAIL") return "NON_LISTING_PAGE";
  if (classification.geographyScope === "FOREIGN_LIKELY") return "FOREIGN_LIKELY";
  if (classification.geographyScope !== "MOROCCO_LIKELY") return "GEOGRAPHY_UNKNOWN";
  return null;
}

export function buildUniversalCandidatePromotionManifest(
  input: UniversalDiscoveryCandidate[],
): UniversalCandidatePromotionRow[] {
  const invalidRows: UniversalCandidatePromotionRow[] = [];
  const grouped = new Map<string, UniversalDiscoveryCandidate[]>();

  for (const candidate of input) {
    const canonicalUrl = canonicalizeExternalIndexUrl(candidate.url);
    if (!canonicalUrl) {
      invalidRows.push({
        canonicalUrl: null,
        sourceDomain: normalizeDomain(candidate.sourceDomain),
        providers: [candidate.provider].filter(Boolean).sort(),
        rawRows: 1,
        firstSeenAt: candidate.firstSeenAt ?? null,
        lastSeenAt: candidate.lastSeenAt ?? null,
        classification: null,
        promotionStatus: "REJECTED",
        rejectionReason: "INVALID_URL",
      });
      continue;
    }
    const rows = grouped.get(canonicalUrl) ?? [];
    rows.push(candidate);
    grouped.set(canonicalUrl, rows);
  }

  const canonicalRows: UniversalCandidatePromotionRow[] = [...grouped.entries()].map(([canonicalUrl, candidates]) => {
    const parsed = new URL(canonicalUrl);
    const sourceDomain = normalizeDomain(parsed.hostname);
    const merged: ReservoirCandidate = {
      sourceDomain,
      url: canonicalUrl,
      title: mergeText(candidates.map((candidate) => candidate.title)),
      snippet: mergeText(candidates.map((candidate) => candidate.snippet)),
      discoveryQuery: mergeText(candidates.map((candidate) => candidate.discoveryQuery)),
      contentFingerprint: null,
    };
    const classification = classifyReservoirCandidate(merged);
    const rejected = rejectionReason(classification);

    return {
      canonicalUrl,
      sourceDomain,
      providers: [...new Set(candidates.map((candidate) => candidate.provider).filter(Boolean))].sort(),
      rawRows: candidates.length,
      firstSeenAt: minIso(candidates.map((candidate) => candidate.firstSeenAt)),
      lastSeenAt: maxIso(candidates.map((candidate) => candidate.lastSeenAt)),
      classification,
      promotionStatus: rejected ? "REJECTED" : "EXTERNAL_INDEX_CANDIDATE",
      rejectionReason: rejected,
    };
  });

  return [...canonicalRows, ...invalidRows].sort((a, b) => {
    const urlA = a.canonicalUrl ?? `~${a.sourceDomain}`;
    const urlB = b.canonicalUrl ?? `~${b.sourceDomain}`;
    return urlA.localeCompare(urlB) || a.sourceDomain.localeCompare(b.sourceDomain);
  });
}

export function summarizeUniversalCandidatePromotion(
  rows: UniversalCandidatePromotionRow[],
): UniversalCandidatePromotionSummary {
  const acceptedByDomain: Record<string, number> = {};
  const acceptedByProvider: Record<string, number> = {};
  const rejectedByReason: Record<ExternalIndexRejectionReason, number> = {
    INVALID_URL: 0,
    NON_REAL_ESTATE: 0,
    NON_LISTING_PAGE: 0,
    FOREIGN_LIKELY: 0,
    GEOGRAPHY_UNKNOWN: 0,
    EXCLUDED_DOMAIN_ROLE: 0,
  };

  let rawRows = 0;
  let canonicalUrls = 0;
  let acceptedCanonicalUrls = 0;
  let rejectedCanonicalUrls = 0;
  let invalidUrlRows = 0;

  for (const row of rows) {
    rawRows += row.rawRows;
    if (row.canonicalUrl) canonicalUrls += 1;

    if (row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE") {
      acceptedCanonicalUrls += 1;
      acceptedByDomain[row.sourceDomain] = (acceptedByDomain[row.sourceDomain] ?? 0) + 1;
      for (const provider of row.providers) {
        acceptedByProvider[provider] = (acceptedByProvider[provider] ?? 0) + 1;
      }
    } else {
      if (row.canonicalUrl) rejectedCanonicalUrls += 1;
      else invalidUrlRows += row.rawRows;
      if (row.rejectionReason) rejectedByReason[row.rejectionReason] += 1;
    }
  }

  return {
    rawRows,
    canonicalUrls,
    acceptedCanonicalUrls,
    rejectedCanonicalUrls,
    invalidUrlRows,
    duplicateRowsCollapsed: rawRows - rows.length,
    acceptedByDomain: Object.fromEntries(Object.entries(acceptedByDomain).sort(([a], [b]) => a.localeCompare(b))),
    rejectedByReason,
    acceptedByProvider: Object.fromEntries(Object.entries(acceptedByProvider).sort(([a], [b]) => a.localeCompare(b))),
  };
}
