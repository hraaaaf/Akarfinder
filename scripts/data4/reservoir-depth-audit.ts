export type ReservoirDomain = "avito.ma" | "mubawab.ma";

export type PublicReservoirEvidence = {
  domain: ReservoirDomain;
  observedAt: string;
  homepageUrl: string;
  robotsUrl: string;
  termsUrl?: string;
  announcedInventory: number | null;
  announcedInventoryScope: string;
  sitemapDeclared: boolean;
  observationNotes: string[];
  auditRecommendation:
    | "PARTNERSHIP_OR_PUBLIC_INDEX_MEASUREMENT"
    | "REGISTRY_REVIEW_BEFORE_SITEMAP_MEASUREMENT";
};

export type RegistrySnapshot = {
  source_domain: ReservoirDomain;
  current_representation_count: number;
  discovery_policy: string;
  detail_fetch_policy: string;
  content_reuse_policy: string;
  display_policy: string;
  authorization_status: string;
  acquisition_mode: string;
  allowed_discovery_channels: string[];
  robots_status: string;
  terms_status: string;
  review_status: string;
  machine_gate: string;
  ingestion_gate: string;
  display_gate: string;
  reviewed_at: string;
  next_review_at: string;
  policy_version: string;
};

export type SourceFreshnessSnapshot = {
  source_domain: ReservoirDomain;
  freshness_state: string;
  publication_eligible: boolean;
  effective_machine_gate: string;
  evaluated_at: string;
  freshness_deadline_at: string;
};

export type QualitySnapshot = {
  source_domain: ReservoirDomain;
  real_estate_rows: number;
  average_score: number;
  median_score: number;
  tier_a: number;
  tier_b: number;
  tier_c: number;
  tier_d: number;
  tier_e: number;
  with_city: number;
  with_price: number;
  with_surface: number;
};

export type InternalReservoirMetrics = {
  domain: ReservoirDomain;
  discoveryCandidateRows: number;
  offerSeedRows: number;
  normalizedRows: number;
  normalizationUnavailableRows: number;
  normalizationNormalizedRows: number;
  normalizationPartialRows: number;
  freshConfirmedRows: number;
  technicalSearchRepresentationRows: number;
  technicalDisplayEligibleRows: number;
  quality: QualitySnapshot | null;
  registry: RegistrySnapshot;
  sourceFreshness: SourceFreshnessSnapshot | null;
};

export type ReservoirDepthRow = {
  domain: ReservoirDomain;
  publicAnnouncedInventory: number | null;
  publicInventoryObserved: boolean;
  normalizedRows: number;
  technicalDisplayEligibleRows: number;
  policyActivableRows: number;
  normalizationUnavailableRows: number;
  freshConfirmedRows: number;
  normalizedToPublicRatio: number | null;
  technicalDisplayToNormalizedRatio: number;
  unavailableNormalizationRatio: number;
  publicGapToNormalized: number | null;
  normalizedGapToTechnicalDisplay: number;
  policyBlockedTechnicalDisplay: number;
  policy: {
    authorizationStatus: string;
    acquisitionMode: string;
    detailFetchPolicy: string;
    contentReusePolicy: string;
    displayPolicy: string;
    displayGate: string;
    publicationEligible: boolean;
  };
  sitemapDeclared: boolean;
  auditRecommendation: PublicReservoirEvidence["auditRecommendation"];
};

export type ReservoirDepthReport = {
  schemaVersion: "data-4-0-large-reservoir-depth-v1";
  generatedAt: string;
  readOnly: true;
  writesPerformed: 0;
  sources: ReservoirDepthRow[];
  summary: {
    sourceCount: number;
    normalizedRows: number;
    technicalDisplayEligibleRows: number;
    policyActivableRows: number;
    normalizationUnavailableRows: number;
    freshConfirmedRows: number;
  };
};

function fail(message: string): never {
  throw new Error(`DATA-4.0: ${message}`);
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${field} must be a non-negative safe integer`);
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(6));
}

function isPolicyPubliclyActivable(metrics: InternalReservoirMetrics): boolean {
  const { registry, sourceFreshness } = metrics;
  if (registry.display_gate === "hidden") return false;
  if (registry.display_policy === "internal_signal_only" || registry.display_policy === "blocked") return false;
  if (registry.acquisition_mode === "blocked") return false;
  if (sourceFreshness && sourceFreshness.publication_eligible !== true) return false;
  return true;
}

export function validateReservoirInputs(
  evidence: PublicReservoirEvidence[],
  metrics: InternalReservoirMetrics[],
): void {
  if (evidence.length !== metrics.length) fail("public evidence and internal metrics must cover the same number of sources");
  if (evidence.length !== 2) fail(`expected exactly 2 DATA-4.0 sources, got ${evidence.length}`);

  const evidenceDomains = new Set<ReservoirDomain>();
  for (const row of evidence) {
    if (evidenceDomains.has(row.domain)) fail(`duplicate public evidence for ${row.domain}`);
    evidenceDomains.add(row.domain);
    if (!Number.isFinite(Date.parse(row.observedAt))) fail(`${row.domain} has invalid observedAt`);
    if (!row.homepageUrl.startsWith("https://") || !row.robotsUrl.startsWith("https://")) {
      fail(`${row.domain} evidence URLs must be HTTPS`);
    }
    if (row.announcedInventory !== null) assertNonNegativeInteger(row.announcedInventory, `${row.domain}.announcedInventory`);
  }

  const metricDomains = new Set<ReservoirDomain>();
  for (const row of metrics) {
    if (metricDomains.has(row.domain)) fail(`duplicate internal metrics for ${row.domain}`);
    metricDomains.add(row.domain);
    if (row.registry.source_domain !== row.domain) fail(`${row.domain} Registry domain mismatch`);
    if (row.sourceFreshness && row.sourceFreshness.source_domain !== row.domain) fail(`${row.domain} freshness domain mismatch`);
    if (row.quality && row.quality.source_domain !== row.domain) fail(`${row.domain} quality domain mismatch`);
    for (const [field, value] of Object.entries({
      discoveryCandidateRows: row.discoveryCandidateRows,
      offerSeedRows: row.offerSeedRows,
      normalizedRows: row.normalizedRows,
      normalizationUnavailableRows: row.normalizationUnavailableRows,
      normalizationNormalizedRows: row.normalizationNormalizedRows,
      normalizationPartialRows: row.normalizationPartialRows,
      freshConfirmedRows: row.freshConfirmedRows,
      technicalSearchRepresentationRows: row.technicalSearchRepresentationRows,
      technicalDisplayEligibleRows: row.technicalDisplayEligibleRows,
    })) assertNonNegativeInteger(value, `${row.domain}.${field}`);

    const normalizationSum = row.normalizationUnavailableRows + row.normalizationNormalizedRows + row.normalizationPartialRows;
    if (normalizationSum !== row.normalizedRows) {
      fail(`${row.domain} normalization buckets ${normalizationSum} do not equal normalizedRows ${row.normalizedRows}`);
    }
  }

  for (const domain of evidenceDomains) if (!metricDomains.has(domain)) fail(`missing internal metrics for ${domain}`);
}

export function buildReservoirDepthReport(
  evidence: PublicReservoirEvidence[],
  metrics: InternalReservoirMetrics[],
  generatedAt = new Date().toISOString(),
): ReservoirDepthReport {
  validateReservoirInputs(evidence, metrics);
  if (!Number.isFinite(Date.parse(generatedAt))) fail("generatedAt must be ISO-compatible");

  const evidenceByDomain = new Map(evidence.map((row) => [row.domain, row]));
  const sources = [...metrics]
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .map<ReservoirDepthRow>((metric) => {
      const publicEvidence = evidenceByDomain.get(metric.domain);
      if (!publicEvidence) fail(`missing public evidence for ${metric.domain}`);
      const activable = isPolicyPubliclyActivable(metric);
      const announced = publicEvidence.announcedInventory;
      return {
        domain: metric.domain,
        publicAnnouncedInventory: announced,
        publicInventoryObserved: announced !== null,
        normalizedRows: metric.normalizedRows,
        technicalDisplayEligibleRows: metric.technicalDisplayEligibleRows,
        policyActivableRows: activable ? metric.technicalDisplayEligibleRows : 0,
        normalizationUnavailableRows: metric.normalizationUnavailableRows,
        freshConfirmedRows: metric.freshConfirmedRows,
        normalizedToPublicRatio: announced === null || announced === 0 ? null : ratio(metric.normalizedRows, announced),
        technicalDisplayToNormalizedRatio: ratio(metric.technicalDisplayEligibleRows, metric.normalizedRows),
        unavailableNormalizationRatio: ratio(metric.normalizationUnavailableRows, metric.normalizedRows),
        publicGapToNormalized: announced === null ? null : Math.max(0, announced - metric.normalizedRows),
        normalizedGapToTechnicalDisplay: Math.max(0, metric.normalizedRows - metric.technicalDisplayEligibleRows),
        policyBlockedTechnicalDisplay: activable ? 0 : metric.technicalDisplayEligibleRows,
        policy: {
          authorizationStatus: metric.registry.authorization_status,
          acquisitionMode: metric.registry.acquisition_mode,
          detailFetchPolicy: metric.registry.detail_fetch_policy,
          contentReusePolicy: metric.registry.content_reuse_policy,
          displayPolicy: metric.registry.display_policy,
          displayGate: metric.registry.display_gate,
          publicationEligible: metric.sourceFreshness?.publication_eligible === true,
        },
        sitemapDeclared: publicEvidence.sitemapDeclared,
        auditRecommendation: publicEvidence.auditRecommendation,
      };
    });

  return {
    schemaVersion: "data-4-0-large-reservoir-depth-v1",
    generatedAt,
    readOnly: true,
    writesPerformed: 0,
    sources,
    summary: {
      sourceCount: sources.length,
      normalizedRows: sources.reduce((sum, row) => sum + row.normalizedRows, 0),
      technicalDisplayEligibleRows: sources.reduce((sum, row) => sum + row.technicalDisplayEligibleRows, 0),
      policyActivableRows: sources.reduce((sum, row) => sum + row.policyActivableRows, 0),
      normalizationUnavailableRows: sources.reduce((sum, row) => sum + row.normalizationUnavailableRows, 0),
      freshConfirmedRows: sources.reduce((sum, row) => sum + row.freshConfirmedRows, 0),
    },
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function renderReservoirDepthMarkdown(report: ReservoirDepthReport): string {
  const lines = [
    "# DATA-4.0 — Large Reservoir Depth Audit",
    "",
    "**Audit read-only. Technical depth is not permission and is not public inventory.**",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "| Source | Public announced | Normalized | Technical displayable | Policy activable | Unavailable normalization | Fresh confirmed |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...report.sources.map((row) =>
      `| ${row.domain} | ${row.publicAnnouncedInventory ?? "not observed"} | ${row.normalizedRows} | ${row.technicalDisplayEligibleRows} | ${row.policyActivableRows} | ${row.normalizationUnavailableRows} (${pct(row.unavailableNormalizationRatio)}) | ${row.freshConfirmedRows} |`,
    ),
    "",
    "## Interpretation",
    "",
    ...report.sources.flatMap((row) => [
      `### ${row.domain}`,
      "",
      `- normalized → technical display ratio: **${pct(row.technicalDisplayToNormalizedRatio)}**`,
      `- technical rows blocked from public activation by current policy: **${row.policyBlockedTechnicalDisplay}**`,
      `- public → normalized gap: **${row.publicGapToNormalized ?? "not measurable from a reliable announced count"}**`,
      `- policy: authorization=${row.policy.authorizationStatus}, acquisition=${row.policy.acquisitionMode}, detail=${row.policy.detailFetchPolicy}, reuse=${row.policy.contentReusePolicy}, display=${row.policy.displayPolicy}, gate=${row.policy.displayGate}`,
      `- next audit action: **${row.auditRecommendation}**`,
      "",
    ]),
    "## Safety conclusion",
    "",
    `- sources audited: **${report.summary.sourceCount}**`,
    `- technical display-eligible rows: **${report.summary.technicalDisplayEligibleRows}**`,
    `- policy-activable rows: **${report.summary.policyActivableRows}**`,
    "- No source policy is changed by this report.",
    "- No direct fetch, scraper expansion, sitemap harvest, content reuse or public activation is authorized by this report.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
