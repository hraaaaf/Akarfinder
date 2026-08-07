export type CensusDomainKind =
  | "AGENCY"
  | "PROMOTER"
  | "PORTAL"
  | "CLASSIFIED"
  | "BANK_INVENTORY"
  | "OTHER"
  | "UNKNOWN";

export type CensusTechSignal =
  | "SITEMAP"
  | "JSON_LD"
  | "SCHEMA_ORG"
  | "WORDPRESS"
  | "HOUZEZ"
  | "REALHOMES"
  | "REST"
  | "XML"
  | "CSV"
  | "OTHER";

export type CensusRegistryState = "REGISTERED" | "UNREGISTERED" | "UNKNOWN";
export type CensusReviewState = "UNREVIEWED" | "REVIEW_REQUIRED" | "REVIEWED";

export type DomainDiscoveryObservation = {
  url: string;
  provider: string;
  observedAt?: string | null;
  kindHint?: CensusDomainKind | null;
  kindEvidence?: string | null;
  techSignals?: CensusTechSignal[];
  cities?: string[];
  registered?: boolean | null;
  effectivePolicy?: string | null;
  reviewState?: CensusReviewState | null;
};

export type DomainProviderStat = {
  provider: string;
  observations: number;
};

export type DomainCensusCandidate = {
  domain: string;
  observedUrlCount: number;
  observationCount: number;
  providers: DomainProviderStat[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  sampleUrls: string[];
  kind: CensusDomainKind;
  kindEvidence: string[];
  cities: string[];
  techSignals: CensusTechSignal[];
  registryState: CensusRegistryState;
  effectivePolicy: string | null;
  reviewState: CensusReviewState;
  blockers: string[];
};

export type DomainCensusReport = {
  schemaVersion: "data-1-domain-census-v1";
  generatedAt: string;
  observations: number;
  domains: number;
  registeredDomains: number;
  unregisteredDomains: number;
  unknownRegistryDomains: number;
  candidates: DomainCensusCandidate[];
};

const KIND_VALUES = new Set<CensusDomainKind>([
  "AGENCY",
  "PROMOTER",
  "PORTAL",
  "CLASSIFIED",
  "BANK_INVENTORY",
  "OTHER",
  "UNKNOWN",
]);

const TECH_VALUES = new Set<CensusTechSignal>([
  "SITEMAP",
  "JSON_LD",
  "SCHEMA_ORG",
  "WORDPRESS",
  "HOUZEZ",
  "REALHOMES",
  "REST",
  "XML",
  "CSV",
  "OTHER",
]);

function normalizedText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized;
}

export function canonicalizeCensusUrl(rawUrl: string): { url: string; domain: string } {
  const input = normalizedText(rawUrl, "url");
  const parsed = new URL(input);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || !hostname.includes(".")) {
    throw new Error(`Unsupported census hostname: ${hostname || "<empty>"}`);
  }

  const domain = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  parsed.hostname = domain;
  parsed.hash = "";

  return { url: parsed.toString(), domain };
}

function parseObservedAt(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid observedAt timestamp: ${value}`);
  return new Date(timestamp).toISOString();
}

function normalizeCity(value: string): string {
  return normalizedText(value, "city").replace(/\s+/g, " ");
}

function resolveKind(observations: DomainDiscoveryObservation[]): {
  kind: CensusDomainKind;
  evidence: string[];
  blocker?: string;
} {
  const hintedKinds = new Set<CensusDomainKind>();
  const evidence = new Set<string>();

  for (const observation of observations) {
    if (observation.kindHint) {
      if (!KIND_VALUES.has(observation.kindHint)) {
        throw new Error(`Unsupported kindHint: ${String(observation.kindHint)}`);
      }
      if (observation.kindHint !== "UNKNOWN") hintedKinds.add(observation.kindHint);
    }
    if (observation.kindEvidence?.trim()) evidence.add(observation.kindEvidence.trim());
  }

  if (hintedKinds.size === 1) {
    return { kind: [...hintedKinds][0]!, evidence: [...evidence].sort() };
  }
  if (hintedKinds.size > 1) {
    return {
      kind: "UNKNOWN",
      evidence: [...evidence].sort(),
      blocker: "conflicting_domain_kind_evidence",
    };
  }
  return { kind: "UNKNOWN", evidence: [...evidence].sort() };
}

function resolveRegistry(observations: DomainDiscoveryObservation[]): {
  state: CensusRegistryState;
  policy: string | null;
  blocker?: string;
} {
  const explicit = new Set<boolean>();
  const policies = new Set<string>();

  for (const observation of observations) {
    if (typeof observation.registered === "boolean") explicit.add(observation.registered);
    if (observation.effectivePolicy?.trim()) policies.add(observation.effectivePolicy.trim());
  }

  if (explicit.size > 1) {
    return { state: "UNKNOWN", policy: null, blocker: "conflicting_registry_evidence" };
  }

  const state: CensusRegistryState =
    explicit.size === 0 ? "UNKNOWN" : [...explicit][0] ? "REGISTERED" : "UNREGISTERED";

  if (policies.size > 1) {
    return { state, policy: null, blocker: "conflicting_effective_policy_evidence" };
  }

  const policy = policies.size === 1 ? [...policies][0]! : null;
  if (state !== "REGISTERED" && policy) {
    return { state, policy: null, blocker: "policy_without_registered_source" };
  }

  return { state, policy };
}

function resolveReviewState(observations: DomainDiscoveryObservation[]): CensusReviewState {
  const states = new Set<CensusReviewState>();
  for (const observation of observations) {
    if (observation.reviewState) states.add(observation.reviewState);
  }

  if (states.has("UNREVIEWED")) return "UNREVIEWED";
  if (states.has("REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  if (states.size === 1 && states.has("REVIEWED")) return "REVIEWED";
  return "UNREVIEWED";
}

export function buildDomainCensus(
  observations: DomainDiscoveryObservation[],
  generatedAt: string,
): DomainCensusReport {
  const generatedTimestamp = parseObservedAt(generatedAt);
  if (!generatedTimestamp) throw new Error("generatedAt is required");

  const groups = new Map<
    string,
    Array<DomainDiscoveryObservation & { canonicalUrl: string; canonicalObservedAt: string | null }>
  >();

  for (const rawObservation of observations) {
    const provider = normalizedText(rawObservation.provider, "provider");
    const { url, domain } = canonicalizeCensusUrl(rawObservation.url);
    const canonicalObservedAt = parseObservedAt(rawObservation.observedAt);

    for (const signal of rawObservation.techSignals ?? []) {
      if (!TECH_VALUES.has(signal)) throw new Error(`Unsupported tech signal: ${String(signal)}`);
    }

    const group = groups.get(domain) ?? [];
    group.push({
      ...rawObservation,
      provider,
      canonicalUrl: url,
      canonicalObservedAt,
    });
    groups.set(domain, group);
  }

  const candidates: DomainCensusCandidate[] = [];

  for (const [domain, group] of groups) {
    const uniqueUrls = new Set(group.map((observation) => observation.canonicalUrl));
    const providerCounts = new Map<string, number>();
    const observedDates: string[] = [];
    const cities = new Set<string>();
    const techSignals = new Set<CensusTechSignal>();

    for (const observation of group) {
      providerCounts.set(observation.provider, (providerCounts.get(observation.provider) ?? 0) + 1);
      if (observation.canonicalObservedAt) observedDates.push(observation.canonicalObservedAt);
      for (const city of observation.cities ?? []) cities.add(normalizeCity(city));
      for (const signal of observation.techSignals ?? []) techSignals.add(signal);
    }

    observedDates.sort();
    const kind = resolveKind(group);
    const registry = resolveRegistry(group);
    const blockers = [kind.blocker, registry.blocker].filter((value): value is string => Boolean(value));

    candidates.push({
      domain,
      observedUrlCount: uniqueUrls.size,
      observationCount: group.length,
      providers: [...providerCounts.entries()]
        .map(([provider, count]) => ({ provider, observations: count }))
        .sort((a, b) => b.observations - a.observations || a.provider.localeCompare(b.provider)),
      firstObservedAt: observedDates[0] ?? null,
      lastObservedAt: observedDates.at(-1) ?? null,
      sampleUrls: [...uniqueUrls].sort().slice(0, 5),
      kind: kind.kind,
      kindEvidence: kind.evidence,
      cities: [...cities].sort((a, b) => a.localeCompare(b)),
      techSignals: [...techSignals].sort(),
      registryState: registry.state,
      effectivePolicy: registry.policy,
      reviewState: resolveReviewState(group),
      blockers: blockers.sort(),
    });
  }

  candidates.sort(
    (a, b) =>
      b.observedUrlCount - a.observedUrlCount ||
      b.observationCount - a.observationCount ||
      a.domain.localeCompare(b.domain),
  );

  return {
    schemaVersion: "data-1-domain-census-v1",
    generatedAt: generatedTimestamp,
    observations: observations.length,
    domains: candidates.length,
    registeredDomains: candidates.filter((candidate) => candidate.registryState === "REGISTERED").length,
    unregisteredDomains: candidates.filter((candidate) => candidate.registryState === "UNREGISTERED").length,
    unknownRegistryDomains: candidates.filter((candidate) => candidate.registryState === "UNKNOWN").length,
    candidates,
  };
}
