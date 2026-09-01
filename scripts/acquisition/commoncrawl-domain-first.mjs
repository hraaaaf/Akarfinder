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
  parseCdxJsonLines,
  parseRobotsSitemaps,
  realEstateSignals,
  selectLatestCrawl,
} from './commoncrawl-open-web-mesh.mjs';

export const DOMAIN_FIRST_FAMILY = { name: 'immo', pattern: '*.ma/*immo*' };
export const DOMAIN_FIRST_QUERY_LIMIT = 1000;
export const DOMAIN_FIRST_TOP_SEEDS = 10;
export const DOMAIN_FIRST_MAX_SITEMAPS = 2;
export const DOMAIN_FIRST_SEED_PROBES = 2;

const HOST_RE = /(?:^|[-.])(immo|immobilier|property|agence|habitat|maison|home|realestate)(?:[-.]|$)/i;
const URL_RE = /(?:immo|immobilier|annonce|bien|appart|villa|terrain|maison|riad|vente|location|louer|vendre|property|residence)/i;
const BODY_RE = /(?:immobilier|appartement|villa|terrain|maison|riad|à vendre|a vendre|à louer|a louer|property|real estate)/i;

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

function isPropertyCandidateUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return realEstateSignals(rawUrl).size > 0 || URL_RE.test(`${u.hostname}${u.pathname}${u.search}`);
  } catch {
    return false;
  }
}

export function rankSeedDomains(records, knownHosts = KNOWN_PORTAL_HOSTS) {
  const byHost = new Map();
  for (const record of records || []) {
    let u;
    try { u = new URL(record.url); } catch { continue; }
    const host = u.hostname.toLowerCase();
    if (!isMoroccanHost(host) || knownHosts.has(host)) continue;

    const urlSignals = realEstateSignals(record.url);
    const hostSignal = HOST_RE.test(host);
    if (!hostSignal && urlSignals.size === 0 && !URL_RE.test(`${u.pathname}${u.search}`)) continue;

    const current = byHost.get(host) || {
      host,
      urls: new Set(),
      families: new Set(),
      signals: new Set(),
      hostSignal,
    };
    current.urls.add(record.url);
    if (record.family) current.families.add(record.family);
    for (const signal of urlSignals) current.signals.add(signal);
    current.hostSignal ||= hostSignal;
    byHost.set(host, current);
  }

  return [...byHost.values()]
    .map((item) => ({
      host: item.host,
      urls: [...item.urls].sort(),
      urlCount: item.urls.size,
      familyCount: item.families.size,
      families: [...item.families].sort(),
      signalCount: item.signals.size,
      signals: [...item.signals].sort(),
      hostSignal: item.hostSignal,
      score: Math.min(item.urls.size, 100) + (item.signals.size * 3) + (item.hostSignal ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.urlCount - a.urlCount || a.host.localeCompare(b.host));
}

async function queryDomainSeeds({ crawl, fetchImpl, timeoutMs, userAgent, queryLimit }) {
  const endpoint = new URL(crawl['cdx-api']);
  endpoint.searchParams.set('url', DOMAIN_FIRST_FAMILY.pattern);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'url,status,mime');
  endpoint.searchParams.append('filter', 'status:200');
  endpoint.searchParams.append('filter', 'mime:text/html');
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(queryLimit));

  const response = await fetchText(endpoint.href, { fetchImpl, timeoutMs, userAgent });
  const request = requestRecord(endpoint.href, 'commoncrawl:domain-seeds', response, 'cdx');
  const records = request.classification === 'ok' ? parseCdxJsonLines(response.text, DOMAIN_FIRST_FAMILY.name) : [];
  if (request.classification === 'ok' && records.length === 0) request.classification = 'schema_drift:no_records';
  return { request, records };
}

export async function validateSeedDomain({
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
        candidateUrls: [...sitemapCandidates, ...probeCandidates].sort(),
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
      } else if (isPropertyCandidateUrl(normalized)) {
        sitemapCandidates.add(normalized);
      }
    }
  }

  for (const seedUrl of domain.urls.slice(0, seedProbes)) {
    const response = await fetchText(seedUrl, { fetchImpl, timeoutMs, userAgent });
    const request = requestRecord(seedUrl, 'domain:seed-probe', response, 'any');
    requests.push(request);
    if (request.classification === 'http_429') {
      return {
        validated: false,
        requests,
        candidateUrls: [...sitemapCandidates, ...probeCandidates].sort(),
        stoppedEarly: 'http_429',
        sitemapCandidateCount: sitemapCandidates.size,
        probeOkCount: probeCandidates.size,
      };
    }
    if (
      response.status >= 200 && response.status < 300 &&
      /text\/html/i.test(response.contentType || '') &&
      (isPropertyCandidateUrl(seedUrl) || BODY_RE.test(response.text || ''))
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

export async function discoverDomainFirst({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  queryLimit = DOMAIN_FIRST_QUERY_LIMIT,
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

  const seedQuery = await queryDomainSeeds({ crawl, fetchImpl, timeoutMs, userAgent, queryLimit });
  requests.push(seedQuery.request);
  if (seedQuery.request.classification === 'http_429') {
    return { crawl: crawl.id, seedDomains: [], validatedDomains: [], candidateUrls: [], validationEvidence: [], requests, stoppedEarly: 'http_429', zeroDbWrites: true };
  }
  if (seedQuery.request.classification !== 'ok') {
    return { crawl: crawl.id, seedDomains: [], validatedDomains: [], candidateUrls: [], validationEvidence: [], requests, stoppedEarly: seedQuery.request.classification, zeroDbWrites: true };
  }

  const seedDomains = rankSeedDomains(seedQuery.records, knownHosts);
  const selected = seedDomains.slice(0, topSeeds);
  const validatedDomains = [];
  const candidateUrls = new Set();
  const validationEvidence = [];
  let stoppedEarly = null;

  for (const domain of selected) {
    const validation = await validateSeedDomain({ domain, fetchImpl, timeoutMs, userAgent, maxSitemaps, seedProbes });
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
  const result = await discoverDomainFirst();
  const ccQueries = result.requests.filter((request) => request.role === 'commoncrawl:domain-seeds');
  const report = {
    startedAt: new Date().toISOString(),
    strategy: 'domain-first',
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
      hostSignal: domain.hostSignal,
      signals: domain.signals,
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
    '# L3 Common Crawl Open-Web Mesh — domain-first strategy',
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
