import fs from "node:fs/promises";
import path from "node:path";

import {
  rankDomainReservoirs,
  summarizeDomainReservoir,
  type RegistryPolicySnapshot,
  type ReservoirCandidate,
} from "../data-mass/reservoir-qualification";
import { buildSourceFactoryDossiers } from "../data-mass/source-factory";

const OUT_DIR = process.env.DATA_MASS_2A_OUT_DIR ?? ".tmp/data-mass-2a/results";
const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 1_000;
const MAX_RETRIES = 3;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-MASS-2A requires ${name}`);
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const supabaseOrigin = new URL(env("SUPABASE_URL")).origin;
let sourceNetworkRequests = 0;
let supabaseMutationAttempts = 0;

async function allowedFetch(input: URL, init: RequestInit): Promise<Response> {
  if (input.origin !== supabaseOrigin) {
    sourceNetworkRequests += 1;
    throw new Error(`MASS-2A source-network firewall blocked ${input.origin}`);
  }
  const method = String(init.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    supabaseMutationAttempts += 1;
    throw new Error(`MASS-2A read-only firewall blocked Supabase ${method}`);
  }
  return fetch(input, init);
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await allowedFetch(url, {
      method: "GET",
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return (await response.json()) as T[];

    const body = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`${table} read failed: HTTP ${response.status} ${body}`);
    }
    await delay(250 * attempt);
  }
  throw new Error(`${table} read failed after ${MAX_RETRIES} attempts`);
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function restAllById<T extends { id: string }>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  let lastId: string | null = null;
  for (;;) {
    const query: Record<string, string> = { ...params, order: "id.asc", limit: String(PAGE_SIZE) };
    if (lastId) query.id = `gt.${lastId}`;
    const page = await restPage<T>(table, query);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    const nextId = page.at(-1)?.id ?? null;
    if (!nextId || nextId === lastId) throw new Error(`${table} keyset pagination did not advance`);
    lastId = nextId;
  }
}

type DiscoveryRow = {
  id: string;
  source_domain: string;
  source_url: string;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_query: string | null;
  content_fingerprint: string | null;
  last_seen_at: string | null;
};
type ThinIndexRow = { canonical_url: string };
type RegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  display_policy: string | null;
  display_gate: string | null;
  acquisition_mode: string | null;
  ingestion_gate: string | null;
};

function normalizedDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function canonicalKey(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main(): Promise<void> {
  const [discoveryRows, thinRows, registryRows] = await Promise.all([
    restAllById<DiscoveryRow>("discovery_candidates", {
      select: "id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at",
    }),
    restAll<ThinIndexRow>("thin_index_search_documents", {
      select: "canonical_url",
      order: "canonical_url.asc",
    }),
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,authorization_status,display_policy,display_gate,acquisition_mode,ingestion_gate",
      order: "source_domain.asc",
    }),
  ]);

  const thinUrls = new Set(thinRows.map((row) => canonicalKey(row.canonical_url)));
  const registry = new Map<string, RegistryPolicySnapshot>();
  for (const row of registryRows) {
    const sourceDomain = normalizedDomain(row.source_domain);
    registry.set(sourceDomain, {
      sourceDomain,
      authorizationStatus: row.authorization_status,
      displayPolicy: row.display_policy,
      displayGate: row.display_gate,
      acquisitionMode: row.acquisition_mode,
      ingestionGate: row.ingestion_gate,
    });
  }

  const uniqueDiscovery = new Map<string, DiscoveryRow>();
  for (const row of discoveryRows) {
    const rawUrl = row.canonical_url || row.source_url;
    if (!rawUrl) continue;
    const key = canonicalKey(rawUrl);
    const existing = uniqueDiscovery.get(key);
    if (!existing || (row.last_seen_at ?? "") > (existing.last_seen_at ?? "")) uniqueDiscovery.set(key, row);
  }

  const netNewByDomain = new Map<string, ReservoirCandidate[]>();
  for (const [urlKey, row] of uniqueDiscovery) {
    if (thinUrls.has(urlKey)) continue;
    const sourceDomain = normalizedDomain(row.source_domain || (() => {
      try { return new URL(urlKey).hostname; } catch { return "unknown"; }
    })());
    const candidates = netNewByDomain.get(sourceDomain) ?? [];
    candidates.push({
      sourceDomain,
      url: urlKey,
      title: row.title,
      snippet: row.snippet,
      discoveryQuery: row.discovery_query,
      contentFingerprint: row.content_fingerprint,
    });
    netNewByDomain.set(sourceDomain, candidates);
  }

  const summaries = rankDomainReservoirs(
    [...netNewByDomain.entries()].map(([domain, candidates]) =>
      summarizeDomainReservoir(domain, candidates, registry.get(domain) ?? null),
    ),
  );
  const sourceFactory = summaries.filter((row) => row.massQueue === "SOURCE_FACTORY");
  const batch = buildSourceFactoryDossiers(sourceFactory);

  const proof = {
    schemaVersion: "data-mass-2a-source-factory-engine-v1",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    databaseWrites: supabaseMutationAttempts,
    ddlChanges: 0,
    registryWrites: 0,
    policyChanges: 0,
    sourceNetworkRequests,
    detailPageFetches: 0,
    publicRowsCreated: 0,
    searchActivations: 0,
    permissionsInferred: batch.summary.permissionInferredCount,
    nonHoldDecisions: batch.summary.nonHoldDecisionCount,
    publicActivableNowCount: batch.summary.publicActivableNowCount,
    paginationMode: "UUID_KEYSET",
    discoveryRowsRead: discoveryRows.length,
    distinctDiscoveryUrlRepresentations: uniqueDiscovery.size,
    thinIndexUrlRepresentationsRead: thinRows.length,
    registryRowsRead: registryRows.length,
    mass1SourceFactoryDomains: sourceFactory.length,
    dossiersProduced: batch.summary.totalDomains,
    coverageMatchesMass1Queue: batch.summary.totalDomains === sourceFactory.length,
    uniqueDossierDomains: new Set(batch.dossiers.map((row) => row.sourceDomain)).size,
    highYieldDomains: batch.summary.highYieldDomains,
    midYieldDomains: batch.summary.midYieldDomains,
    longTailDomains: batch.summary.longTailDomains,
    candidateUrlRepresentations: batch.summary.totalUrlRepresentations,
    likelyMoroccoRealEstateUrlRepresentations: batch.summary.totalLikelyMoroccoRealEstateUrls,
    likelyMoroccoListingDetailUrlRepresentations: batch.summary.totalLikelyMoroccoListingDetailUrls,
    allDossiersUnreviewed: batch.dossiers.every((row) => row.reviewStatus === "UNREVIEWED"),
    allDossiersHold: batch.dossiers.every((row) => row.proposedDecision === "HOLD"),
    allDossiersNonActivable: batch.dossiers.every((row) => row.publicActivableNow === false),
    allPermissionsNotInferred: batch.dossiers.every((row) => row.permissionInferred === false),
    allExternalEvidenceNotReviewed: batch.dossiers.every((row) => Object.values(row.evidence).every((state) => state === "NOT_REVIEWED")),
  };

  if (sourceNetworkRequests !== 0 || supabaseMutationAttempts !== 0) {
    throw new Error(`MASS-2A read-only firewall violation: ${JSON.stringify({ sourceNetworkRequests, supabaseMutationAttempts })}`);
  }
  if (!proof.coverageMatchesMass1Queue || proof.uniqueDossierDomains !== proof.dossiersProduced) {
    throw new Error(`MASS-2A dossier coverage mismatch: ${JSON.stringify(proof)}`);
  }
  if (!proof.allDossiersUnreviewed || !proof.allDossiersHold || !proof.allDossiersNonActivable || !proof.allPermissionsNotInferred) {
    throw new Error(`MASS-2A fail-closed invariant violated: ${JSON.stringify(proof)}`);
  }

  const csvHeader = [
    "rank", "cohort", "source_domain", "source_role", "review_priority_score",
    "url_representations", "likely_morocco_real_estate_urls", "likely_morocco_listing_detail_urls",
    "registry_status", "authorization_status", "display_policy", "display_gate", "acquisition_mode", "ingestion_gate",
    "review_status", "proposed_decision", "permission_inferred", "public_activable_now",
  ];
  const csv = [
    csvHeader.join(","),
    ...batch.dossiers.map((row) => [
      row.rank, row.reviewCohort, row.sourceDomain, row.sourceRole, row.reviewPriorityScore,
      row.yield.urlRepresentations, row.yield.likelyMoroccoRealEstateUrls, row.yield.likelyMoroccoListingDetailUrls,
      row.registrySnapshot.registryStatus, row.registrySnapshot.authorizationStatus, row.registrySnapshot.displayPolicy,
      row.registrySnapshot.displayGate, row.registrySnapshot.acquisitionMode, row.registrySnapshot.ingestionGate,
      row.reviewStatus, row.proposedDecision, row.permissionInferred, row.publicActivableNow,
    ].map(csvCell).join(",")),
  ].join("\n");

  const markdown = [
    "# DATA MASS-2A — Source Factory Engine live audit",
    "",
    `Generated: ${proof.generatedAt}`,
    "",
    "## Boundary",
    "",
    "- MASS-2A schedules source review; it does not perform the current robots/CGU/permission review.",
    "- Yield and priority are never permission or public eligibility.",
    "- Every dossier starts UNREVIEWED + HOLD + non-activable.",
    "- Network is restricted to the configured Supabase origin and GET only; no source page or mutation request is allowed.",
    "",
    "## Live handoff",
    "",
    `- Source Factory domains: **${proof.dossiersProduced}**`,
    `- Cohorts high / mid / long-tail: **${proof.highYieldDomains} / ${proof.midYieldDomains} / ${proof.longTailDomains}**`,
    `- Candidate URL representations: **${proof.candidateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Likely Morocco RE representations: **${proof.likelyMoroccoRealEstateUrlRepresentations.toLocaleString("en-US")}**`,
    `- Likely Morocco detail representations: **${proof.likelyMoroccoListingDetailUrlRepresentations.toLocaleString("en-US")}**`,
    `- Source network requests / mutation attempts / activations: **${proof.sourceNetworkRequests} / ${proof.databaseWrites} / ${proof.searchActivations}**`,
    "",
    "## High-yield cohort",
    "",
    "| # | Domain | Role | Morocco RE | Detail | Score | Decision |",
    "|---:|---|---|---:|---:|---:|---|",
    ...batch.dossiers.filter((row) => row.reviewCohort === "HIGH_YIELD").map((row) =>
      `| ${row.rank} | ${row.sourceDomain} | ${row.sourceRole} | ${row.yield.likelyMoroccoRealEstateUrls} | ${row.yield.likelyMoroccoListingDetailUrls} | ${row.reviewPriorityScore.toFixed(2)} | ${row.proposedDecision} |`,
    ),
    "",
  ].join("\n");

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "dossiers.json"), `${JSON.stringify(batch, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, "dossiers.csv"), `${csv}\n`),
    fs.writeFile(path.join(OUT_DIR, "summary.md"), `${markdown}\n`),
  ]);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
