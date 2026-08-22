import type { UniversalCandidatePromotionRow } from "./universal-candidate-promotion";

export const M3_NATIVE_PROVIDERS = ["openserp", "serper_mass_harvest"] as const;
export type M3NativeProvider = (typeof M3_NATIVE_PROVIDERS)[number];

export interface M3SourceAdapterConfig {
  schemaVersion: "MASS_INDEX_M3_ADAPTER_V1";
  sourceDomain: string;
  discoveryMode: "EXISTING_DISCOVERY_RESERVOIR_ONLY";
  providers: readonly M3NativeProvider[];
  candidateReadBudget: number;
  validListingCanaryBudget: number;
  maxErrorCount: number;
  maxErrorRate: number;
  sourceNetworkRequestBudget: 0;
  directFetchAllowed: false;
  publicActivationAllowed: false;
}

export interface M3SourceCanaryReport {
  schemaVersion: "MASS_INDEX_M3_CANARY_REPORT_V1";
  sourceDomain: string;
  candidateCanonicalUrls: number;
  validListings: number;
  rejectedCanonicalUrls: number;
  candidateToValidListingYield: number | null;
  rejectedByReason: Record<string, number>;
  canaryCanonicalUrls: string[];
  adapterErrors: number;
  circuitBreaker: "CLOSED" | "OPEN";
  invariants: {
    readOnly: true;
    databaseWrites: 0;
    sourceNetworkRequests: 0;
    directFetch: false;
    publicActivation: false;
    providerRelabels: 0;
  };
}

const PRIORITY_DOMAINS = [
  "marocannonces.com",
  "yakeey.com",
  "domio.ma",
  "2p.ma",
  "sakane.ma",
  "1000-annonces.com",
  "housing.place",
  "expat.com",
  "milkiya.ma",
  "portail-immobilier.ma",
] as const;

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

/**
 * Fail-closed source-specific detail-page gate built only from structures already
 * present in the discovery reservoir. M3 never fetches a source to infer these.
 * A generic M1 "likely detail" classification is necessary but not sufficient.
 */
export function isM3SourceSpecificListingUrl(sourceDomain: string, rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const domain = normalizeDomain(sourceDomain);
  if (normalizeDomain(parsed.hostname) !== domain) return false;
  const path = decodeURIComponent(parsed.pathname);

  switch (domain) {
    case "marocannonces.com":
      return /\/categorie\/\d+\/[^/]+\/annonce\/\d+\//i.test(path);
    case "yakeey.com":
      return /\/fr-ma\/(?:acheter|louer)-.+-[a-z]{2}\d+$/i.test(path);
    case "domio.ma":
      return /\/\d{3,}\//.test(path) && !/\/agents-immobiliers\//i.test(path);
    case "2p.ma":
      return false;
    case "sakane.ma":
      return !/\/(?:recherche|annonce\/mark)\//i.test(path) && /\/\d{3,}\/[^/]+$/i.test(path);
    case "1000-annonces.com":
      return /-A\d+\.html$/i.test(path);
    case "housing.place":
      return /\/fr-ma\/catalogue\/annonces\/[a-z0-9-]+$/i.test(path);
    case "expat.com":
      return /\/\d{2,3}-[^/]+\/\d{5,}-[^/]+\.html$/i.test(path);
    case "milkiya.ma":
      return /\/Bien\//i.test(path);
    case "portail-immobilier.ma":
      return false;
    default:
      return false;
  }
}

export function buildM3PriorityAdapterConfigs(): M3SourceAdapterConfig[] {
  return PRIORITY_DOMAINS.map((sourceDomain) => ({
    schemaVersion: "MASS_INDEX_M3_ADAPTER_V1",
    sourceDomain,
    discoveryMode: "EXISTING_DISCOVERY_RESERVOIR_ONLY",
    providers: M3_NATIVE_PROVIDERS,
    candidateReadBudget: 40,
    validListingCanaryBudget: 10,
    maxErrorCount: 2,
    maxErrorRate: 0.2,
    sourceNetworkRequestBudget: 0,
    directFetchAllowed: false,
    publicActivationAllowed: false,
  }));
}

export function validateM3AdapterConfigs(configs: M3SourceAdapterConfig[]): void {
  if (configs.length === 0) throw new Error("M3_EMPTY_ADAPTER_CONFIG");
  const domains = new Set<string>();
  for (const config of configs) {
    const domain = normalizeDomain(config.sourceDomain);
    if (!domain) throw new Error("M3_EMPTY_SOURCE_DOMAIN");
    if (domains.has(domain)) throw new Error(`M3_DUPLICATE_SOURCE_DOMAIN:${domain}`);
    domains.add(domain);
    if (config.schemaVersion !== "MASS_INDEX_M3_ADAPTER_V1") throw new Error(`M3_SCHEMA_DRIFT:${domain}`);
    if (config.discoveryMode !== "EXISTING_DISCOVERY_RESERVOIR_ONLY") throw new Error(`M3_DISCOVERY_MODE_DRIFT:${domain}`);
    if (config.sourceNetworkRequestBudget !== 0 || config.directFetchAllowed || config.publicActivationAllowed) {
      throw new Error(`M3_SIDE_EFFECT_BUDGET_DRIFT:${domain}`);
    }
    if (!Number.isInteger(config.candidateReadBudget) || config.candidateReadBudget < 1 || config.candidateReadBudget > 50) {
      throw new Error(`M3_CANDIDATE_BUDGET_INVALID:${domain}`);
    }
    if (!Number.isInteger(config.validListingCanaryBudget) || config.validListingCanaryBudget < 1 || config.validListingCanaryBudget > 10 || config.validListingCanaryBudget > config.candidateReadBudget) {
      throw new Error(`M3_CANARY_BUDGET_INVALID:${domain}`);
    }
    if (!Number.isInteger(config.maxErrorCount) || config.maxErrorCount < 0 || config.maxErrorCount > config.candidateReadBudget) {
      throw new Error(`M3_ERROR_BUDGET_INVALID:${domain}`);
    }
    if (!Number.isFinite(config.maxErrorRate) || config.maxErrorRate < 0 || config.maxErrorRate > 1) {
      throw new Error(`M3_ERROR_RATE_INVALID:${domain}`);
    }
    const providers = [...config.providers];
    if (providers.length !== new Set(providers).size || providers.some((provider) => !M3_NATIVE_PROVIDERS.includes(provider))) {
      throw new Error(`M3_PROVIDER_DRIFT:${domain}`);
    }
  }
}

export function evaluateM3CircuitBreaker(
  config: M3SourceAdapterConfig,
  attemptedCandidates: number,
  adapterErrors: number,
): "CLOSED" | "OPEN" {
  if (!Number.isInteger(attemptedCandidates) || attemptedCandidates < 0) throw new Error("M3_INVALID_ATTEMPT_COUNT");
  if (!Number.isInteger(adapterErrors) || adapterErrors < 0 || adapterErrors > attemptedCandidates) throw new Error("M3_INVALID_ERROR_COUNT");
  if (adapterErrors > config.maxErrorCount) return "OPEN";
  const rate = attemptedCandidates === 0 ? 0 : adapterErrors / attemptedCandidates;
  return rate > config.maxErrorRate ? "OPEN" : "CLOSED";
}

export function buildM3SourceCanaryReport(
  config: M3SourceAdapterConfig,
  promotionRows: UniversalCandidatePromotionRow[],
  adapterErrors = 0,
): M3SourceCanaryReport {
  validateM3AdapterConfigs([config]);
  const domain = normalizeDomain(config.sourceDomain);
  const rows = promotionRows.filter((row) => normalizeDomain(row.sourceDomain) === domain);
  if (rows.length > config.candidateReadBudget) throw new Error(`M3_CANDIDATE_BUDGET_EXCEEDED:${domain}:${rows.length}`);
  const allowedProviders = new Set<string>(config.providers);
  for (const row of rows) {
    if (row.providers.some((provider) => !allowedProviders.has(provider))) {
      throw new Error(`M3_UNSUPPORTED_PROVIDER:${domain}:${row.providers.join(",")}`);
    }
  }

  const accepted = rows.filter(
    (row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE" && Boolean(row.canonicalUrl) && isM3SourceSpecificListingUrl(domain, row.canonicalUrl!),
  );
  const rejected = rows.filter((row) => !accepted.includes(row));
  const rejectedByReason: Record<string, number> = {};
  for (const row of rejected) {
    const reason =
      row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE"
        ? "SOURCE_STRUCTURE_NOT_LISTING"
        : row.rejectionReason ?? "UNKNOWN";
    rejectedByReason[reason] = (rejectedByReason[reason] ?? 0) + 1;
  }
  const attempted = rows.length + adapterErrors;
  const circuitBreaker = evaluateM3CircuitBreaker(config, attempted, adapterErrors);
  const validListings = accepted.length;

  return {
    schemaVersion: "MASS_INDEX_M3_CANARY_REPORT_V1",
    sourceDomain: domain,
    candidateCanonicalUrls: rows.length,
    validListings,
    rejectedCanonicalUrls: rejected.length,
    candidateToValidListingYield: rows.length === 0 ? null : validListings / rows.length,
    rejectedByReason,
    canaryCanonicalUrls: accepted
      .map((row) => row.canonicalUrl)
      .filter((value): value is string => Boolean(value))
      .slice(0, config.validListingCanaryBudget),
    adapterErrors,
    circuitBreaker,
    invariants: {
      readOnly: true,
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      directFetch: false,
      publicActivation: false,
      providerRelabels: 0,
    },
  };
}

export function assertM3SourceCanaryReport(config: M3SourceAdapterConfig, report: M3SourceCanaryReport): void {
  if (report.schemaVersion !== "MASS_INDEX_M3_CANARY_REPORT_V1") throw new Error("M3_REPORT_SCHEMA_DRIFT");
  if (normalizeDomain(report.sourceDomain) !== normalizeDomain(config.sourceDomain)) throw new Error("M3_REPORT_DOMAIN_DRIFT");
  if (report.candidateCanonicalUrls > config.candidateReadBudget) throw new Error("M3_REPORT_CANDIDATE_BUDGET_DRIFT");
  if (report.canaryCanonicalUrls.length > config.validListingCanaryBudget) throw new Error("M3_REPORT_CANARY_BUDGET_DRIFT");
  if (report.validListings + report.rejectedCanonicalUrls !== report.candidateCanonicalUrls) throw new Error("M3_REPORT_ACCOUNTING_DRIFT");
  if (report.candidateCanonicalUrls === 0 && report.candidateToValidListingYield !== null) throw new Error("M3_REPORT_UNMEASURED_YIELD_DRIFT");
  if (report.candidateCanonicalUrls > 0 && (report.candidateToValidListingYield === null || report.candidateToValidListingYield < 0 || report.candidateToValidListingYield > 1)) throw new Error("M3_REPORT_YIELD_DRIFT");
  if (report.circuitBreaker !== "CLOSED") throw new Error(`M3_CIRCUIT_BREAKER_OPEN:${report.sourceDomain}`);
  if (!report.invariants.readOnly || report.invariants.databaseWrites !== 0 || report.invariants.sourceNetworkRequests !== 0 || report.invariants.directFetch || report.invariants.publicActivation || report.invariants.providerRelabels !== 0) {
    throw new Error(`M3_REPORT_SIDE_EFFECT_DRIFT:${report.sourceDomain}`);
  }
}
