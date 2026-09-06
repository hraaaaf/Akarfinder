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
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${table} ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

type Row = {
  id: string; source_domain: string; source_url: string; canonical_url: string | null;
  title: string | null; snippet: string | null; discovery_query: string | null;
  content_fingerprint: string | null; last_seen_at: string | null; created_at: string;
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

function qualifies(target: (typeof TARGETS)[number], url: string, row: Row): boolean {
  const candidate = {
    sourceDomain: target.domain,
    url,
    title: row.title,
    snippet: row.snippet,
    discoveryQuery: row.discovery_query,
    contentFingerprint: row.content_fingerprint,
  };
  const expanded = applyDeepExpansion(candidate, classifyReservoirCandidate(candidate));
  return expanded.upgradedByMassX2 && expanded.deepExpansionPattern === target.pattern;
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const lanes: Array<Record<string, unknown>> = [];
  const manifestRows: Array<{ source_domain: string; canonical_url: string; pattern: string; recovery: string }> = [];
  const hashes: Record<string, { rows: number; sha256: string }> = {};

  for (const target of TARGETS) {
    const rows = await readDomain(target.domain);
    const versions = new Map<string, Row[]>();
    for (const row of rows) {
      const raw = row.canonical_url || row.source_url;
      if (!raw) continue;
      const url = canon(raw);
      const bucket = versions.get(url) ?? [];
      bucket.push(row);
      versions.set(url, bucket);
    }

    const latest = new Set<string>();
    const anyVersion = new Set<string>();
    const witnessRows: Array<{ url: string; row: Row }> = [];
    for (const [url, bucket] of versions) {
      const latestRow = [...bucket].sort((a, b) => (b.last_seen_at ?? '').localeCompare(a.last_seen_at ?? '') || b.created_at.localeCompare(a.created_at))[0];
      if (latestRow && qualifies(target, url, latestRow)) latest.add(url);
      const witness = bucket.find((row) => qualifies(target, url, row));
      if (witness) {
        anyVersion.add(url);
        witnessRows.push({ url, row: witness });
      }
    }

    const recoveredOnly = [...anyVersion].filter((url) => !latest.has(url)).sort();
    const selected = anyVersion.size === target.expected ? [...anyVersion].sort() : [...latest].sort();
    const recovery = anyVersion.size === target.expected ? 'ANY_PRE_AUDIT_VERSION_WITNESS' : 'LATEST_LAST_SEEN_FAIL_CLOSED';

    const text = selected.length ? `${selected.join('\n')}\n` : '';
    const filename = `${target.domain}.txt`;
    await fs.writeFile(path.join(OUT, filename), text, 'utf8');
    hashes[filename] = { rows: selected.length, sha256: sha256(text) };
    await fs.writeFile(path.join(OUT, `${target.domain}.recovered-only.txt`), recoveredOnly.length ? `${recoveredOnly.join('\n')}\n` : '', 'utf8');
    await fs.writeFile(path.join(OUT, `${target.domain}.witnesses.json`), `${JSON.stringify(witnessRows, null, 2)}\n`, 'utf8');

    for (const url of selected) manifestRows.push({ source_domain: target.domain, canonical_url: url, pattern: target.pattern, recovery });
    lanes.push({
      sourceDomain: target.domain,
      pattern: target.pattern,
      sourceRowsAsOf: rows.length,
      distinctUrlsAsOf: versions.size,
      latestQualified: latest.size,
      anyHistoricalVersionQualified: anyVersion.size,
      recoveredFromOlderVersions: recoveredOnly.length,
      expected: target.expected,
      selectedExactUrls: selected.length,
      recovery,
      matchesHistoricalAudit: selected.length === target.expected,
    });
  }

  manifestRows.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.canonical_url.localeCompare(b.canonical_url));
  const manifestText = manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');
  hashes['manifest.jsonl'] = { rows: manifestRows.length, sha256: sha256(manifestText) };

  const summary = {
    schemaVersion: 'Q1A_MASS_X2_EXACT_REPLAY_V2',
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
    expectedTotal: 73,
    exactHistoricalMatch: lanes.every((lane) => lane.matchesHistoricalAudit === true) && manifestRows.length === 73,
    hashes,
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
