import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { conservativeUrlIdentity } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity, DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

const OUT = process.env.Q1A_DATA49B_CC_OUT ?? '.tmp/candidate-lake-q1a-data49b-cc';
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
const MODES = [
  { name: 'august_to_historical_cutoff', indexes: [{ name: 'CC-MAIN-2026-34', to: TO }] },
  { name: 'july_plus_august_to_cutoff', indexes: [{ name: 'CC-MAIN-2026-30' }, { name: 'CC-MAIN-2026-34', to: TO }] },
] as const;

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestText(url: URL): Promise<string> {
  let lastStatus = 0;
  let lastBody = '';
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B-recovery/1.0 metadata-only' },
        signal: AbortSignal.timeout(60_000),
      });
      const body = await response.text();
      if (response.ok) return body;
      if (response.status === 404 && body.includes('No Captures found')) return '';
      lastStatus = response.status;
      lastBody = body;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw new Error(`Common Crawl ${response.status}: ${body.slice(0, 500)}`);
    } catch (error) {
      if (attempt === 8) throw error;
      if (error instanceof Error && error.message.startsWith('Common Crawl ') && !/Common Crawl (429|5\d\d):/.test(error.message)) throw error;
    }
    if (attempt < 8) await sleep(Math.min(15_000, 1000 * 2 ** (attempt - 1)));
  }
  throw new Error(`Common Crawl ${lastStatus || 'network'}: ${lastBody.slice(0, 500)}`);
}

async function queryPattern(index: string, pattern: string, to?: string): Promise<string[]> {
  const base = `https://index.commoncrawl.org/${index}-index`;
  const common = new URLSearchParams({
    url: pattern,
    output: 'json',
    fl: 'url',
    filter: 'status:200',
    collapse: 'urlkey',
  });
  if (to) common.set('to', to);

  const pagesUrl = new URL(base);
  for (const [key, value] of common) pagesUrl.searchParams.set(key, value);
  pagesUrl.searchParams.set('showNumPages', 'true');
  const pageText = await requestText(pagesUrl);
  if (!pageText.trim()) return [];

  let pages = 1;
  try {
    const parsed = JSON.parse(pageText);
    pages = Math.max(1, Number(parsed.pages ?? parsed.numPages ?? 1));
  } catch {
    pages = 1;
  }

  const urls = new Set<string>();
  for (let page = 0; page < pages; page += 1) {
    const query = new URL(base);
    for (const [key, value] of common) query.searchParams.set(key, value);
    if (pages > 1) query.searchParams.set('page', String(page));
    const text = await requestText(query);
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const row = JSON.parse(trimmed) as { url?: string };
        if (row.url) urls.add(row.url);
      } catch {
        // Malformed index rows cannot become candidate identities.
      }
    }
  }
  return [...urls];
}

async function queryIndex(index: string, domain: string, to?: string): Promise<{ urls: string[]; errors: string[] }> {
  const urls = new Set<string>();
  const errors: string[] = [];
  for (const pattern of [`${domain}/*`, `www.${domain}/*`]) {
    try {
      const found = await queryPattern(index, pattern, to);
      for (const url of found) urls.add(url);
    } catch (error) {
      errors.push(`${index} ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { urls: [...urls], errors };
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const summaryModes: Array<Record<string, unknown>> = [];

  for (const mode of MODES) {
    const modeManifest: Array<{ source_domain: string; identity: string; canonical_url: string }> = [];
    const domains: Array<Record<string, unknown>> = [];

    for (const sourceDomain of DATA_4_9B_SOURCES) {
      const raw = new Set<string>();
      const indexCounts: Record<string, number> = {};
      const queryErrors: string[] = [];
      for (const index of mode.indexes) {
        const result = await queryIndex(index.name, sourceDomain, 'to' in index ? index.to : undefined);
        indexCounts[index.name] = result.urls.length;
        queryErrors.push(...result.errors);
        for (const url of result.urls) raw.add(url);
      }

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
        modeManifest.push({
          source_domain: sourceDomain,
          identity: row.identity,
          canonical_url: row.canonicalUrls[0] ?? '',
        });
      }
      const candidateLines = candidates.map((row) => `${row.identity}\t${row.canonicalUrls[0] ?? ''}`);
      domains.push({
        sourceDomain,
        indexCounts,
        queryErrors,
        queryComplete: queryErrors.length === 0,
        distinctRawUrls: raw.size,
        distinctConservativeIdentities: buckets.size,
        candidateRows: candidates.length,
        expectedHistoricalCandidateRows: EXPECTED[sourceDomain],
        exactCountMatch: queryErrors.length === 0 && candidates.length === EXPECTED[sourceDomain],
        candidateDigestSha256: sha256(candidateLines.join('\n')),
      });
    }

    modeManifest.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.identity.localeCompare(b.identity));
    const manifestText = modeManifest.map((row) => JSON.stringify(row)).join('\n') + (modeManifest.length ? '\n' : '');
    const file = `${mode.name}.jsonl`;
    await fs.writeFile(path.join(OUT, file), manifestText, 'utf8');
    summaryModes.push({
      mode: mode.name,
      indexes: mode.indexes,
      domains,
      totalCandidateRows: modeManifest.length,
      expectedHistoricalTotal: 2326,
      allQueriesComplete: domains.every((row) => row.queryComplete === true),
      allPerSourceCountsMatch: domains.every((row) => row.exactCountMatch === true),
      manifest: { file, rows: modeManifest.length, sha256: sha256(manifestText) },
    });
  }

  const summary = {
    schemaVersion: 'Q1A_DATA49B_COMMONCRAWL_URL_INDEX_RECOVERY_V3',
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
    warcFetches: 0,
    commonCrawlUrlIndexRequestsOnly: true,
    queriedHostForms: ['apex', 'www'],
    vercelDeployments: 0,
    certificationRule: 'A reconstruction is evidence only when every query is complete and every source count matches historical 4.9B; outages are recorded, never coerced to zero.',
    modes: summaryModes,
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
