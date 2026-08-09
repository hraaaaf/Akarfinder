import fs from "node:fs/promises";
import path from "node:path";

const DOMAIN = "limmobiliersansfrontieres.com";
const CHANNEL = "public_sitemap_presence";
const RUN_ID = "data-4-7b-lsf-250-v1";
const BATCH_SIZE = 250;
const OUT_DIR = process.env.DATA_4_7B_OUT_DIR ?? ".tmp/data-4-7b/results";
const APPLY = process.env.DATA_4_7B_APPLY === "true";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 20_000;
const MAX_SOURCE_REQUESTS = 40;
const MAX_SITEMAP_URLS = 50_000;
let sourceRequests = 0;
let databaseWrites = 0;
let rollbackWrites = 0;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.7B requires ${name}`);
  return value;
}

function sameOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && [DOMAIN, `www.${DOMAIN}`].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function conservativeUrlIdentity(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (!sameOrigin(urlString)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname).normalize("NFC");
    } catch {
      pathname = url.pathname;
    }
    pathname = pathname.replace(/\/+$/, "") || "/";
    return `https://${host}${pathname}${url.search}`;
  } catch {
    return null;
  }
}

function extractRobotsSitemaps(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap\s*:\s*(\S+)\s*$/i);
    if (match?.[1] && sameOrigin(match[1])) out.add(match[1]);
  }
  return [...out].sort();
}

function parseSitemapXml(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&").trim())
    .filter(sameOrigin);
  return { kind, locs: [...new Set(locs)].sort() };
}

async function fetchSourceText(urlString: string): Promise<string> {
  if (!sameOrigin(urlString)) throw new Error(`DATA-4.7B disallowed source URL: ${urlString}`);
  sourceRequests += 1;
  if (sourceRequests > MAX_SOURCE_REQUESTS) throw new Error("DATA-4.7B source request budget exceeded");
  const response = await fetch(urlString, {
    redirect: "follow",
    headers: { "user-agent": "AkarFinder/1.0 (+DATA-4.7B; sitemap-only; no-detail-fetch)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sameOrigin(response.url)) throw new Error(`DATA-4.7B redirect left allowed origin: ${response.url}`);
  if (!response.ok) throw new Error(`DATA-4.7B source read failed ${response.status}: ${urlString}`);
  return response.text();
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}`, ...extra };
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${table} read failed ${response.status}: ${await response.text()}`);
  return await response.json() as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string | null;
  discovery_policy: string | null;
  display_policy: string | null;
  display_gate: string | null;
  allowed_discovery_channels: string[] | null;
  robots_status: string | null;
  evidence_urls: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
  next_review_at: string | null;
};

type SeedRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_last_seen_at: string | null;
  fresh_channels: string[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

type NormalizedRow = {
  canonical_url: string;
  normalization_status: string;
  freshness_status: string;
  title: string | null;
};

type DisplayRow = {
  canonical_url: string;
  quality_tier: string | null;
  quality_score: number | string | null;
  display_eligibility: string | null;
};

type PublicRow = { canonical_url: string };

type PlanRow = {
  canonicalUrl: string;
  sitemapUrl: string;
  qualityTier: string | null;
  qualityScore: number;
  rollback: {
    freshnessStatus: string;
    freshLastSeenAt: string | null;
    freshChannels: string[];
    metadata: Record<string, unknown> | null;
  };
  proposed: {
    freshnessStatus: "fresh_confirmed";
    freshLastSeenAt: string;
    freshChannels: string[];
    metadata: Record<string, unknown>;
  };
};

function registryAllows(policy: RegistryRow, now: Date): boolean {
  const nextReview = policy.next_review_at ? new Date(policy.next_review_at) : null;
  return policy.source_domain === DOMAIN
    && policy.acquisition_mode === "public_sitemap_canonical_link"
    && policy.discovery_policy === "public_sitemap_only"
    && policy.display_policy === "canonical_link_only"
    && policy.display_gate === "external_tail_link_only"
    && (policy.allowed_discovery_channels ?? []).includes("public_sitemap")
    && policy.robots_status === "sitemap_declared"
    && policy.max_revalidation_interval_days === 14
    && ["current", "due_soon"].includes(policy.review_status ?? "")
    && nextReview instanceof Date
    && Number.isFinite(nextReview.getTime())
    && nextReview.getTime() > now.getTime()
    && (policy.evidence_urls ?? []).includes(`https://${DOMAIN}/robots.txt`);
}

function numberOrZero(value: number | string | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function metadataRunId(metadata: Record<string, unknown> | null): string | null {
  const evidence = metadata?.freshness_evidence;
  if (!evidence || typeof evidence !== "object") return null;
  const runId = (evidence as Record<string, unknown>).run_id;
  return typeof runId === "string" ? runId : null;
}

async function patchSeed(canonicalUrl: string, payload: Record<string, unknown>, expectedStatus: string): Promise<void> {
  const url = new URL("/rest/v1/source_offer_seeds", env("SUPABASE_URL"));
  url.searchParams.set("source_domain", `eq.${DOMAIN}`);
  url.searchParams.set("canonical_url", `eq.${canonicalUrl}`);
  url.searchParams.set("freshness_status", `eq.${expectedStatus}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: authHeaders({ "content-type": "application/json", prefer: "return=representation" }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DATA-4.7B seed write failed ${response.status}: ${await response.text()}`);
  const changed = await response.json() as unknown[];
  if (changed.length !== 1) throw new Error(`DATA-4.7B compare-and-set state drift: ${canonicalUrl}`);
}

function requireApplyAcknowledgements(): void {
  if (process.env.DATA_4_7B_CONFIRM_CURRENT_SITEMAP !== "BATCH_1_YES") throw new Error("DATA-4.7B current sitemap acknowledgement missing");
  if (process.env.DATA_4_7B_CONFIRM_ROLLBACK_READY !== "BATCH_1_YES") throw new Error("DATA-4.7B rollback acknowledgement missing");
  if (process.env.DATA_4_7B_CONFIRM_BOUNDED_WRITE !== "BATCH_1_YES") throw new Error("DATA-4.7B bounded write acknowledgement missing");
}

async function rollback(applied: PlanRow[]): Promise<void> {
  for (const row of [...applied].reverse()) {
    await patchSeed(row.canonicalUrl, {
      freshness_status: row.rollback.freshnessStatus,
      fresh_last_seen_at: row.rollback.freshLastSeenAt,
      fresh_channels: row.rollback.freshChannels,
      metadata: row.rollback.metadata,
    }, "fresh_confirmed");
    rollbackWrites += 1;
  }
}

async function certify(urls: Set<string>, requireFresh: boolean): Promise<Record<string, number>> {
  const [seeds, normalized, display, publicRows] = await Promise.all([
    restAll<SeedRow>("source_offer_seeds", { select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at", source_domain: `eq.${DOMAIN}` }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", { select: "canonical_url,normalization_status,freshness_status,title", source_domain: `eq.${DOMAIN}` }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", { select: "canonical_url,quality_tier,quality_score,display_eligibility", source_domain: `eq.${DOMAIN}` }),
    restAll<PublicRow>("public_search_representations_v1", { select: "canonical_url", source_domain: `eq.${DOMAIN}` }),
  ]);
  const selectedSeeds = seeds.filter((row) => urls.has(row.canonical_url));
  const selectedNormalized = normalized.filter((row) => urls.has(row.canonical_url));
  const selectedDisplay = display.filter((row) => urls.has(row.canonical_url));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));
  const counts = {
    expectedRows: urls.size,
    seedRows: selectedSeeds.length,
    normalizedRows: selectedNormalized.filter((row) => row.normalization_status === "normalized").length,
    technicalDisplayRows: selectedDisplay.filter((row) => ["eligible_primary", "eligible_secondary"].includes(row.display_eligibility ?? "")).length,
    publicSearchRows: selectedSeeds.filter((row) => publicSet.has(row.canonical_url)).length,
    freshConfirmedRows: selectedSeeds.filter((row) => row.freshness_status === "fresh_confirmed").length,
    sitemapChannelRows: selectedSeeds.filter((row) => (row.fresh_channels ?? []).includes(CHANNEL)).length,
  };
  if (counts.seedRows !== urls.size || counts.normalizedRows !== urls.size || counts.technicalDisplayRows !== urls.size || counts.publicSearchRows !== urls.size) {
    throw new Error(`DATA-4.7B certification drift: ${JSON.stringify(counts)}`);
  }
  if (requireFresh && (counts.freshConfirmedRows !== urls.size || counts.sitemapChannelRows !== urls.size)) {
    throw new Error(`DATA-4.7B freshness certification drift: ${JSON.stringify(counts)}`);
  }
  return counts;
}

async function main(): Promise<void> {
  const now = new Date();
  const observedAt = now.toISOString();
  const [registryRows, seeds, normalized, displayRows, publicRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,allowed_discovery_channels,robots_status,evidence_urls,max_revalidation_interval_days,review_status,next_review_at",
      source_domain: `eq.${DOMAIN}`,
    }),
    restAll<SeedRow>("source_offer_seeds", { select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata,updated_at", source_domain: `eq.${DOMAIN}` }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", { select: "canonical_url,normalization_status,freshness_status,title", source_domain: `eq.${DOMAIN}` }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", { select: "canonical_url,quality_tier,quality_score,display_eligibility", source_domain: `eq.${DOMAIN}` }),
    restAll<PublicRow>("public_search_representations_v1", { select: "canonical_url", source_domain: `eq.${DOMAIN}` }),
  ]);
  if (registryRows.length !== 1 || !registryAllows(registryRows[0]!, now)) throw new Error(`DATA-4.7B Registry gate failed: ${JSON.stringify(registryRows)}`);

  const existingRunRows = seeds.filter((row) => metadataRunId(row.metadata) === RUN_ID).length;
  if (existingRunRows > 0) {
    throw new Error(`DATA-4.7B one-shot run already applied: ${existingRunRows}/${BATCH_SIZE}`);
  }

  const robots = await fetchSourceText(`https://${DOMAIN}/robots.txt`);
  const roots = extractRobotsSitemaps(robots);
  if (roots.length === 0) throw new Error("DATA-4.7B robots declares no same-origin sitemap");

  const queue = [...roots];
  const visited = new Set<string>();
  const sitemapRows: { canonicalUrl: string; sitemapUrl: string }[] = [];
  while (queue.length > 0) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchSourceText(sitemapUrl));
    if (parsed.kind === "unknown") throw new Error(`DATA-4.7B unknown sitemap payload: ${sitemapUrl}`);
    if (parsed.kind === "index") {
      for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
    } else {
      for (const canonicalUrl of parsed.locs) {
        sitemapRows.push({ canonicalUrl, sitemapUrl });
        if (sitemapRows.length > MAX_SITEMAP_URLS) throw new Error("DATA-4.7B sitemap URL ceiling exceeded");
      }
    }
  }

  const dbIdentity = new Map<string, NormalizedRow[]>();
  for (const row of normalized) {
    const key = conservativeUrlIdentity(row.canonical_url);
    if (!key) continue;
    const bucket = dbIdentity.get(key) ?? [];
    bucket.push(row);
    dbIdentity.set(key, bucket);
  }
  const sitemapIdentity = new Map<string, { canonicalUrl: string; sitemapUrl: string }[]>();
  for (const row of sitemapRows) {
    const key = conservativeUrlIdentity(row.canonicalUrl);
    if (!key) continue;
    const bucket = sitemapIdentity.get(key) ?? [];
    bucket.push(row);
    sitemapIdentity.set(key, bucket);
  }

  const seedByUrl = new Map(seeds.map((row) => [row.canonical_url, row]));
  const displayByUrl = new Map(displayRows.map((row) => [row.canonical_url, row]));
  const publicSet = new Set(publicRows.map((row) => row.canonical_url));
  const candidates = normalized
    .filter((row) => row.normalization_status === "normalized" && row.freshness_status === "seed_only")
    .map((row) => {
      const identity = conservativeUrlIdentity(row.canonical_url);
      const sourceRows = identity ? sitemapIdentity.get(identity) : undefined;
      const dbRows = identity ? dbIdentity.get(identity) : undefined;
      const display = displayByUrl.get(row.canonical_url);
      return {
        row,
        sitemapUrl: sourceRows?.length === 1 && dbRows?.length === 1 ? sourceRows[0]!.sitemapUrl : null,
        display,
      };
    })
    .filter((x) => x.sitemapUrl !== null)
    .filter((x) => x.display && ["eligible_primary", "eligible_secondary"].includes(x.display.display_eligibility ?? ""))
    .filter((x) => publicSet.has(x.row.canonical_url))
    .sort((a, b) => {
      const quality = numberOrZero(b.display?.quality_score ?? null) - numberOrZero(a.display?.quality_score ?? null);
      if (quality !== 0) return quality;
      const title = Number(Boolean(b.row.title)) - Number(Boolean(a.row.title));
      if (title !== 0) return title;
      return a.row.canonical_url.localeCompare(b.row.canonical_url);
    });

  if (candidates.length < BATCH_SIZE) throw new Error(`DATA-4.7B insufficient live candidates: ${candidates.length}/${BATCH_SIZE}`);
  const selected = candidates.slice(0, BATCH_SIZE);
  const plan: PlanRow[] = selected.map(({ row, sitemapUrl, display }) => {
    const seed = seedByUrl.get(row.canonical_url);
    if (!seed || !sitemapUrl) throw new Error(`DATA-4.7B missing seed/sitemap row: ${row.canonical_url}`);
    const oldChannels = seed.fresh_channels ?? [];
    const freshChannels = [...new Set([...oldChannels, CHANNEL])].sort();
    const metadata = {
      ...(seed.metadata ?? {}),
      freshness_evidence: {
        source: "robots_declared_public_sitemap",
        channel: CHANNEL,
        run_id: RUN_ID,
        observed_at: observedAt,
        sitemap_url: sitemapUrl,
        ttl_days: 14,
      },
    };
    return {
      canonicalUrl: row.canonical_url,
      sitemapUrl,
      qualityTier: display?.quality_tier ?? null,
      qualityScore: numberOrZero(display?.quality_score ?? null),
      rollback: {
        freshnessStatus: seed.freshness_status,
        freshLastSeenAt: seed.fresh_last_seen_at,
        freshChannels: oldChannels,
        metadata: seed.metadata,
      },
      proposed: {
        freshnessStatus: "fresh_confirmed",
        freshLastSeenAt: observedAt,
        freshChannels,
        metadata,
      },
    };
  });

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "apply-manifest.json"), `${JSON.stringify({ runId: RUN_ID, observedAt, rows: plan }, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "rollback-manifest.json"), `${JSON.stringify({ runId: RUN_ID, rows: plan.map((row) => ({ canonicalUrl: row.canonicalUrl, rollback: row.rollback })) }, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "selected-urls.txt"), `${plan.map((row) => row.canonicalUrl).join("\n")}\n`);

  const selectedUrls = new Set(plan.map((row) => row.canonicalUrl));
  const preCertification = await certify(selectedUrls, false);

  if (!APPLY) {
    const proof = {
      schemaVersion: "data-4-7b-lsf-controlled-expansion-write-v1",
      mode: "DRY_RUN_READY",
      runId: RUN_ID,
      observedAt,
      sourceDomain: DOMAIN,
      currentSitemapUrlCount: sitemapRows.length,
      liveCandidateRows: candidates.length,
      batchSize: plan.length,
      preCertification,
      sourceRequests,
      sourceSiteDetailRequests: 0,
      databaseWrites: 0,
      rollbackWrites: 0,
      registryMutations: 0,
      policyChanges: 0,
      productionActivation: false,
      applyAuthorized: false,
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  requireApplyAcknowledgements();
  const applied: PlanRow[] = [];
  try {
    for (const row of plan) {
      await patchSeed(row.canonicalUrl, {
        freshness_status: row.proposed.freshnessStatus,
        fresh_last_seen_at: row.proposed.freshLastSeenAt,
        fresh_channels: row.proposed.freshChannels,
        metadata: row.proposed.metadata,
      }, "seed_only");
      databaseWrites += 1;
      applied.push(row);
    }
    const postCertification = await certify(selectedUrls, true);
    const proof = {
      schemaVersion: "data-4-7b-lsf-controlled-expansion-write-v1",
      mode: "APPLIED_AND_CERTIFIED",
      runId: RUN_ID,
      observedAt,
      sourceDomain: DOMAIN,
      batchSize: plan.length,
      preCertification,
      postCertification,
      sourceRequests,
      sourceSiteDetailRequests: 0,
      databaseWrites,
      rollbackWrites,
      registryMutations: 0,
      policyChanges: 0,
      productionActivation: true,
    };
    await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(JSON.stringify(proof, null, 2));
  } catch (error) {
    await rollback(applied);
    throw new Error(`DATA-4.7B apply failed; rolled back ${rollbackWrites}/${applied.length}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
