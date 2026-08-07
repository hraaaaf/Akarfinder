export type ReconciliationClass =
  | "PRIMARY_SOURCE_CANDIDATE"
  | "PORTAL_CANDIDATE"
  | "AGGREGATOR"
  | "CLASSIFIED"
  | "SHORT_TERM_RENTAL"
  | "OTHER"
  | "UNKNOWN";

export type CommonCrawlCandidateEvidence = {
  lane: "MA_TLD_REAL_ESTATE" | "MOROCCO_EXTERNAL_REAL_ESTATE";
  domain: string;
  registeredDomain: string;
  indexedPages: number;
  realEstateSignalPages: number;
  latestFetchAt: string | null;
  sampleUrl?: string | null;
};

export type ReserveDomainEvidence = {
  domain: string;
  observedUrls: number;
  observationCount?: number;
  lastSeenAt?: string | null;
  providers?: string[];
};

export type SourceRegistryEvidence = {
  sourceDomain: string;
  sourceName?: string | null;
  currentRepresentationCount?: number | null;
  primaryGeography?: string | null;
  discoveryPolicy?: string | null;
  detailFetchPolicy?: string | null;
  contentReusePolicy?: string | null;
  displayPolicy?: string | null;
  authorizationStatus?: string | null;
  acquisitionMode?: string | null;
  reviewStatus?: string | null;
  machineGate?: string | null;
  ingestionGate?: string | null;
  displayGate?: string | null;
  policyHash?: string | null;
};

export type ReconciliationScore = {
  moroccoRelevance: number;
  estimatedInventory: number;
  evidenceDiversity: number;
  freshness: number;
  sourcePrimarity: number;
  reviewPriority: number;
};

export type ReconciledCandidate = {
  domain: string;
  hosts: string[];
  classes: ReconciliationClass[];
  primaryClass: ReconciliationClass;
  classificationReasons: string[];
  b3: {
    present: boolean;
    observedUrls: number;
    observationCount: number;
    lastSeenAt: string | null;
    providers: string[];
  };
  commonCrawl: {
    present: boolean;
    lanes: CommonCrawlCandidateEvidence["lane"][];
    indexedPages: number;
    realEstateSignalPages: number;
    latestFetchAt: string | null;
    sampleUrls: string[];
  };
  registry: {
    present: boolean;
    sourceDomains: string[];
    sourceNames: string[];
    currentRepresentationCount: number;
    existingPolicies: Array<{
      sourceDomain: string;
      authorizationStatus: string | null;
      acquisitionMode: string | null;
      machineGate: string | null;
      ingestionGate: string | null;
      displayGate: string | null;
      policyHash: string | null;
    }>;
  };
  score: ReconciliationScore;
  reviewState: "UNREVIEWED" | "EXISTING_REGISTRY";
  effectivePolicyCandidate: null;
};

export type CandidateClassStat = {
  class: ReconciliationClass;
  domains: number;
};

export type CandidateReconciliationReport = {
  schemaVersion: "data-1-candidate-reconciliation-v1";
  generatedAt: string;
  input: {
    b3Domains: number;
    commonCrawlHosts: number;
    commonCrawlRegisteredDomains: number;
    registryDomains: number;
  };
  reconciliation: {
    domains: number;
    b3AndCommonCrawl: number;
    commonCrawlOnly: number;
    b3Only: number;
    alreadyRegistered: number;
    unregistered: number;
  };
  classStats: CandidateClassStat[];
  topCandidates: ReconciledCandidate[];
  candidates: ReconciledCandidate[];
};

const CLASS_ORDER: ReconciliationClass[] = [
  "PRIMARY_SOURCE_CANDIDATE",
  "PORTAL_CANDIDATE",
  "CLASSIFIED",
  "AGGREGATOR",
  "SHORT_TERM_RENTAL",
  "OTHER",
  "UNKNOWN",
];

const AGGREGATOR_MARKERS = [
  "mitula",
  "trovit",
  "nuroa",
  "properstar",
  "repimmo",
  "realigro",
  "green-acres",
  "cari.africa",
  "cari.ma",
  "nestoria",
];

const CLASSIFIED_MARKERS = [
  "avito.ma",
  "marocannonces.com",
  "vivastreet.ma",
  "opensooq.com",
  "afribaba.com",
  "loozap.com",
  "bambaad.com",
  "lepetitbazar.fr",
  "annoncesmaroc.ma",
  "dabaannonce.ma",
];

const SHORT_TERM_MARKERS = [
  "airbnb.",
  "booking.com",
  "agoda.",
  "abritel.fr",
  "expedia.",
  "hotels.com",
  "tripadvisor.",
  "holidu.",
  "vrbo.",
];

const PORTAL_MARKERS = [
  "mubawab",
  "agenz",
  "yakeey",
  "sakane",
  "masaken",
  "sarouty",
  "darkom.ma",
  "milkiya.ma",
  "logic-immo",
  "logicimmo",
  "portail-immobilier",
  "pap.ma",
  "jemeloge.ma",
  "housing.place",
  "souqcity.ma",
  "mouldar.com",
];

const PRIMARY_SOURCE_TOKENS = [
  "immo",
  "immobilier",
  "realty",
  "property",
  "properties",
  "estate",
  "foncier",
  "habitat",
  "promoteur",
  "promotion",
  "loger",
  "sakane",
  "sakan",
  "mulk",
];

const MOROCCO_ANCHOR_TOKENS = [
  "morocco",
  "maroc",
  "marrakech",
  "rabat",
  "casablanca",
  "agadir",
  "tanger",
  "tangier",
  "essaouira",
  "fes",
  "fez",
  "meknes",
  "oujda",
  "dakhla",
  "nador",
  "taroudant",
  "tetouan",
  "chefchaouen",
  "eljadida",
  "el-jadida",
  "mohammedia",
  "kenitra",
  "ifrane",
  "safi",
  "berkane",
  "khouribga",
  "benimellal",
  "beni-mellal",
  "temara",
  "skhirat",
  "bouskoura",
];

const REGISTRY_MOROCCO_GEOGRAPHY_TOKENS = ["morocco", "maroc", "national", ...MOROCCO_ANCHOR_TOKENS];
const REGISTRY_REAL_ESTATE_NAME_TOKENS = ["immobilier", "immo", "realty", "property", "estate", "foncier"];

function normalizeDomain(value: string, field: string): string {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (!normalized || !normalized.includes(".")) throw new Error(`${field} is invalid: ${value}`);
  return normalized;
}

function parseNonNegativeInteger(value: number | null | undefined, field: string): number {
  if (value == null) return 0;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function parseTimestamp(value: string | null | undefined, field: string): string | null {
  if (value == null || value === "") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${field} is invalid: ${value}`);
  return new Date(timestamp).toISOString();
}

function latestTimestamp(values: Array<string | null>): string | null {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function boundedScore(value: number): number {
  if (!Number.isFinite(value)) throw new Error("score must be finite");
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inventoryScore(observedUrls: number, signalPages: number, indexedPages: number): number {
  const weighted = observedUrls * 8 + signalPages * 2 + Math.min(indexedPages, 10_000) * 0.1;
  if (weighted <= 0) return 0;
  return boundedScore((Math.log10(1 + weighted) / Math.log10(100_001)) * 100);
}

function freshnessScore(generatedAt: string, latest: string | null): number {
  if (!latest) return 20;
  const ageDays = Math.max(0, (Date.parse(generatedAt) - Date.parse(latest)) / 86_400_000);
  if (ageDays <= 45) return 100;
  if (ageDays <= 120) return 80;
  if (ageDays <= 365) return 55;
  if (ageDays <= 730) return 35;
  return 15;
}

function domainContainsMarker(domain: string, markers: string[]): boolean {
  return markers.some((marker) => domain.includes(marker));
}

function hasPrimarySourceToken(domain: string): boolean {
  const label = domain.split(".")[0] ?? domain;
  return PRIMARY_SOURCE_TOKENS.some((token) => label.includes(token));
}

function labelHasBoundedAnchor(label: string, token: string): boolean {
  return (
    label === token ||
    label.startsWith(token) ||
    label.endsWith(token) ||
    label.includes(`-${token}`) ||
    label.includes(`${token}-`)
  );
}

function hasMoroccoDomainAnchor(domain: string): boolean {
  const normalized = domain.toLowerCase();
  if (normalized.endsWith(".ma")) return true;
  const labels = normalized.split(".").slice(0, -1);
  return MOROCCO_ANCHOR_TOKENS.some((token) => labels.some((label) => labelHasBoundedAnchor(label, token)));
}

function registryHasMoroccoGeography(registry: SourceRegistryEvidence[]): boolean {
  return registry.some((row) => {
    const geography = (row.primaryGeography ?? "").toLowerCase().replace(/\s+/g, "");
    return REGISTRY_MOROCCO_GEOGRAPHY_TOKENS.some((token) => geography.includes(token.replace(/\s+/g, "")));
  });
}

function registryHasRealEstateName(registry: SourceRegistryEvidence[]): boolean {
  return registry.some((row) => {
    const sourceName = (row.sourceName ?? "").toLowerCase();
    return REGISTRY_REAL_ESTATE_NAME_TOKENS.some((token) => sourceName.includes(token));
  });
}

function classifyCandidate(input: {
  domain: string;
  hosts: string[];
  b3ObservedUrls: number;
  ccSignalPages: number;
  ccIndexedPages: number;
  registry: SourceRegistryEvidence[];
}): { classes: ReconciliationClass[]; primaryClass: ReconciliationClass; reasons: string[] } {
  const haystack = [input.domain, ...input.hosts].join(" ");
  const classes = new Set<ReconciliationClass>();
  const reasons = new Set<string>();

  if (domainContainsMarker(haystack, AGGREGATOR_MARKERS)) {
    classes.add("AGGREGATOR");
    reasons.add("known_meta_aggregator_marker");
  }
  if (domainContainsMarker(haystack, CLASSIFIED_MARKERS)) {
    classes.add("CLASSIFIED");
    reasons.add("known_classified_marker");
  }
  if (domainContainsMarker(haystack, SHORT_TERM_MARKERS)) {
    classes.add("SHORT_TERM_RENTAL");
    reasons.add("known_short_term_platform_marker");
  }
  if (domainContainsMarker(haystack, PORTAL_MARKERS)) {
    classes.add("PORTAL_CANDIDATE");
    reasons.add("known_real_estate_portal_marker");
  }

  const blockedFromPrimary =
    classes.has("AGGREGATOR") ||
    classes.has("CLASSIFIED") ||
    classes.has("SHORT_TERM_RENTAL") ||
    classes.has("PORTAL_CANDIDATE");
  const domainRealEstateSignal = hasPrimarySourceToken(input.domain);
  const explicitMoroccoAnchor = hasMoroccoDomainAnchor(input.domain) || registryHasMoroccoGeography(input.registry);
  const registryRealEstateName = registryHasRealEstateName(input.registry);

  if (!blockedFromPrimary && (domainRealEstateSignal || registryRealEstateName) && explicitMoroccoAnchor) {
    classes.add("PRIMARY_SOURCE_CANDIDATE");
    if (domainRealEstateSignal) reasons.add("strong_real_estate_domain_token");
    if (registryRealEstateName) reasons.add("existing_registry_real_estate_name");
    reasons.add("explicit_morocco_primary_anchor");
  }

  if (!blockedFromPrimary && domainRealEstateSignal && !explicitMoroccoAnchor) {
    classes.add("PORTAL_CANDIDATE");
    reasons.add("real_estate_domain_without_morocco_primary_anchor");
  }

  if (
    !blockedFromPrimary &&
    !classes.has("PRIMARY_SOURCE_CANDIDATE") &&
    !classes.has("PORTAL_CANDIDATE") &&
    (input.b3ObservedUrls >= 50 || input.ccSignalPages >= 100)
  ) {
    reasons.add("high_density_without_safe_primary_domain_signal");
  }

  if (registryRealEstateName) reasons.add("existing_registry_real_estate_name");

  if (classes.size === 0) {
    classes.add(input.b3ObservedUrls > 0 || input.ccSignalPages > 0 ? "OTHER" : "UNKNOWN");
    reasons.add(input.b3ObservedUrls > 0 || input.ccSignalPages > 0 ? "real_estate_evidence_without_safe_primary_class" : "insufficient_evidence");
  }

  const ordered = CLASS_ORDER.filter((value) => classes.has(value));
  const primaryClass = ordered[0] ?? "UNKNOWN";
  return { classes: ordered, primaryClass, reasons: [...reasons].sort() };
}

function primarityScore(classification: ReconciliationClass): number {
  switch (classification) {
    case "PRIMARY_SOURCE_CANDIDATE":
      return 95;
    case "PORTAL_CANDIDATE":
      return 70;
    case "CLASSIFIED":
      return 35;
    case "AGGREGATOR":
      return 12;
    case "SHORT_TERM_RENTAL":
      return 15;
    case "OTHER":
      return 45;
    default:
      return 30;
  }
}

function canonicalKeyForHost(host: string, ccRegisteredDomainByHost: Map<string, string>): string {
  return ccRegisteredDomainByHost.get(host) ?? host;
}

export function buildCandidateReconciliationReport(input: {
  commonCrawl: CommonCrawlCandidateEvidence[];
  reserve: ReserveDomainEvidence[];
  registry: SourceRegistryEvidence[];
  generatedAt: string;
  top?: number;
}): CandidateReconciliationReport {
  const generatedAt = parseTimestamp(input.generatedAt, "generatedAt");
  if (!generatedAt) throw new Error("generatedAt is required");
  const top = input.top ?? 100;
  if (!Number.isInteger(top) || top < 1 || top > 1000) throw new Error("top must be an integer between 1 and 1000");

  const ccRegisteredDomainByHost = new Map<string, string>();
  for (const row of input.commonCrawl) {
    const host = normalizeDomain(row.domain, "Common Crawl domain");
    const registered = normalizeDomain(row.registeredDomain, "Common Crawl registeredDomain");
    const existing = ccRegisteredDomainByHost.get(host);
    if (existing && existing !== registered) throw new Error(`Conflicting registered domains for ${host}`);
    ccRegisteredDomainByHost.set(host, registered);
  }

  type Mutable = {
    domain: string;
    hosts: Set<string>;
    reserveRows: ReserveDomainEvidence[];
    ccRows: CommonCrawlCandidateEvidence[];
    registryRows: SourceRegistryEvidence[];
  };
  const groups = new Map<string, Mutable>();
  const ensure = (domain: string): Mutable => {
    const existing = groups.get(domain);
    if (existing) return existing;
    const created: Mutable = { domain, hosts: new Set<string>([domain]), reserveRows: [], ccRows: [], registryRows: [] };
    groups.set(domain, created);
    return created;
  };

  for (const row of input.commonCrawl) {
    const host = normalizeDomain(row.domain, "Common Crawl domain");
    const registered = normalizeDomain(row.registeredDomain, "Common Crawl registeredDomain");
    parseNonNegativeInteger(row.indexedPages, "indexedPages");
    parseNonNegativeInteger(row.realEstateSignalPages, "realEstateSignalPages");
    parseTimestamp(row.latestFetchAt, "latestFetchAt");
    const group = ensure(registered);
    group.hosts.add(host);
    group.ccRows.push({ ...row, domain: host, registeredDomain: registered });
  }

  for (const row of input.reserve) {
    const host = normalizeDomain(row.domain, "reserve domain");
    const key = canonicalKeyForHost(host, ccRegisteredDomainByHost);
    parseNonNegativeInteger(row.observedUrls, "observedUrls");
    parseNonNegativeInteger(row.observationCount ?? row.observedUrls, "observationCount");
    parseTimestamp(row.lastSeenAt, "lastSeenAt");
    const group = ensure(key);
    group.hosts.add(host);
    group.reserveRows.push({ ...row, domain: host });
  }

  for (const row of input.registry) {
    const host = normalizeDomain(row.sourceDomain, "registry sourceDomain");
    const key = canonicalKeyForHost(host, ccRegisteredDomainByHost);
    const group = ensure(key);
    group.hosts.add(host);
    group.registryRows.push({ ...row, sourceDomain: host });
  }

  const candidates: ReconciledCandidate[] = [];

  for (const group of groups.values()) {
    const b3ObservedUrls = group.reserveRows.reduce((sum, row) => sum + parseNonNegativeInteger(row.observedUrls, "observedUrls"), 0);
    const b3ObservationCount = group.reserveRows.reduce(
      (sum, row) => sum + parseNonNegativeInteger(row.observationCount ?? row.observedUrls, "observationCount"),
      0,
    );
    const b3LastSeenAt = latestTimestamp(group.reserveRows.map((row) => parseTimestamp(row.lastSeenAt, "lastSeenAt")));
    const providers = [...new Set(group.reserveRows.flatMap((row) => row.providers ?? []))].sort();

    const ccIndexedPages = group.ccRows.reduce((sum, row) => sum + parseNonNegativeInteger(row.indexedPages, "indexedPages"), 0);
    const ccSignalPages = group.ccRows.reduce(
      (sum, row) => sum + parseNonNegativeInteger(row.realEstateSignalPages, "realEstateSignalPages"),
      0,
    );
    const ccLatestFetchAt = latestTimestamp(group.ccRows.map((row) => parseTimestamp(row.latestFetchAt, "latestFetchAt")));
    const lanes = [...new Set(group.ccRows.map((row) => row.lane))].sort() as CommonCrawlCandidateEvidence["lane"][];
    const sampleUrls = [...new Set(group.ccRows.map((row) => row.sampleUrl).filter((value): value is string => Boolean(value)))].sort().slice(0, 5);

    const classification = classifyCandidate({
      domain: group.domain,
      hosts: [...group.hosts],
      b3ObservedUrls,
      ccSignalPages,
      ccIndexedPages,
      registry: group.registryRows,
    });

    const registryCount = group.registryRows.reduce(
      (sum, row) => sum + parseNonNegativeInteger(row.currentRepresentationCount ?? 0, "currentRepresentationCount"),
      0,
    );
    const sourceNames = [...new Set(group.registryRows.map((row) => row.sourceName?.trim()).filter((value): value is string => Boolean(value)))].sort();

    const moroccoRelevance = group.domain.endsWith(".ma")
      ? 100
      : group.reserveRows.length > 0
        ? 90
        : lanes.includes("MOROCCO_EXTERNAL_REAL_ESTATE")
          ? 70
          : 50;
    const estimatedInventory = inventoryScore(b3ObservedUrls, ccSignalPages, ccIndexedPages);
    const evidenceDiversity = boundedScore(
      (group.reserveRows.length > 0 ? 40 : 0) + (group.ccRows.length > 0 ? 40 : 0) + (group.registryRows.length > 0 ? 20 : 0),
    );
    const freshness = freshnessScore(generatedAt, latestTimestamp([b3LastSeenAt, ccLatestFetchAt]));
    const sourcePrimarity = primarityScore(classification.primaryClass);
    const reviewPriority = boundedScore(
      moroccoRelevance * 0.2 +
        estimatedInventory * 0.25 +
        evidenceDiversity * 0.15 +
        freshness * 0.1 +
        sourcePrimarity * 0.3,
    );

    candidates.push({
      domain: group.domain,
      hosts: [...group.hosts].sort(),
      classes: classification.classes,
      primaryClass: classification.primaryClass,
      classificationReasons: classification.reasons,
      b3: {
        present: group.reserveRows.length > 0,
        observedUrls: b3ObservedUrls,
        observationCount: b3ObservationCount,
        lastSeenAt: b3LastSeenAt,
        providers,
      },
      commonCrawl: {
        present: group.ccRows.length > 0,
        lanes,
        indexedPages: ccIndexedPages,
        realEstateSignalPages: ccSignalPages,
        latestFetchAt: ccLatestFetchAt,
        sampleUrls,
      },
      registry: {
        present: group.registryRows.length > 0,
        sourceDomains: [...new Set(group.registryRows.map((row) => row.sourceDomain))].sort(),
        sourceNames,
        currentRepresentationCount: registryCount,
        existingPolicies: group.registryRows
          .map((row) => ({
            sourceDomain: row.sourceDomain,
            authorizationStatus: row.authorizationStatus ?? null,
            acquisitionMode: row.acquisitionMode ?? null,
            machineGate: row.machineGate ?? null,
            ingestionGate: row.ingestionGate ?? null,
            displayGate: row.displayGate ?? null,
            policyHash: row.policyHash ?? null,
          }))
          .sort((a, b) => a.sourceDomain.localeCompare(b.sourceDomain)),
      },
      score: {
        moroccoRelevance,
        estimatedInventory,
        evidenceDiversity,
        freshness,
        sourcePrimarity,
        reviewPriority,
      },
      reviewState: group.registryRows.length > 0 ? "EXISTING_REGISTRY" : "UNREVIEWED",
      effectivePolicyCandidate: null,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score.reviewPriority - a.score.reviewPriority ||
      b.score.sourcePrimarity - a.score.sourcePrimarity ||
      b.b3.observedUrls - a.b3.observedUrls ||
      b.commonCrawl.realEstateSignalPages - a.commonCrawl.realEstateSignalPages ||
      a.domain.localeCompare(b.domain),
  );

  const b3Domains = new Set(input.reserve.map((row) => normalizeDomain(row.domain, "reserve domain")));
  const ccHosts = new Set(input.commonCrawl.map((row) => normalizeDomain(row.domain, "Common Crawl domain")));
  const ccRegistered = new Set(input.commonCrawl.map((row) => normalizeDomain(row.registeredDomain, "Common Crawl registeredDomain")));
  const registryDomains = new Set(input.registry.map((row) => normalizeDomain(row.sourceDomain, "registry sourceDomain")));

  const reconciliation = {
    domains: candidates.length,
    b3AndCommonCrawl: candidates.filter((candidate) => candidate.b3.present && candidate.commonCrawl.present).length,
    commonCrawlOnly: candidates.filter((candidate) => !candidate.b3.present && candidate.commonCrawl.present).length,
    b3Only: candidates.filter((candidate) => candidate.b3.present && !candidate.commonCrawl.present).length,
    alreadyRegistered: candidates.filter((candidate) => candidate.registry.present).length,
    unregistered: candidates.filter((candidate) => !candidate.registry.present).length,
  };

  const classStats = CLASS_ORDER.map((value) => ({
    class: value,
    domains: candidates.filter((candidate) => candidate.primaryClass === value).length,
  }));

  return {
    schemaVersion: "data-1-candidate-reconciliation-v1",
    generatedAt,
    input: {
      b3Domains: b3Domains.size,
      commonCrawlHosts: ccHosts.size,
      commonCrawlRegisteredDomains: ccRegistered.size,
      registryDomains: registryDomains.size,
    },
    reconciliation,
    classStats,
    topCandidates: candidates.slice(0, top),
    candidates,
  };
}

export function renderCandidateReconciliationMarkdown(report: CandidateReconciliationReport): string {
  const lines = [
    "# DATA-1.4 — Candidate Reconciliation & Source Prioritization",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report prioritizes review. It **does not assign a source policy or grant ingestion/publication rights**.",
    "",
    "## Reconciliation",
    "",
    `- B3 domains: **${report.input.b3Domains.toLocaleString("en-US")}**`,
    `- Common Crawl hosts: **${report.input.commonCrawlHosts.toLocaleString("en-US")}**`,
    `- Common Crawl registered domains: **${report.input.commonCrawlRegisteredDomains.toLocaleString("en-US")}**`,
    `- Source Registry domains: **${report.input.registryDomains.toLocaleString("en-US")}**`,
    `- reconciled domains: **${report.reconciliation.domains.toLocaleString("en-US")}**`,
    `- B3 ∩ Common Crawl: **${report.reconciliation.b3AndCommonCrawl.toLocaleString("en-US")}**`,
    `- Common Crawl only: **${report.reconciliation.commonCrawlOnly.toLocaleString("en-US")}**`,
    `- B3 only: **${report.reconciliation.b3Only.toLocaleString("en-US")}**`,
    `- already in Source Registry: **${report.reconciliation.alreadyRegistered.toLocaleString("en-US")}**`,
    "",
    "## Primary class distribution",
    "",
    "| Class | Domains |",
    "|---|---:|",
    ...report.classStats.map((stat) => `| ${stat.class} | ${stat.domains.toLocaleString("en-US")} |`),
    "",
    `## Top ${report.topCandidates.length} review candidates`,
    "",
    "| # | Domain | Class | Score | B3 URLs | CC signal pages | Registry | Reasons |",
    "|---:|---|---|---:|---:|---:|---|---|",
    ...report.topCandidates.map((candidate, index) =>
      `| ${index + 1} | ${candidate.domain} | ${candidate.primaryClass} | ${candidate.score.reviewPriority} | ${candidate.b3.observedUrls} | ${candidate.commonCrawl.realEstateSignalPages} | ${candidate.registry.present ? "yes" : "no"} | ${candidate.classificationReasons.join(", ")} |`,
    ),
    "",
    "## Gate",
    "",
    "All unregistered candidates remain `UNREVIEWED` with `effectivePolicyCandidate=null`. Robots, noindex, terms/licence and explicit Source Registry policy review remain mandatory before activation.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
