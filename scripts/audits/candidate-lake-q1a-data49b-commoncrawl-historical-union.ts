import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { conservativeUrlIdentity } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity, DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

const OUT = process.env.Q1A_DATA49B_CC_HIST_OUT ?? '.tmp/candidate-lake-q1a-data49b-cc-historical';
const EXPECTED: Record<string, number> = {
  'valfoncier.ma': 709,
  'christiesrealestatemorocco.com': 602,
  'immo-maroc.com': 276,
  'agadirimmobilier.ma': 37,
  'proimmobilier.ma': 99,
  'capital-properties.ma': 603,
};

// Verified against Common Crawl collinfo.json on 2026-09-07. Newest -> oldest.
const INDEXES = [
  'CC-MAIN-2026-34','CC-MAIN-2026-30','CC-MAIN-2026-25','CC-MAIN-2026-21',
  'CC-MAIN-2026-17','CC-MAIN-2026-12','CC-MAIN-2026-08','CC-MAIN-2026-04',
  'CC-MAIN-2025-51','CC-MAIN-2025-47','CC-MAIN-2025-43','CC-MAIN-2025-38',
  'CC-MAIN-2025-33','CC-MAIN-2025-30','CC-MAIN-2025-26','CC-MAIN-2025-21',
  'CC-MAIN-2025-18','CC-MAIN-2025-13','CC-MAIN-2025-08','CC-MAIN-2025-05',
] as const;

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestText(url: URL): Promise<string> {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B-historical-union/1.0 metadata-only' },
        signal: AbortSignal.timeout(45_000),
      });
      const body = await response.text();
      if (response.ok) return body;
      if (response.status === 404 && body.includes('No Captures found')) return '';
      last = `HTTP ${response.status}: ${body.slice(0, 300)}`;
      if (response.status !== 429 && response.status < 500) throw new Error(last);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      if (attempt === 5) throw error;
    }
    await sleep(Math.min(10_000, 750 * 2 ** (attempt - 1)));
  }
  throw new Error(last || 'Common Crawl request failed');
}

async function queryDomain(index: string, domain: string): Promise<string[]> {
  const base = `https://index.commoncrawl.org/${index}-index`;
  const common = new URLSearchParams({
    url: domain,
    matchType: 'domain',
    output: 'json',
    fl: 'url',
    filter: 'status:200',
    collapse: 'urlkey',
  });
  const pagesUrl = new URL(base);
  for (const [k, v] of common) pagesUrl.searchParams.set(k, v);
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
    for (const [k, v] of common) query.searchParams.set(k, v);
    if (pages > 1) query.searchParams.set('page', String(page));
    const text = await requestText(query);
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        const row = JSON.parse(t) as { url?: string };
        if (row.url) urls.add(row.url);
      } catch {
        // malformed index rows are unusable evidence
      }
    }
  }
  return [...urls];
}

function classify(domain: typeof DATA_4_9B_SOURCES[number], raw: Set<string>) {
  const buckets = new Map<string, string[]>();
  for (const url of raw) {
    const identity = conservativeUrlIdentity(domain, url);
    if (!identity) continue;
    const rows = buckets.get(identity) ?? [];
    rows.push(url);
    buckets.set(identity, rows);
  }
  const candidates = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([identity, urls]) => classifyStructuralIdentity(domain, identity, [...new Set(urls)].sort()))
    .filter((row) => row.classification === 'DETAIL_PATTERN_MATCH');
  return { buckets, candidates };
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const allManifest: Array<{ source_domain: string; identity: string; canonical_url: string }> = [];
  const domains: Array<Record<string, unknown>> = [];

  for (const domain of DATA_4_9B_SOURCES) {
    const raw = new Set<string>();
    const errors: string[] = [];
    const progression: Array<Record<string, unknown>> = [];
    let firstExactAt: string | null = null;

    for (const index of INDEXES) {
      let found: string[] = [];
      let queryComplete = true;
      try {
        found = await queryDomain(index, domain);
        for (const url of found) raw.add(url);
      } catch (error) {
        queryComplete = false;
        errors.push(`${index}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const { candidates } = classify(domain, raw);
      if (firstExactAt === null && candidates.length === EXPECTED[domain]) firstExactAt = index;
      progression.push({
        index,
        indexRawUrls: found.length,
        queryComplete,
        cumulativeRawUrls: raw.size,
        cumulativeCandidateRows: candidates.length,
        expectedCandidateRows: EXPECTED[domain],
        deltaToExpected: candidates.length - EXPECTED[domain],
      });
    }

    const { buckets, candidates } = classify(domain, raw);
    const candidateLines = candidates.map((row) => `${row.identity}\t${row.canonicalUrls[0] ?? ''}`);
    for (const row of candidates) {
      allManifest.push({ source_domain: domain, identity: row.identity, canonical_url: row.canonicalUrls[0] ?? '' });
    }
    const domainManifest = candidates.map((row) => JSON.stringify({ source_domain: domain, identity: row.identity, canonical_url: row.canonicalUrls[0] ?? '' })).join('\n') + (candidates.length ? '\n' : '');
    await fs.writeFile(path.join(OUT, `${domain.replaceAll('.', '_')}.jsonl`), domainManifest, 'utf8');

    domains.push({
      sourceDomain: domain,
      expectedHistoricalCandidateRows: EXPECTED[domain],
      distinctRawUrls: raw.size,
      distinctConservativeIdentities: buckets.size,
      candidateRows: candidates.length,
      deltaToExpected: candidates.length - EXPECTED[domain],
      firstExactAt,
      everReachedOrExceededExpected: progression.some((p) => Number(p.cumulativeCandidateRows) >= EXPECTED[domain]),
      queryComplete: errors.length === 0,
      errors,
      candidateDigestSha256: sha256(candidateLines.join('\n')),
      progression,
    });
  }

  allManifest.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.identity.localeCompare(b.identity));
  const manifestText = allManifest.map((row) => JSON.stringify(row)).join('\n') + (allManifest.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'manifest.jsonl'), manifestText, 'utf8');

  const summary = {
    schemaVersion: 'Q1A_DATA49B_COMMONCRAWL_HISTORICAL_UNION_V1',
    historicalRun: 31370449455,
    historicalArtifact: 9055869351,
    historicalArtifactSha256: 'df4f38102877a5de29a7980dbb7e5b32a4110813d8af132fc48a46cf87126520',
    historicalObservedAt: '2026-08-10T08:32:48.268Z',
    expectedHistoricalCounts: EXPECTED,
    indexes: INDEXES,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceSiteFetches: 0,
    sourceContentFetches: 0,
    warcFetches: 0,
    commonCrawlUrlIndexRequestsOnly: true,
    vercelDeployments: 0,
    certificationState: 'EVIDENCE_ONLY_UNLESS_EXACT_IDENTITY_ORACLE_IS_RECOVERED',
    totalCandidateRows: allManifest.length,
    expectedHistoricalTotal: 2326,
    allQueriesComplete: domains.every((d) => d.queryComplete === true),
    allFinalCountsMatch: domains.every((d) => d.candidateRows === d.expectedHistoricalCandidateRows),
    allDomainsHitExactAtSomeHorizon: domains.every((d) => typeof d.firstExactAt === 'string'),
    manifestSha256: sha256(manifestText),
    domains,
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    totalCandidateRows: summary.totalCandidateRows,
    expectedHistoricalTotal: summary.expectedHistoricalTotal,
    allQueriesComplete: summary.allQueriesComplete,
    allFinalCountsMatch: summary.allFinalCountsMatch,
    allDomainsHitExactAtSomeHorizon: summary.allDomainsHitExactAtSomeHorizon,
    manifestSha256: summary.manifestSha256,
    domains: domains.map((d) => ({ sourceDomain: d.sourceDomain, candidateRows: d.candidateRows, expected: d.expectedHistoricalCandidateRows, delta: d.deltaToExpected, firstExactAt: d.firstExactAt, queryComplete: d.queryComplete })),
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
