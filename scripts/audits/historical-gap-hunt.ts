import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { classifyReservoirCandidate } from '../data-mass/reservoir-qualification';

const OUT = process.env.GAP_HUNT_OUT ?? '.tmp/historical-gap-hunt';
const PAGE = 1000;
const AS_OF = process.env.GAP_HUNT_AS_OF?.trim() || null;
const AS_OF_MS = AS_OF ? Date.parse(AS_OF) : null;
const DEFAULT_TARGETS = [
  'agenz.ma', '1immo.ma', 'ma.afribaba.com', 'masaken.ma', 'soukimmobilier.com', 'mouldar.com',
  'promoimmomarrakech.com', 'logic-immo.com', 'yakeey.com', '2p.ma', '1000-annonces.com',
  'housing.place', 'expat.com', 'milkiya.ma', 'sakane.ma', 'domio.ma', 'dabaannonce.ma',
  'portail-immobilier.ma', 'souqcity.ma', 'kawtarimmobilier.com', 'atlasimmobilier.com',
];
const TARGETS = new Set(
  (process.env.GAP_HUNT_TARGETS?.split(',').map((value) => value.trim()).filter(Boolean) ?? DEFAULT_TARGETS)
    .map((value) => value.toLowerCase().replace(/^www\./, '')),
);

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

const norm = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, '');
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

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function rest<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env('SUPABASE_URL'));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.ok) return response.json() as Promise<T[]>;
    const body = await response.text();
    if (attempt === 3 || !(response.status === 429 || response.status >= 500)) {
      throw new Error(`${table} ${response.status} ${body}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  return [];
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
  created_at: string;
};

type SeedRow = { canonical_url: string; source_domain?: string | null; created_at: string };

type DomainSets = {
  all: Set<string>;
  details: Set<string>;
  overlap: Set<string>;
  net: Set<string>;
};

function visibleAt(createdAt: string): boolean {
  return AS_OF_MS === null || Date.parse(createdAt) <= AS_OF_MS;
}

async function readDiscovery(): Promise<DiscoveryRow[]> {
  const out: DiscoveryRow[] = [];
  let last = '';
  for (;;) {
    const query: Record<string, string> = {
      select: 'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at,created_at',
      order: 'id.asc',
      limit: String(PAGE),
    };
    if (last) query.id = `gt.${last}`;
    if (TARGETS.size === 1) query.source_domain = `eq.${[...TARGETS][0]}`;
    const page = await rest<DiscoveryRow>('discovery_candidates', query);
    out.push(...page.filter((row) => TARGETS.has(norm(row.source_domain)) && visibleAt(row.created_at)));
    if (page.length < PAGE) break;
    const next = page.at(-1)?.id;
    if (!next || next === last) throw new Error('keyset stalled');
    last = next;
  }
  return out;
}

async function readSeeds(): Promise<SeedRow[]> {
  const out: SeedRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await rest<SeedRow>('source_offer_seeds', {
      select: 'canonical_url,source_domain,created_at',
      limit: String(PAGE),
      offset: String(offset),
    });
    out.push(...page.filter((row) => visibleAt(row.created_at)));
    if (page.length < PAGE) break;
  }
  return out;
}

async function main(): Promise<void> {
  const [rows, seeds] = await Promise.all([readDiscovery(), readSeeds()]);
  const seedSet = new Set(seeds.map((row) => canon(row.canonical_url)));

  const uniq = new Map<string, DiscoveryRow>();
  for (const row of rows) {
    const raw = row.canonical_url || row.source_url;
    if (!raw) continue;
    const url = canon(raw);
    const existing = uniq.get(url);
    if (!existing || (row.last_seen_at ?? '') > (existing.last_seen_at ?? '')) uniq.set(url, row);
  }

  const byDomain = new Map<string, DomainSets>();
  for (const [url, row] of uniq) {
    const sourceDomain = norm(row.source_domain);
    if (!TARGETS.has(sourceDomain)) continue;
    const bucket = byDomain.get(sourceDomain) ?? {
      all: new Set<string>(),
      details: new Set<string>(),
      overlap: new Set<string>(),
      net: new Set<string>(),
    };
    bucket.all.add(url);
    const classified = classifyReservoirCandidate({
      sourceDomain,
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
      bucket.details.add(url);
      if (seedSet.has(url)) bucket.overlap.add(url);
      else bucket.net.add(url);
    }
    byDomain.set(sourceDomain, bucket);
  }

  const domains = [...byDomain.entries()]
    .map(([sourceDomain, bucket]) => ({
      sourceDomain,
      discoveryDistinct: bucket.all.size,
      detailDistinct: bucket.details.size,
      exactOverlapSeeds: bucket.overlap.size,
      exactNetNewVsSeeds: bucket.net.size,
    }))
    .sort((a, b) => b.exactNetNewVsSeeds - a.exactNetNewVsSeeds || a.sourceDomain.localeCompare(b.sourceDomain));

  await fs.mkdir(OUT, { recursive: true });
  const exactDir = path.join(OUT, 'exact-net-new');
  await fs.mkdir(exactDir, { recursive: true });

  const manifestRows: Array<{ source_domain: string; canonical_url: string }> = [];
  const hashes: Record<string, { rows: number; sha256: string }> = {};
  for (const sourceDomain of [...byDomain.keys()].sort()) {
    const urls = [...(byDomain.get(sourceDomain)?.net ?? [])].sort();
    const text = urls.length ? `${urls.join('\n')}\n` : '';
    const relative = `exact-net-new/${sourceDomain}.txt`;
    await fs.writeFile(path.join(OUT, relative), text, 'utf8');
    hashes[relative] = { rows: urls.length, sha256: sha256(text) };
    for (const canonicalUrl of urls) manifestRows.push({ source_domain: sourceDomain, canonical_url: canonicalUrl });
  }

  manifestRows.sort((a, b) =>
    a.source_domain.localeCompare(b.source_domain) || a.canonical_url.localeCompare(b.canonical_url),
  );
  const manifestText = manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'exact-net-new.jsonl'), manifestText, 'utf8');
  hashes['exact-net-new.jsonl'] = { rows: manifestRows.length, sha256: sha256(manifestText) };

  const summary = {
    generatedAt: new Date().toISOString(),
    asOf: AS_OF,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceNetworkRequests: 0,
    sourceSiteFetches: 0,
    detailPageFetches: 0,
    unitOfCount: 'CANONICAL_URL_REPRESENTATION',
    identityExportDeterministic: true,
    targets: [...TARGETS].sort(),
    domains,
    totalExactNetNewVsSeeds: domains.reduce((sum, row) => sum + row.exactNetNewVsSeeds, 0),
    hashes,
  };

  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(OUT, 'domains.csv'),
    [
      'source_domain,discovery_distinct,detail_distinct,exact_overlap_seeds,exact_net_new_vs_seeds',
      ...domains.map((row) =>
        `${row.sourceDomain},${row.discoveryDistinct},${row.detailDistinct},${row.exactOverlapSeeds},${row.exactNetNewVsSeeds}`,
      ),
    ].join('\n') + '\n',
    'utf8',
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
