import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { classifyReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT = process.env.Q1A_1IMMO_OUT ?? '.tmp/candidate-lake-q1a-1immo';
const AS_OF = process.env.Q1A_1IMMO_AS_OF ?? '2026-09-06T11:37:31Z';
const AS_OF_MS = Date.parse(AS_OF);
const FROM_MS = Date.parse('2026-07-01T00:00:00Z');
const PAGE = 1000;
const TARGET = '1immo.ma';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

const canon = (raw: string) => {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return raw.trim();
  }
};
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

async function rest<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env('SUPABASE_URL'));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(45_000),
    });
    if (response.ok) return response.json() as Promise<T[]>;
    const body = await response.text();
    if (attempt === 3 || !(response.status === 429 || response.status >= 500)) {
      throw new Error(`${table} ${response.status} ${body}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  return [];
}

type DiscoveryRow = {
  id: string;
  source_domain: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  snippet: string | null;
  discovery_query: string | null;
  content_fingerprint: string | null;
  last_seen_at: string | null;
  created_at: string;
};
type SeedRow = { canonical_url: string; created_at: string };

const SELECT = 'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at,created_at';

async function readWindow(startMs: number, endMs: number, depth = 0): Promise<DiscoveryRow[]> {
  if (depth > 24) throw new Error('adaptive temporal partition exceeded depth 24');
  const start = new Date(startMs).toISOString();
  const end = new Date(endMs).toISOString();
  const page = await rest<DiscoveryRow>('discovery_candidates', {
    select: SELECT,
    source_domain: `eq.${TARGET}`,
    and: `(created_at.gte.${start},created_at.lt.${end})`,
    limit: String(PAGE),
  });
  if (page.length < PAGE) return page;
  if (endMs - startMs <= 1) throw new Error(`more than ${PAGE} rows in 1ms window at ${start}`);
  const middle = Math.floor((startMs + endMs) / 2);
  const [left, right] = await Promise.all([
    readWindow(startMs, middle, depth + 1),
    readWindow(middle, endMs, depth + 1),
  ]);
  return [...left, ...right];
}

async function readDiscovery(): Promise<DiscoveryRow[]> {
  // Split the frozen period into seven-day outer windows. Any window that reaches the
  // PostgREST page cap is recursively bisected until its complete rowset is proven <1000.
  const rows: DiscoveryRow[] = [];
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const exclusiveEnd = AS_OF_MS + 1;
  for (let start = FROM_MS; start < exclusiveEnd; start += WEEK) {
    const end = Math.min(start + WEEK, exclusiveEnd);
    rows.push(...await readWindow(start, end));
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...byId.values()];
}

async function readSeeds(): Promise<SeedRow[]> {
  const rows = await rest<SeedRow>('source_offer_seeds', {
    select: 'canonical_url,created_at',
    source_domain: `eq.${TARGET}`,
    limit: String(PAGE),
  });
  return rows.filter((row) => Date.parse(row.created_at) <= AS_OF_MS);
}

async function main(): Promise<void> {
  const [rows, seeds] = await Promise.all([readDiscovery(), readSeeds()]);
  const seedSet = new Set(seeds.map((row) => canon(row.canonical_url)));

  const uniq = new Map<string, DiscoveryRow>();
  for (const row of rows) {
    const url = canon(row.canonical_url || row.source_url);
    const existing = uniq.get(url);
    if (!existing || (row.last_seen_at ?? '') > (existing.last_seen_at ?? '')) uniq.set(url, row);
  }

  const details = new Set<string>();
  const overlap = new Set<string>();
  const net = new Set<string>();
  for (const [url, row] of uniq) {
    const classified = classifyReservoirCandidate({
      sourceDomain: TARGET,
      url,
      title: row.title,
      snippet: row.snippet,
      discoveryQuery: row.discovery_query,
      contentFingerprint: row.content_fingerprint,
    });
    if (
      classified.likelyRealEstate &&
      classified.pageKind === 'LIKELY_LISTING_DETAIL' &&
      classified.geographyScope === 'MOROCCO_LIKELY'
    ) {
      details.add(url);
      if (seedSet.has(url)) overlap.add(url);
      else net.add(url);
    }
  }

  const exact = [...net].sort();
  const exactText = exact.length ? `${exact.join('\n')}\n` : '';
  const manifestRows = exact.map((canonicalUrl) => ({
    source_domain: TARGET,
    canonical_url: canonicalUrl,
    layer: 'L0' as const,
    provenance: 'Historical Gap Hunt 34030138761 replay from preserved discovery_candidates + source_offer_seeds',
    temporal_cohort: `created_at<=${AS_OF}`,
  }));
  const manifestText = manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : '');

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, '1immo-exact-net-new.txt'), exactText, 'utf8');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');

  const actual = {
    rawRows: rows.length,
    discoveryDistinct: uniq.size,
    seedDistinct: seedSet.size,
    detailDistinct: details.size,
    exactOverlapSeeds: overlap.size,
    exactNetNewVsSeeds: net.size,
  };
  const expected = {
    discoveryDistinct: 5219,
    detailDistinct: 3661,
    exactOverlapSeeds: 190,
    exactNetNewVsSeeds: 3471,
  };
  const exactHistoricalMatch =
    actual.discoveryDistinct === expected.discoveryDistinct &&
    actual.detailDistinct === expected.detailDistinct &&
    actual.exactOverlapSeeds === expected.exactOverlapSeeds &&
    actual.exactNetNewVsSeeds === expected.exactNetNewVsSeeds;

  const summary = {
    schemaVersion: 'Q1A_1IMMO_EXACT_HISTORICAL_REPLAY_V1',
    sourceHistoricalRun: 34030138761,
    sourceHistoricalArtifact: 9988514932,
    asOf: AS_OF,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceNetworkRequests: 0,
    sourceSiteFetches: 0,
    detailPageFetches: 0,
    vercelDeployments: 0,
    adaptiveTemporalPartition: true,
    actual,
    expected,
    exactHistoricalMatch,
    hashes: {
      '1immo-exact-net-new.txt': { rows: exact.length, sha256: sha256(exactText) },
      'manifest.jsonl': { rows: manifestRows.length, sha256: sha256(manifestText) },
    },
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  if (!exactHistoricalMatch) process.exitCode = 2;
}

main().catch((error) => { console.error(error); process.exit(1); });
