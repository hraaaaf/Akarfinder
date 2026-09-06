import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { classifyReservoirCandidate } from '../data-mass/reservoir-qualification';
import { applyDeepExpansion } from '../data-mass/deep-expansion';

const OUT = process.env.Q1A_MASSX2_OUT ?? '.tmp/candidate-lake-q1a-massx2';
const AS_OF = process.env.Q1A_MASSX2_AS_OF ?? '2026-08-13T23:07:33Z';
const PAGE = 1000;
const TARGETS = [
  { domain: 'jibril.immo', pattern: 'JIBRIL_BIENS_SLUG', expected: 40 },
  { domain: 'swimmobilier.com', pattern: 'SW_PROPRIETE_SLUG', expected: 27 },
  { domain: 'loco.ma', pattern: 'LOCO_IMMOBILIERS_SLUG', expected: 6 },
] as const;

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
  const response = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${table} ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

type Row = {
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

async function readDomain(domain: string): Promise<Row[]> {
  const out: Row[] = [];
  let last = '';
  for (;;) {
    const query: Record<string, string> = {
      select: 'id,source_domain,source_url,canonical_url,title,snippet,discovery_query,content_fingerprint,last_seen_at,created_at',
      source_domain: `eq.${domain}`,
      created_at: `lte.${AS_OF}`,
      order: 'id.asc',
      limit: String(PAGE),
    };
    if (last) query.id = `gt.${last}`;
    const page = await rest<Row>('discovery_candidates', query);
    out.push(...page);
    if (page.length < PAGE) break;
    const next = page.at(-1)?.id;
    if (!next || next === last) throw new Error(`keyset stalled for ${domain}`);
    last = next;
  }
  return out;
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const lanes = [] as Array<Record<string, unknown>>;
  const manifestRows: Array<{ source_domain: string; canonical_url: string; pattern: string }> = [];
  const hashes: Record<string, { rows: number; sha256: string }> = {};

  for (const target of TARGETS) {
    const rows = await readDomain(target.domain);
    const uniq = new Map<string, Row>();
    for (const row of rows) {
      const raw = row.canonical_url || row.source_url;
      if (!raw) continue;
      const url = canon(raw);
      const existing = uniq.get(url);
      if (!existing || (row.last_seen_at ?? '') > (existing.last_seen_at ?? '')) uniq.set(url, row);
    }

    const upgraded: string[] = [];
    for (const [url, row] of uniq) {
      const candidate = {
        sourceDomain: target.domain,
        url,
        title: row.title,
        snippet: row.snippet,
        discoveryQuery: row.discovery_query,
        contentFingerprint: row.content_fingerprint,
      };
      const base = classifyReservoirCandidate(candidate);
      const expanded = applyDeepExpansion(candidate, base);
      if (expanded.upgradedByMassX2 && expanded.deepExpansionPattern === target.pattern) upgraded.push(url);
    }

    upgraded.sort();
    const text = upgraded.length ? `${upgraded.join('\n')}\n` : '';
    const filename = `${target.domain}.txt`;
    await fs.writeFile(path.join(OUT, filename), text, 'utf8');
    hashes[filename] = { rows: upgraded.length, sha256: sha256(text) };
    for (const url of upgraded) manifestRows.push({ source_domain: target.domain, canonical_url: url, pattern: target.pattern });

    lanes.push({
      sourceDomain: target.domain,
      pattern: target.pattern,
      sourceRowsAsOf: rows.length,
      distinctUrlsAsOf: uniq.size,
      upgradedExactUrls: upgraded.length,
      expected: target.expected,
      matchesHistoricalAudit: upgraded.length === target.expected,
    });
  }

  manifestRows.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.canonical_url.localeCompare(b.canonical_url));
  const manifestText = manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');
  hashes['manifest.jsonl'] = { rows: manifestRows.length, sha256: sha256(manifestText) };

  const summary = {
    schemaVersion: 'Q1A_MASS_X2_EXACT_REPLAY_V1',
    historicalAuditCommit: '659b98985099f88e3aa90c852a9023b4ece42b69',
    historicalClassifierBlob: 'f2ff507996529fa8cd49fdb9b581b1e52595eebc',
    historicalDeepExpansionBlob: 'c2820baaf6278f767675dd577ae7e384d51f5612',
    asOf: AS_OF,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceNetworkRequests: 0,
    sourceSiteFetches: 0,
    detailPageFetches: 0,
    vercelDeployments: 0,
    lanes,
    actualTotal: manifestRows.length,
    expectedTotal: TARGETS.reduce((sum, target) => sum + target.expected, 0),
    exactHistoricalMatch: lanes.every((lane) => lane.matchesHistoricalAudit === true) && manifestRows.length === 73,
    hashes,
  };

  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
