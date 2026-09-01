import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  COLLECTIONS_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_UA,
  KNOWN_PORTAL_HOSTS,
  classifyFetchOutcome,
  extractXmlLocs,
  isMoroccanHost,
  normalizeHttpsUrl,
  parseRobotsSitemaps,
  selectLatestCrawl,
} from './commoncrawl-open-web-mesh.mjs';
import {
  DOMAIN_FIRST_MAX_SITEMAPS,
  DOMAIN_FIRST_SEED_PROBES,
  DOMAIN_FIRST_TOP_SEEDS,
} from './commoncrawl-domain-first.mjs';

export const LIVE_SEED_PATTERN = '*.ma/*immo*';
export const LIVE_SEED_LIMIT = 1000;

const STRICT_HOST_RE = /(?:immo|immobilier|property|realestate)/i;
const STRICT_PROPERTY_TOKENS = new Set([
  'immo',
  'immobilier',
  'immobiliere',
  'immobiliers',
  'immobilieres',
  'appartement',
  'appartements',
  'appart',
  'studio',
  'studios',
  'villa',
  'villas',
  'terrain',
  'terrains',
  'maison',
  'maisons',
  'riad',
  'riads',
  'residence',
  'residences',
  'property',
  'properties',
  'realestate',
]);

function normalizedTokens(value) {
  let decoded = String(value || '');
  try { decoded = decodeURIComponent(decoded); } catch {}
  return decoded
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function isStrictPropertyUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (STRICT_HOST_RE.test(host)) return true;
    const tokens = normalizedTokens(`${u.pathname} ${u.search}`);
    return tokens.some((token) => STRICT_PROPERTY_TOKENS.has(token));
  } catch {
    return false;
  }
}

async function fetchText(url, { fetchImpl, timeoutMs, userAgent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'application/json,text/plain,text/html,application/xml,text/xml;q=0.9,*/*;q=0.5',
        'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5',
      },
    });
    return {
      status: res.status,
      finalUrl: res.url || url,
      contentType: res.headers?.get?.('content-type') || '',
      text: await res.text(),
    };
  } catch (error) {
    return {
      status: 0,
      finalUrl: url,
      contentType: '',
      text: '',
      error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function requestRecord(url, role, response, expected = 'any') {
  return {
    url,
    role,
    status: response.status,
    finalUrl: response.finalUrl,
    contentType: response.contentType,
    bytes: Buffer.byteLength(response.text || ''),
    classification: classifyFetchOutcome({ ...response, expected }),
    ...(response.error ? { error: response.error } : {}),
  };
}

export function parsePublicSeedCdxJsonLines(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const record = JSON.parse(trimmed);
      if (!record?.url) continue;
      const u = new URL(record.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      u.hash = '';
      out.push({
        url: u.href,
        family: 'immo',
        status: String(record.status || ''),
        mime: String(record.mime || ''),
      });
    } catch {
      // Ignore malformed index rows; request-level schema checks are separate.
    }
  }
  return out;
}

export function rankLiveSeedDomains(records, knownHosts = KNOWN_PORTAL_HOSTS) {
  const byHost = new Map();
  for (const record of records || []) {
    let u;
    try { u = new URL(record.url); } catch { continue; }
    const host = u.hostname.toLowerCase();
    if (!isMoroccanHost(host) || knownHosts.has(host)) continue;
    if (!isStrictPropertyUrl(record.url)) continue;

    const current = byHost.get(host) || { host, urls: new Set() };
    current.urls.add(record.url);
    byHost.set(host, current);
  }

  return [...byHost.values()]
    .map((item) => ({
      host: item.host,
      urls: [...item.urls].sort(),
      urlCount: item.urls.size,
      score: Math.min(item.urls.size, 100) + (STRICT_HOST_RE.test(item.host) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.urlCount - a.urlCount || a.host.localeCompare(b.host));
}

async function queryLiveSeeds({ crawl, fetchImpl, timeoutMs, userAgent, queryLimit }) {
  const endpoint = new URL(crawl['cdx-api']);
  endpoint.searchParams.set('url', LIVE_SEED_PATTERN);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'url,status,mime');
  endpoint.searchParams.append('filter', 'status:200');
  endpoint.searchParams.append('filter', 'mime:text/html');
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(queryLimit));

  const response = await fetchText(endpoint.href, { fetchImpl, timeoutMs, userAgent });
  const request = requestRecord(endpoint.href, 'commoncrawl:live-domain-seeds', response, 'cdx');
  const records = request.classification === 'ok' ? parsePublicSeedCdxJsonLines(response.text) : [];
  if (request.classification === 'ok' && records.length === 0) request.classification = 'schema_drift:no_records';
  return { request, records };
}

export async function validateStrictSeedDomain({
  domain,
  fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  maxSitemaps = DOMAIN_FIRST_MAX_SITEMAPS,
  seedProbes = DOMAIN_FIRST_SEED_PROBES,
}) {
  const requests = [];
  const sitemapCandidates = new Set();
  const probeCandidates = new Set();
  const sitemapQueue = [];
  const seenSitemaps = new Set();

  const robotsUrl = `https://${domain.host}/robots.txt`;
  const robots = await fetchText(robotsUrl, { fetchImpl, timeoutMs, userAgent });
  const robotsRequest = requestRecord(robotsUrl, 'domain:robots', robots, 'any');
  requests.push(robotsRequest);
  if (robotsRequest.classification === 'http_429') {
    return { validated: false, requests, candidateUrls: [], stoppedEarly: 'http_429', sitemapCandidateCount: 0, probeOkCount: 0 };
  }
  if (robots.status >= 200 && robots.status < 300) {
    for (const sitemap of parseRobotsSitemaps(robots.text, domain.host)) sitemapQueue.push(sitemap);
  }
  sitemapQueue.push(`https://${domain.host}/sitemap.xml`, `https://${domain.host}/sitemap_index.xml`);

  while (sitemapQueue.length && seenSitemaps.size < maxSitemaps) {
    const sitemapUrl = sitemapQueue.shift();
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);
    const response = await fetchText(sitemapUrl, { fetchImpl, timeoutMs, userAgent });
    const request = requestRecord(sitemapUrl, 'domain:sitemap', response, 'xml');
    requests.push(request);
    if (request.classification === 'http_429') {
      return {
        validated: false,
        requests,
        candidateUrls: [],
        stoppedEarly: 'http_429',
        sitemapCandidateCount: sitemapCandidates.size,
        probeOkCount: probeCandidates.size,
      };
    }
    if (request.classification !== 'ok') continue;

    for (const raw of extractXmlLocs(response.text)) {
      const normalized = normalizeHttpsUrl(raw, sitemapUrl);
      if (!normalized) continue;
      let u;
      try { u = new URL(normalized); } catch { continue; }
      if (u.hostname.toLowerCase() !== domain.host) continue;
      if (/\.xml(?:$|\?)/i.test(u.pathname + u.search) && seenSitemaps.size + sitemapQueue.length < maxSitemaps) {
        sitemapQueue.push(normalized);
      } else if (isStrictPropertyUrl(normalized)) {
        sitemapCandidates.add(normalized);
      }
    }
  }

  for (const seedUrl of domain.urls.slice(0, seedProbes)) {
    if (!isStrictPropertyUrl(seedUrl)) continue;
    const response = await fetchText(seedUrl, { fetchImpl, timeoutMs, userAgent });
    const request = requestRecord(seedUrl, 'domain:seed-probe', response, 'any');
    requests.push(request);
    if (request.classification === 'http_429') {
      return {
        validated: false,
        requests,
        candidateUrls: [],
        stoppedEarly: 'http_429',
        sitemapCandidateCount: sitemapCandidates.size,
        probeOkCount: probeCandidates.size,
      };
    }
    if (
      response.status >= 200 && response.status < 300 &&
      /text\/html/i.test(response.contentType || '')
    ) {
      probeCandidates.add(seedUrl);
    }
  }

  const sitemapCandidateCount = sitemapCandidates.size;
  const probeOkCount = probeCandidates.size;
  const validated = (
    sitemapCandidateCount >= 3 ||
    probeOkCount >= 2 ||
    (sitemapCandidateCount >= 1 && probeOkCount >= 1)
  );

  return {
    validated,
    requests,
    candidateUrls: validated ? [...new Set([...sitemapCandidates, ...probeCandidates])].sort() : [],
    stoppedEarly: null,
    sitemapCandidateCount,
    probeOkCount,
  };
}

export async function discoverLiveDomainFirst({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  queryLimit = LIVE_SEED_LIMIT,
  topSeeds = DOMAIN_FIRST_TOP_SEEDS,
  maxSitemaps = DOMAIN_FIRST_MAX_SITEMAPS,
  seedProbes = DOMAIN_FIRST_SEED_PROBES,
  knownHosts = KNOWN_PORTAL_HOSTS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const requests = [];
  const collectionsResponse = await fetchText(COLLECTIONS_URL, { fetchImpl, timeoutMs, userAgent });
  const collectionsRequest = requestRecord(COLLECTIONS_URL, 'commoncrawl:collections', collectionsResponse, 'json');
  requests.push(collectionsRequest);
  if (collectionsRequest.classification !== 'ok') {
    return { crawl: null, seedDomains: [], validatedDomains: [], candidateUrls: [], validationEvidence: [], requests, stoppedEarly: collectionsRequest.classification, zeroDbWrites: true };
  }

  let collections;
  try { collections = JSON.parse(collectionsResponse.text); } catch { collections = null; }
  const crawl = selectLatestCrawl(collections);
  if (!crawl) {
    return { crawl: null, seedDomains: [], validatedDomains: [], candidateUrls: [], validationEvidence: [], requests, stoppedEarly: 'schema_drift:no_crawl', zeroDbWrites: true };
  }

  const seedQuery = await queryLiveSeeds({ crawl, fetchImpl, timeoutMs, userAgent, queryLimit });
  requests.push(seedQuery.request);
  if (seedQuery.request.classification !== 'ok') {
    return {
      crawl: crawl.id,
      seedDomains: [],
      validatedDomains: [],
      candidateUrls: [],
      validationEvidence: [],
      requests,
      stoppedEarly: seedQuery.request.classification,
      zeroDbWrites: true,
    };
  }

  const seedDomains = rankLiveSeedDomains(seedQuery.records, knownHosts);
  const validatedDomains = [];
  const candidateUrls = new Set();
  const validationEvidence = [];
  let stoppedEarly = null;

  for (const domain of seedDomains.slice(0, topSeeds)) {
    const validation = await validateStrictSeedDomain({ domain, fetchImpl, timeoutMs, userAgent, maxSitemaps, seedProbes });
    requests.push(...validation.requests);
    validationEvidence.push({
      host: domain.host,
      seedUrlCount: domain.urlCount,
      sitemapCandidateCount: validation.sitemapCandidateCount,
      probeOkCount: validation.probeOkCount,
      validated: validation.validated,
      stoppedEarly: validation.stoppedEarly,
    });
    if (validation.validated) {
      validatedDomains.push(domain);
      for (const url of validation.candidateUrls) candidateUrls.add(url);
    }
    if (validation.stoppedEarly === 'http_429') {
      stoppedEarly = `http_429:${domain.host}`;
      break;
    }
  }

  return {
    crawl: crawl.id,
    seedDomains,
    validatedDomains,
    candidateUrls: [...candidateUrls].sort(),
    validationEvidence,
    requests,
    stoppedEarly,
    zeroDbWrites: true,
  };
}

export async function runCli() {
  const result = await discoverLiveDomainFirst();
  const ccQueries = result.requests.filter((request) => request.role === 'commoncrawl:live-domain-seeds');
  const report = {
    startedAt: new Date().toISOString(),
    strategy: 'domain-first-http-aware-strict',
    crawl: result.crawl,
    zeroDbWrites: result.zeroDbWrites,
    stoppedEarly: result.stoppedEarly,
    successfulQueryCount: ccQueries.filter((request) => request.classification === 'ok').length,
    queryCount: ccQueries.length,
    seedDomainCount: result.seedDomains.length,
    validatedDomainCount: result.validatedDomains.length,
    candidateUrlCount: result.candidateUrls.length,
    topSeedDomains: result.seedDomains.slice(0, DOMAIN_FIRST_TOP_SEEDS).map((domain) => ({
      host: domain.host,
      score: domain.score,
      urlCount: domain.urlCount,
    })),
    validatedDomains: result.validatedDomains.map((domain) => domain.host),
    validationEvidence: result.validationEvidence,
    requests: result.requests,
    sample: result.candidateUrls.slice(0, 100),
  };

  report.success = Boolean(
    report.crawl &&
    report.zeroDbWrites &&
    !String(report.stoppedEarly || '').startsWith('http_429') &&
    report.successfulQueryCount === 1 &&
    report.validatedDomainCount >= 3 &&
    report.candidateUrlCount >= 20
  );

  const outDir = 'artifacts/morocco-web-l3-commoncrawl';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# L3 Common Crawl Open-Web Mesh — domain-first HTTP-aware strict strategy',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Crawl: **${report.crawl || 'none'}**`,
    `- Common Crawl seed query: **${report.successfulQueryCount}/${report.queryCount} ok**`,
    `- Seed .ma domains: **${report.seedDomainCount}**`,
    `- Live-validated net-new domains: **${report.validatedDomainCount}**`,
    `- Candidate URLs: **${report.candidateUrlCount}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    '## Validated domains',
    ...report.validatedDomains.map((host) => `- ${host}`),
    '',
    '## Validation evidence',
    ...report.validationEvidence.map((item) => `- ${item.host} — validated=${item.validated} — sitemap=${item.sitemapCandidateCount} — probes=${item.probeOkCount}`),
  ].join('\n'));

  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
