// Q1A deterministic DB-backed candidate export.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.env.Q1A_DB_OUT ?? '.tmp/candidate-lake-q1a-db';
const PAGE = 1000;

const SEED_LANES: Record<string, number> = {
  'marrakechrealty.com': 1944,
  'barnes-marrakech.com': 282,
  '1immo.ma': 201,
  'sakane.ma': 191,
  'milkiya.ma': 131,
  'expat.com': 83,
  '1000-annonces.com': 66,
  'housing.place': 22,
};

const EXPECTED = {
  b3StrictMorocco: 5797,
  canonicalLinkV2: 6270,
  currentSeedLanes: 2920,
  total: 14987,
};

const REAL_ESTATE_NAME_SIGNAL =
  /(?:immo|immobilier|property|properties|realty|estate|housing|homes?|maison|logement|sakane|sakan|beyti?|dar)/i;
const CLASSIFIED_NAME_SIGNAL = /(?:annonce|annonces|classified|souq|souk|market)/i;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, requiredEnv('SUPABASE_URL'));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    method: 'GET',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${table} GET failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

type SeedRow = {
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  first_observed_at: string | null;
  last_observed_at: string | null;
};

type B3Row = {
  source_domain: string;
  canonical_url: string;
  provider: string;
  last_seen_at: string | null;
  decision: string;
};

type CanonicalLinkRow = {
  canonical_url: string;
  source_domain: string;
  observation_observed_at: string | null;
  ranking_policy_version: string;
};

type ManifestRow = {
  lane: string;
  source: string;
  identity_kind: 'canonical_url';
  source_identity: string;
  evidence: string;
  layer: 'L0';
  temporal_cohort: string;
  observed_at: string | null;
};

function strictB3Domain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '');
  return normalized.endsWith('.ma') &&
    (REAL_ESTATE_NAME_SIGNAL.test(normalized) || CLASSIFIED_NAME_SIGNAL.test(normalized));
}

function uniqueByIdentity(rows: ManifestRow[]): ManifestRow[] {
  const map = new Map<string, ManifestRow>();
  for (const row of rows) {
    const key = `${row.source}\u0000${row.source_identity}`;
    if (map.has(key)) throw new Error(`duplicate identity inside lane: ${row.source} ${row.source_identity}`);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) =>
    a.source.localeCompare(b.source) || a.source_identity.localeCompare(b.source_identity),
  );
}

function temporal(value: string | null): string {
  return value ? value.slice(0, 10) : 'unknown';
}

async function writeJsonl(name: string, rows: ManifestRow[]) {
  const text = rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, name), text, 'utf8');
  return { file: name, rows: rows.length, sha256: sha256(text) };
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });

  const [allSeeds, b3Rows, canonicalLinkRows] = await Promise.all([
    restAll<SeedRow>('source_offer_seeds', {
      select: 'canonical_url,source_domain,seed_provider,first_observed_at,last_observed_at',
      order: 'canonical_url.asc',
    }),
    restAll<B3Row>('odm_b3_discovery_expansion_audit_v1', {
      select: 'source_domain,canonical_url,provider,last_seen_at,decision',
      decision: 'eq.reserve_unregistered_source',
      order: 'canonical_url.asc',
    }),
    restAll<CanonicalLinkRow>('odm_search_read_model_shadow_v3', {
      select: 'canonical_url,source_domain,observation_observed_at,ranking_policy_version',
      ranking_policy_version: 'eq.canonical_link_coverage_expansion_v2',
      order: 'canonical_url.asc',
    }),
  ]);

  const seedUrls = new Set(allSeeds.map((row) => row.canonical_url));

  const b3 = uniqueByIdentity(
    b3Rows
      .filter((row) => strictB3Domain(row.source_domain) && !seedUrls.has(row.canonical_url))
      .map((row) => ({
        lane: 'b3_strict_morocco_reserve',
        source: row.source_domain,
        identity_kind: 'canonical_url' as const,
        source_identity: row.canonical_url,
        evidence: `odm_b3_discovery_expansion_audit_v1:${row.provider}:DATA-1.2-HIGH+strict-.ma+exact-seed-antioverlap`,
        layer: 'L0' as const,
        temporal_cohort: temporal(row.last_seen_at),
        observed_at: row.last_seen_at,
      })),
  );

  const canonical = uniqueByIdentity(
    canonicalLinkRows.map((row) => ({
      lane: 'canonical_link_coverage_expansion_v2',
      source: row.source_domain,
      identity_kind: 'canonical_url' as const,
      source_identity: row.canonical_url,
      evidence: 'odm_search_read_model_shadow_v3:ranking_policy_version=canonical_link_coverage_expansion_v2',
      layer: 'L0' as const,
      temporal_cohort: temporal(row.observation_observed_at),
      observed_at: row.observation_observed_at,
    })),
  );

  const seedLaneRows = allSeeds.filter((row) => Object.hasOwn(SEED_LANES, row.source_domain));
  const seeds = uniqueByIdentity(seedLaneRows.map((row) => ({
    lane: 'current_source_offer_seed_lanes_at_m250k_freeze',
    source: row.source_domain,
    identity_kind: 'canonical_url' as const,
    source_identity: row.canonical_url,
    evidence: `source_offer_seeds:${row.seed_provider}`,
    layer: 'L0' as const,
    temporal_cohort: temporal(row.first_observed_at),
    observed_at: row.last_observed_at,
  })));

  if (b3.length !== EXPECTED.b3StrictMorocco) throw new Error(`B3 count drift: ${b3.length}`);
  if (canonical.length !== EXPECTED.canonicalLinkV2) throw new Error(`canonical-link count drift: ${canonical.length}`);
  if (seeds.length !== EXPECTED.currentSeedLanes) throw new Error(`seed-lane count drift: ${seeds.length}`);

  const seedCounts = Object.fromEntries(Object.keys(SEED_LANES).sort().map((domain) => [
    domain,
    seeds.filter((row) => row.source === domain).length,
  ]));
  for (const [domain, expected] of Object.entries(SEED_LANES)) {
    if (seedCounts[domain] !== expected) throw new Error(`seed lane ${domain} drift: ${seedCounts[domain]} != ${expected}`);
  }

  const canonicalCounts = Object.fromEntries(
    [...new Set(canonical.map((row) => row.source))].sort().map((domain) => [
      domain,
      canonical.filter((row) => row.source === domain).length,
    ]),
  );
  const expectedCanonical = { 'aykana.ma': 324, 'daragadir.com': 5567, 'limmobiliersansfrontieres.com': 379 };
  if (JSON.stringify(canonicalCounts) !== JSON.stringify(expectedCanonical)) {
    throw new Error(`canonical-link source drift: ${JSON.stringify(canonicalCounts)}`);
  }

  const combined = [...b3, ...canonical, ...seeds].sort((a, b) =>
    a.lane.localeCompare(b.lane) || a.source.localeCompare(b.source) || a.source_identity.localeCompare(b.source_identity),
  );
  if (combined.length !== EXPECTED.total) throw new Error(`combined count drift: ${combined.length}`);

  const files = [
    await writeJsonl('b3-strict-morocco.jsonl', b3),
    await writeJsonl('canonical-link-v2.jsonl', canonical),
    await writeJsonl('current-seed-lanes.jsonl', seeds),
    await writeJsonl('db-backed-candidates.jsonl', combined),
  ];

  const summary = {
    schemaVersion: 'candidate-lake-q1a-db-export-v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceSiteFetches: 0,
    sourceNetworkRequests: 0,
    vercelDeployments: 0,
    expected: EXPECTED,
    actual: { b3StrictMorocco: b3.length, canonicalLinkV2: canonical.length, currentSeedLanes: seeds.length, total: combined.length },
    seedCounts,
    canonicalCounts,
    files,
    truthBoundary: {
      unit: 'SOURCE_URL_REPRESENTATION',
      candidateIsNotActive: true,
      urlIsNotUniqueProperty: true,
      noFreshnessInferred: true,
      noAuthorizationInferred: true,
    },
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
