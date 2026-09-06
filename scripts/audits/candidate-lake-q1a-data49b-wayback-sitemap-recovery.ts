import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  allowedHost,
  conservativeUrlIdentity,
  decodeSitemapPayload,
  extractDeclaredSitemaps,
  parseSitemapXml,
} from '../data4/mass-source-onboarding-qualification';
import {
  classifyStructuralIdentity,
  DATA_4_9B_SOURCES,
} from '../data4/high-capacity-structural-detail-qualification';

const OUT = process.env.Q1A_DATA49B_WAYBACK_SITEMAP_OUT ?? '.tmp/candidate-lake-q1a-data49b-wayback-sitemap';
const CUTOFF = '20260810083248';
const OBSERVED_AT = '2026-08-10T08:32:48.268Z';
const MAX_ARCHIVE_SITEMAPS_PER_SOURCE = 40;
const MAX_URLS_PER_SOURCE = 100_000;

const EXPECTED_RAW: Record<string, number> = {
  'valfoncier.ma': 6195,
  'christiesrealestatemorocco.com': 1252,
  'immo-maroc.com': 1204,
  'agadirimmobilier.ma': 366,
  'proimmobilier.ma': 267,
  'capital-properties.ma': 844,
};
const EXPECTED_NET_NEW: Record<string, number> = {
  'valfoncier.ma': 6194,
  'christiesrealestatemorocco.com': 1252,
  'immo-maroc.com': 1204,
  'agadirimmobilier.ma': 366,
  'proimmobilier.ma': 267,
  'capital-properties.ma': 844,
};
const EXPECTED_CANDIDATES: Record<string, number> = {
  'valfoncier.ma': 709,
  'christiesrealestatemorocco.com': 602,
  'immo-maroc.com': 276,
  'agadirimmobilier.ma': 37,
  'proimmobilier.ma': 99,
  'capital-properties.ma': 603,
};

type Capture = { timestamp: string; original: string; digest: string | null; statuscode: string | null };
type SourceAttempt = {
  sourceDomain: string;
  robotsCandidate: string;
  robotsCapture: Capture | null;
  robotsArchiveUrl: string | null;
  roots: string[];
  visitedSitemaps: Array<{ url: string; capture: Capture | null; archiveUrl: string | null; kind?: string; locCount?: number; error?: string }>;
  rawUrls: string[];
  rawIdentityRows: number;
  candidateRowsBeforeHistoricalSeedExclusion: number;
  candidateDigestBeforeHistoricalSeedExclusion: string;
  expectedRawRows: number;
  expectedNetNewRows: number;
  expectedCandidateRows: number;
  rawCountMatches49a: boolean;
  candidateCountMatches49bBeforeSeedExclusion: boolean;
  complete: boolean;
  errors: string[];
};

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, binary = false): Promise<string | Uint8Array> {
  let last = '';
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B-archive-replay/1.0 archived-robots-sitemaps-only' },
        redirect: 'follow',
        signal: AbortSignal.timeout(90_000),
      });
      if (response.ok) {
        if (binary) return new Uint8Array(await response.arrayBuffer());
        return await response.text();
      }
      const body = (await response.text()).slice(0, 500);
      last = `HTTP ${response.status}: ${body}`;
      if (response.status !== 429 && response.status < 500) throw new Error(last);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      if (attempt === 8) throw new Error(last);
    }
    await sleep(Math.min(20_000, 1000 * 2 ** (attempt - 1)));
  }
  throw new Error(last || 'archive fetch failed');
}

async function latestCapture(rawUrl: string): Promise<Capture | null> {
  const cdx = new URL('https://web.archive.org/cdx/search/cdx');
  cdx.searchParams.set('url', rawUrl);
  cdx.searchParams.set('output', 'json');
  cdx.searchParams.set('fl', 'timestamp,original,digest,statuscode');
  cdx.searchParams.append('filter', 'statuscode:200');
  cdx.searchParams.set('to', CUTOFF);
  cdx.searchParams.set('filter', 'statuscode:200');
  cdx.searchParams.set('limit', '-20');
  const text = await fetchWithRetry(cdx.toString()) as string;
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || parsed.length < 2) return null;
  const rows = parsed as unknown[][];
  const header = rows[0].map(String);
  const idx = (name: string) => header.indexOf(name);
  const ti = idx('timestamp');
  const oi = idx('original');
  const di = idx('digest');
  const si = idx('statuscode');
  if (ti < 0 || oi < 0) throw new Error(`CDX columns missing for ${rawUrl}`);
  const captures = rows.slice(1)
    .map((r) => ({
      timestamp: String(r[ti] ?? ''),
      original: String(r[oi] ?? rawUrl),
      digest: di >= 0 ? String(r[di] ?? '') || null : null,
      statuscode: si >= 0 ? String(r[si] ?? '') || null : null,
    }))
    .filter((c) => /^\d{14}$/.test(c.timestamp) && c.timestamp <= CUTOFF)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return captures[0] ?? null;
}

function replayUrl(capture: Capture): string {
  return `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
}

async function readArchivedText(capture: Capture): Promise<string> {
  const bytes = await fetchWithRetry(replayUrl(capture), true) as Uint8Array;
  return decodeSitemapPayload(bytes);
}

async function attemptSource(sourceDomain: string, robotsCandidate: string): Promise<SourceAttempt> {
  const errors: string[] = [];
  const visitedSitemaps: SourceAttempt['visitedSitemaps'] = [];
  const rawUrls = new Set<string>();
  let robotsCapture: Capture | null = null;
  let roots: string[] = [];
  try {
    robotsCapture = await latestCapture(robotsCandidate);
    if (!robotsCapture) throw new Error('no_archived_robots_capture_before_cutoff');
    const robotsText = await readArchivedText(robotsCapture);
    roots = extractDeclaredSitemaps(sourceDomain, robotsText);
    if (roots.length === 0) throw new Error('archived_robots_declares_no_same_origin_https_sitemap');

    const queue = [...roots];
    const visited = new Set<string>();
    while (queue.length > 0) {
      if (visited.size >= MAX_ARCHIVE_SITEMAPS_PER_SOURCE) throw new Error('archived_sitemap_request_budget_exceeded');
      const sitemapUrl = queue.shift()!;
      if (visited.has(sitemapUrl)) continue;
      visited.add(sitemapUrl);
      if (!/^https:/.test(sitemapUrl) || !allowedHost(sourceDomain, new URL(sitemapUrl).hostname)) {
        throw new Error(`disallowed_archived_sitemap_url:${sitemapUrl}`);
      }
      const capture = await latestCapture(sitemapUrl);
      if (!capture) {
        visitedSitemaps.push({ url: sitemapUrl, capture: null, archiveUrl: null, error: 'no_capture_before_cutoff' });
        throw new Error(`missing_archived_sitemap:${sitemapUrl}`);
      }
      try {
        const xml = await readArchivedText(capture);
        const parsed = parseSitemapXml(sourceDomain, xml);
        if (parsed.kind === 'unknown') throw new Error('unknown_sitemap_payload');
        visitedSitemaps.push({ url: sitemapUrl, capture, archiveUrl: replayUrl(capture), kind: parsed.kind, locCount: parsed.locs.length });
        if (parsed.kind === 'index') {
          for (const child of parsed.locs) if (!visited.has(child) && !queue.includes(child)) queue.push(child);
        } else {
          for (const url of parsed.locs) {
            rawUrls.add(url);
            if (rawUrls.size >= MAX_URLS_PER_SOURCE) throw new Error('archived_url_budget_exceeded');
          }
        }
      } catch (error) {
        const last = visitedSitemaps[visitedSitemaps.length - 1];
        if (last?.url === sitemapUrl && !last.error) last.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const buckets = new Map<string, string[]>();
  for (const rawUrl of [...rawUrls].sort()) {
    const identity = conservativeUrlIdentity(sourceDomain, rawUrl);
    if (!identity) continue;
    const rows = buckets.get(identity) ?? [];
    rows.push(rawUrl);
    buckets.set(identity, rows);
  }
  const classified = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([identity, urls]) => classifyStructuralIdentity(sourceDomain, identity, [...new Set(urls)].sort()));
  const candidates = classified.filter((row) => row.classification === 'DETAIL_PATTERN_MATCH');
  const candidateLines = candidates.map((row) => `${row.identity}\t${row.canonicalUrls[0] ?? ''}`);

  return {
    sourceDomain,
    robotsCandidate,
    robotsCapture,
    robotsArchiveUrl: robotsCapture ? replayUrl(robotsCapture) : null,
    roots,
    visitedSitemaps,
    rawUrls: [...rawUrls].sort(),
    rawIdentityRows: buckets.size,
    candidateRowsBeforeHistoricalSeedExclusion: candidates.length,
    candidateDigestBeforeHistoricalSeedExclusion: sha256(candidateLines.join('\n')),
    expectedRawRows: EXPECTED_RAW[sourceDomain],
    expectedNetNewRows: EXPECTED_NET_NEW[sourceDomain],
    expectedCandidateRows: EXPECTED_CANDIDATES[sourceDomain],
    rawCountMatches49a: buckets.size === EXPECTED_RAW[sourceDomain],
    candidateCountMatches49bBeforeSeedExclusion: candidates.length === EXPECTED_CANDIDATES[sourceDomain],
    complete: errors.length === 0,
    errors,
  };
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const sourceResults: Array<Record<string, unknown>> = [];
  const provisionalManifest: Array<{ source_domain: string; identity: string; canonical_url: string; archive_provenance: string }> = [];

  for (const sourceDomain of DATA_4_9B_SOURCES) {
    const attempts: SourceAttempt[] = [];
    for (const robotsCandidate of [`https://${sourceDomain}/robots.txt`, `https://www.${sourceDomain}/robots.txt`]) {
      attempts.push(await attemptSource(sourceDomain, robotsCandidate));
    }
    const exactRaw = attempts.filter((a) => a.complete && a.rawCountMatches49a);
    const exactBoth = exactRaw.filter((a) => a.candidateCountMatches49bBeforeSeedExclusion);
    const selected = exactBoth.length === 1 ? exactBoth[0] : exactRaw.length === 1 ? exactRaw[0] : null;

    if (selected) {
      const buckets = new Map<string, string[]>();
      for (const rawUrl of selected.rawUrls) {
        const identity = conservativeUrlIdentity(sourceDomain, rawUrl);
        if (!identity) continue;
        const rows = buckets.get(identity) ?? [];
        rows.push(rawUrl);
        buckets.set(identity, rows);
      }
      const candidates = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([identity, urls]) => classifyStructuralIdentity(sourceDomain, identity, [...new Set(urls)].sort()))
        .filter((row) => row.classification === 'DETAIL_PATTERN_MATCH');
      for (const row of candidates) provisionalManifest.push({
        source_domain: sourceDomain,
        identity: row.identity,
        canonical_url: row.canonicalUrls[0] ?? '',
        archive_provenance: selected.robotsArchiveUrl ?? '',
      });
    }

    sourceResults.push({
      sourceDomain,
      attempts: attempts.map((a) => ({
        robotsCandidate: a.robotsCandidate,
        robotsCapture: a.robotsCapture,
        robotsArchiveUrl: a.robotsArchiveUrl,
        roots: a.roots,
        visitedSitemaps: a.visitedSitemaps,
        rawIdentityRows: a.rawIdentityRows,
        candidateRowsBeforeHistoricalSeedExclusion: a.candidateRowsBeforeHistoricalSeedExclusion,
        candidateDigestBeforeHistoricalSeedExclusion: a.candidateDigestBeforeHistoricalSeedExclusion,
        expectedRawRows: a.expectedRawRows,
        expectedNetNewRows: a.expectedNetNewRows,
        expectedCandidateRows: a.expectedCandidateRows,
        rawCountMatches49a: a.rawCountMatches49a,
        candidateCountMatches49bBeforeSeedExclusion: a.candidateCountMatches49bBeforeSeedExclusion,
        complete: a.complete,
        errors: a.errors,
      })),
      exactRawAttemptCount: exactRaw.length,
      exactRawAndCandidateAttemptCount: exactBoth.length,
      selectedRobotsCandidate: selected?.robotsCandidate ?? null,
      selectedRawIdentityRows: selected?.rawIdentityRows ?? null,
      selectedCandidateRowsBeforeHistoricalSeedExclusion: selected?.candidateRowsBeforeHistoricalSeedExclusion ?? null,
    });
  }

  provisionalManifest.sort((a, b) => a.source_domain.localeCompare(b.source_domain) || a.identity.localeCompare(b.identity));
  const manifestText = provisionalManifest.map((row) => JSON.stringify(row)).join('\n') + (provisionalManifest.length ? '\n' : '');
  await fs.writeFile(path.join(OUT, 'provisional-candidate-manifest.jsonl'), manifestText, 'utf8');
  await fs.writeFile(path.join(OUT, 'sources.json'), `${JSON.stringify(sourceResults, null, 2)}\n`, 'utf8');

  const selectedAll = sourceResults.every((row) => typeof row.selectedRobotsCandidate === 'string');
  const rawAllExact = sourceResults.every((row) => row.selectedRawIdentityRows === EXPECTED_RAW[String(row.sourceDomain)]);
  const beforeSeedCandidateAllExact = sourceResults.every((row) => row.selectedCandidateRowsBeforeHistoricalSeedExclusion === EXPECTED_CANDIDATES[String(row.sourceDomain)]);
  const summary = {
    schemaVersion: 'Q1A_DATA49B_WAYBACK_ARCHIVED_SITEMAP_REPLAY_V1',
    historicalRun: 31370449455,
    historicalArtifact: 9055869351,
    historicalArtifactSha256: 'df4f38102877a5de29a7980dbb7e5b32a4110813d8af132fc48a46cf87126520',
    historicalObservedAt: OBSERVED_AT,
    cutoff: CUTOFF,
    readOnly: true,
    databaseWrites: 0,
    productionWrites: 0,
    sourceSiteFetches: 0,
    sourceContentFetches: 0,
    detailPageFetches: 0,
    archiveContentFetchesOnly: true,
    archiveRobotsAndSitemapsOnly: true,
    warcFetches: 0,
    vercelDeployments: 0,
    expectedRawCounts49a: EXPECTED_RAW,
    expectedNetNewCounts49b: EXPECTED_NET_NEW,
    expectedCandidateCounts49b: EXPECTED_CANDIDATES,
    sourceResults,
    selectedAll,
    rawAllExact,
    beforeSeedCandidateAllExact,
    provisionalCandidateRows: provisionalManifest.length,
    provisionalManifestSha256: sha256(manifestText),
    certificationState: selectedAll && rawAllExact && beforeSeedCandidateAllExact ? 'RAW_SNAPSHOT_MATCH_PENDING_HISTORICAL_SEED_EXCLUSION_PROOF' : 'EVIDENCE_ONLY_NOT_CERTIFIED',
    certificationRule: 'Never certify from counts alone. First require a unique archived robots/sitemap replay per source matching DATA4.9A raw identity counts and DATA4.9B structural candidate counts. Then separately reproduce the historical source_offer_seeds exact anti-overlap, especially ValFoncier 6195 raw -> 6194 net-new.',
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    certificationState: summary.certificationState,
    provisionalCandidateRows: summary.provisionalCandidateRows,
    sources: sourceResults.map((row) => ({
      sourceDomain: row.sourceDomain,
      selectedRobotsCandidate: row.selectedRobotsCandidate,
      selectedRawIdentityRows: row.selectedRawIdentityRows,
      selectedCandidateRowsBeforeHistoricalSeedExclusion: row.selectedCandidateRowsBeforeHistoricalSeedExclusion,
      exactRawAttemptCount: row.exactRawAttemptCount,
      exactRawAndCandidateAttemptCount: row.exactRawAndCandidateAttemptCount,
    })),
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
