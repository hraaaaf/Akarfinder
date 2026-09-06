import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { conservativeUrlIdentity } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity, DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

const OUT = process.env.Q1A_DATA49B_WAYBACK_OUT ?? '.tmp/candidate-lake-q1a-data49b-wayback';
const HISTORICAL_OBSERVED_AT = '2026-08-10T08:32:48.268Z';
const TO = '20260810083248';
const EXPECTED: Record<string, number> = {
  'valfoncier.ma': 709,
  'christiesrealestatemorocco.com': 602,
  'immo-maroc.com': 276,
  'agadirimmobilier.ma': 37,
  'proimmobilier.ma': 99,
  'capital-properties.ma': 603,
};

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestText(url: URL): Promise<string> {
  let last = '';
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B-Wayback-recovery/1.0 metadata-only' },
        signal: AbortSignal.timeout(90_000),
      });
      const body = await response.text();
      if (response.ok) return body;
      last = `HTTP ${response.status}: ${body.slice(0, 500)}`;
      if (response.status !== 429 && response.status < 500) throw new Error(last);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      if (attempt === 8) throw error;
    }
    if (attempt < 8) await sleep(Math.min(20_000, 1000 * 2 ** (attempt - 1)));
  }
  throw new Error(last || 'Wayback CDX request failed');
}

async function queryPattern(pattern: string): Promise<string[]> {
  const url = new URL('https://web.archive.org/cdx/search/cdx');
  url.searchParams.set('url', pattern);
  url.searchParams.set('output', 'json');
  url.searchParams.set('fl', 'original');
  url.searchParams.append('filter', 'statuscode:200');
  url.searchParams.set('collapse', 'urlkey');
  url.searchParams.set('to', TO);
  const text = await requestText(url);
  if (!text.trim()) return [];
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error('unexpected Wayback CDX response');
  const rows = parsed as unknown[][];
  if (rows.length === 0) return [];
  const header = rows[0].map(String);
  const originalIndex = header.indexOf('original');
  if (originalIndex < 0) throw new Error('Wayback CDX response missing original column');
  const urls = new Set<string>();
  for (const row of rows.slice(1)) {
    const value = row?.[originalIndex];
    if (typeof value === 'string' && value) urls.add(value);
  }
  return [...urls];
}

async function queryDomain(domain: string): Promise<{ urls: string[]; errors: string[] }> {
  const urls = new Set<string>();
  const errors: string[] = [];
  for (const pattern of [`${domain}/*`, `www.${domain}/*`]) {
    try {
      const found = await queryPattern(pattern);
      for (const url of found) urls.add(url);
    } catch (error) {
      errors.push(`${pattern}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { urls: [...urls], errors };
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const manifest: Array<{ source_domain: string; identity: string; canonical_url: string }> = [];
  const domains: Array<Record<string, unknown>> = [];

  for (const sourceDomain of DATA_4_9B_SOURCES) {
    const result = await queryDomain(sourceDomain);
    const raw = new Set(result.urls);
    const buckets = new Map<string, string[]>();
    for (const url of raw) {
      const identity = conservativeUrlIdentity(sourceDomain, url);
      if (!identity) continue;
      const rows = buckets.get(identity) ?? [];
      rows.push(url);
      buckets.set(identity, rows);
    }
    const candidates = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([identity, urls]) => classifyStructuralIdentity(sourceDomain, identity, [...new Set(urls)].sort()))
      .filter((row) => row.classification === 'DETAIL_PATTERN_MATCH');

    for (const row of candidates) {
      manifest.push({ source_domain: sourceDomain, identity: row.identity, canonical_url: row.canonicalUrls[0] ?? '' });
    }
    const candidateLines = candidates.map((row) => `${row.identity}\t${row.canonicalUrls[0] ?? ''}`);
    domains.push({
      sourceDomain,
      queryErrors: result.errors,
      queryComplete: result.errors.length === 0,
      distinctRawUrls: raw.size,
      distinctConservativeIdentities: buckets.size,
      candidateRows: candidates.length,
      expectedHistoricalCandidateRows: EXPECTED[sourceDomain],
      exactCountMatch: result.errors.length === 0 && candidates.length === EXPECTED[sourceDomain],
      candidateDigestSha256: sha256(candidateLines.join('\n')),
    });
  }

  manifest.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.identity.localeCompare(b.identity));
  const manifestText = manifest.map((row) => JSON.stringify(row)).join('\n') + (manifest.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');

  const summary = {
    schemaVersion: 'Q1A_DATA49B_WAYBACK_CDX_RECOVERY_V1',
    historicalRun: 31370449455,
    historicalArtifact: 9055869351,
    historicalArtifactSha256: 'df4f38102877a5de29a7980dbb7e5b32a4110813d8af132fc48a46cf87126520',
    historicalObservedAt: HISTORICAL_OBSERVED_AT,
    expectedHistoricalCounts: EXPECTED,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceSiteFetches: 0,
    sourceContentFetches: 0,
    archiveContentFetches: 0,
    warcFetches: 0,
    waybackCdxUrlIndexRequestsOnly: true,
    queriedHostForms: ['apex', 'www'],
    cutoff: TO,
    vercelDeployments: 0,
    domains,
    totalCandidateRows: manifest.length,
    expectedHistoricalTotal: 2326,
    allQueriesComplete: domains.every((row) => row.queryComplete === true),
    allPerSourceCountsMatch: domains.every((row) => row.exactCountMatch === true),
    exactHistoricalCountMatch: manifest.length === 2326 && domains.every((row) => row.exactCountMatch === true),
    manifest: { file: 'manifest.jsonl', rows: manifest.length, sha256: sha256(manifestText) },
    certificationRule: 'Evidence only unless every CDX query is complete and all six per-source candidate counts exactly match frozen DATA4.9B. No archive content is fetched.',
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
