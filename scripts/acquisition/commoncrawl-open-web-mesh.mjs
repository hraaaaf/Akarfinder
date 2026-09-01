import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const COLLECTIONS_URL = 'https://index.commoncrawl.org/collinfo.json';
export const DEFAULT_TIMEOUT_MS = 20_000;
export const DEFAULT_QUERY_LIMIT = 500;
export const DEFAULT_TOP_DOMAINS = 12;
export const DEFAULT_MAX_SITEMAPS_PER_DOMAIN = 3;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';

export const REAL_ESTATE_QUERY_FAMILIES = [
  { name: 'immobilier', pattern: '*.ma/*immobilier*' },
  { name: 'annonce', pattern: '*.ma/*annonce*' },
  { name: 'appartement', pattern: '*.ma/*appartement*' },
  { name: 'villa', pattern: '*.ma/*villa*' },
  { name: 'terrain', pattern: '*.ma/*terrain*' },
];

export const KNOWN_PORTAL_HOSTS = new Set([
  'avito.ma',
  'www.avito.ma',
  'mubawab.ma',
  'www.mubawab.ma',
  'sarouty.ma',
  'www.sarouty.ma',
  'agenz.ma',
  'www.agenz.ma',
]);

export function decodeMarkup(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(?:47|x2f);/gi, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
}

export function normalizeHttpsUrl(raw, base) {
  try {
    const u = new URL(decodeMarkup(raw).trim(), base);
    u.hash = '';
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export function selectLatestCrawl(collections) {
  if (!Array.isArray(collections)) return null;
  return collections.find((item) => /^CC-MAIN-\d{4}-\d{2}$/.test(item?.id || '') && /^https:\/\//.test(item?.['cdx-api'] || '')) || null;
}

export function parseCdxJsonLines(text, family) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const record = JSON.parse(trimmed);
      if (!record?.url) continue;
      const url = normalizeHttpsUrl(record.url);
      if (!url) continue;
      out.push({ url, family, status: String(record.status || ''), mime: String(record.mime || '') });
    } catch {
      // Ignore malformed lines; request-level schema checks happen separately.
    }
  }
  return out;
}

export function realEstateSignals(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const value = decodeURIComponent(`${u.pathname} ${u.search}`).toLowerCase();
    const signals = new Set();
    const groups = [
      ['immobilier', /immobilier|property|propriete|propriété/],
      ['annonce', /annonce|listing/],
      ['appartement', /appartement|apartment|studio/],
      ['villa', /villa|maison|riad/],
      ['terrain', /terrain|land|lotissement/],
      ['commerce', /bureau|commerce|commercial|magasin|local/],
      ['transaction', /vente|vendre|acheter|location|louer|rent|sale/],
    ];
    for (const [name, re] of groups) if (re.test(value)) signals.add(name);
    return signals;
  } catch {
    return new Set();
  }
}

export function isMoroccanHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return host === 'ma' || host.endsWith('.ma');
}

export function rankNetNewDomains(records, knownHosts = KNOWN_PORTAL_HOSTS) {
  const byHost = new Map();
  for (const record of records || []) {
    let u;
    try { u = new URL(record.url); } catch { continue; }
    const host = u.hostname.toLowerCase();
    if (!isMoroccanHost(host) || knownHosts.has(host)) continue;
    const signals = realEstateSignals(record.url);
    if (signals.size === 0) continue;
    const current = byHost.get(host) || { host, urls: new Set(), families: new Set(), signals: new Set() };
    current.urls.add(record.url);
    if (record.family) current.families.add(record.family);
    for (const signal of signals) current.signals.add(signal);
    byHost.set(host, current);
  }

  return [...byHost.values()]
    .map((item) => ({
      host: item.host,
      urlCount: item.urls.size,
      familyCount: item.families.size,
      signalCount: item.signals.size,
      families: [...item.families].sort(),
      signals: [...item.signals].sort(),
      urls: [...item.urls].sort(),
      score: Math.min(item.urls.size, 100) + (item.families.size * 5) + (item.signals.size * 3),
    }))
    .filter((item) => item.familyCount >= 2 || item.urlCount >= 3)
    .sort((a, b) => b.score - a.score || b.urlCount - a.urlCount || a.host.localeCompare(b.host));
}

export function extractXmlLocs(xml) {
  return [...String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeMarkup(match[1]).trim())
    .filter(Boolean);
}

export function parseRobotsSitemaps(text, host) {
  const out = new Set();
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (!match) continue;
    const url = normalizeHttpsUrl(match[1]);
    if (!url) continue;
    try {
      const u = new URL(url);
      if (u.hostname.toLowerCase() === host.toLowerCase()) out.add(url);
    } catch {}
  }
  return [...out];
}

export function classifyFetchOutcome({ status, error, contentType = '', text = '', expected = 'any' }) {
  if (error === 'timeout') return 'timeout';
  if (error) return 'network_error';
  if (status === 403) return 'http_403';
  if (status === 429) return 'http_429';
  if (status < 200 || status >= 300) return `http_${status || 0}`;
  if (expected === 'json' && !String(text || '').trim().startsWith('[')) return 'schema_drift';
  if (expected === 'cdx' && !String(text || '').trim()) return 'schema_drift';
  if (expected === 'xml' && !/<(?:urlset|sitemapindex)\b/i.test(String(text || ''))) return 'schema_drift';
  if (expected === 'xml' && contentType && !/(?:xml|text\/plain|octet-stream)/i.test(contentType)) return 'schema_drift';
  return 'ok';
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
        accept: 'application/json,text/plain,application/xml,text/xml;q=0.9,*/*;q=0.5',
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

export async function queryCommonCrawlFamily({ crawl, family, fetchImpl, timeoutMs, userAgent, queryLimit }) {
  const endpoint = new URL(crawl['cdx-api']);
  endpoint.searchParams.set('url', family.pattern);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'url,status,mime');
  endpoint.searchParams.append('filter', 'status:200');
  endpoint.searchParams.append('filter', 'mime:text/html');
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(queryLimit));

  const response = await fetchText(endpoint.href, { fetchImpl, timeoutMs, userAgent });
  const request = requestRecord(endpoint.href, `commoncrawl:${family.name}`, response, 'cdx');
  const records = request.classification === 'ok' ? parseCdxJsonLines(response.text, family.name) : [];
  if (request.classification === 'ok' && records.length === 0) request.classification = 'schema_drift:no_records';
  return { request, records };
}

async function harvestDomainSitemaps({ host, fetchImpl, timeoutMs, userAgent, maxSitemaps }) {
  const requests = [];
  const sitemapQueue = [];
  const seenSitemaps = new Set();
  const candidateUrls = new Set();

  const robotsUrl = `https://${host}/robots.txt`;
  const robots = await fetchText(robotsUrl, { fetchImpl, timeoutMs, userAgent });
  const robotsRequest = requestRecord(robotsUrl, 'robots', robots, 'any');
  requests.push(robotsRequest);
  if (robotsRequest.classification === 'http_429') return { requests, candidateUrls: [], stoppedEarly: 'http_429' };
  if (robots.status >= 200 && robots.status < 300) {
    for (const sitemap of parseRobotsSitemaps(robots.text, host)) sitemapQueue.push(sitemap);
  }
  sitemapQueue.push(`https://${host}/sitemap.xml`, `https://${host}/sitemap_index.xml`);

  while (sitemapQueue.length && seenSitemaps.size < maxSitemaps) {
    const sitemap = sitemapQueue.shift();
    if (seenSitemaps.has(sitemap)) continue;
    seenSitemaps.add(sitemap);
    const response = await fetchText(sitemap, { fetchImpl, timeoutMs, userAgent });
    const request = requestRecord(sitemap, 'sitemap', response, 'xml');
    requests.push(request);
    if (request.classification === 'http_429') return { requests, candidateUrls: [...candidateUrls], stoppedEarly: 'http_429' };
    if (request.classification !== 'ok') continue;

    for (const raw of extractXmlLocs(response.text)) {
      const url = normalizeHttpsUrl(raw, sitemap);
      if (!url) continue;
      let u;
      try { u = new URL(url); } catch { continue; }
      if (u.hostname.toLowerCase() !== host.toLowerCase()) continue;
      if (/\.xml(?:$|\?)/i.test(u.pathname + u.search) && seenSitemaps.size + sitemapQueue.length < maxSitemaps) {
        sitemapQueue.push(url);
        continue;
      }
      if (realEstateSignals(url).size > 0) candidateUrls.add(url);
    }
  }

  return { requests, candidateUrls: [...candidateUrls].sort(), stoppedEarly: null };
}

export async function discoverCommonCrawlOpenWeb({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  queryLimit = DEFAULT_QUERY_LIMIT,
  topDomains = DEFAULT_TOP_DOMAINS,
  maxSitemapsPerDomain = DEFAULT_MAX_SITEMAPS_PER_DOMAIN,
  families = REAL_ESTATE_QUERY_FAMILIES,
  knownHosts = KNOWN_PORTAL_HOSTS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const requests = [];
  const collectionsResponse = await fetchText(COLLECTIONS_URL, { fetchImpl, timeoutMs, userAgent });
  const collectionsRequest = requestRecord(COLLECTIONS_URL, 'commoncrawl:collections', collectionsResponse, 'json');
  requests.push(collectionsRequest);
  if (collectionsRequest.classification !== 'ok') {
    return { crawl: null, requests, domains: [], candidateUrls: [], sitemapEvidence: [], stoppedEarly: collectionsRequest.classification, zeroDbWrites: true };
  }

  let collections;
  try { collections = JSON.parse(collectionsResponse.text); } catch { collections = null; }
  const crawl = selectLatestCrawl(collections);
  if (!crawl) return { crawl: null, requests, domains: [], candidateUrls: [], sitemapEvidence: [], stoppedEarly: 'schema_drift:no_crawl', zeroDbWrites: true };

  const records = [];
  let stoppedEarly = null;
  for (const family of families) {
    const result = await queryCommonCrawlFamily({ crawl, family, fetchImpl, timeoutMs, userAgent, queryLimit });
    requests.push(result.request);
    records.push(...result.records);
    if (result.request.classification === 'http_429') {
      stoppedEarly = 'http_429';
      break;
    }
  }

  const domains = rankNetNewDomains(records, knownHosts);
  const selectedDomains = domains.slice(0, topDomains);
  const sitemapEvidence = [];
  const candidateUrls = new Set();

  for (const domain of selectedDomains) for (const url of domain.urls) candidateUrls.add(url);

  if (!stoppedEarly) {
    for (const domain of selectedDomains) {
      const harvested = await harvestDomainSitemaps({
        host: domain.host,
        fetchImpl,
        timeoutMs,
        userAgent,
        maxSitemaps: maxSitemapsPerDomain,
      });
      requests.push(...harvested.requests);
      sitemapEvidence.push({ host: domain.host, candidateUrlCount: harvested.candidateUrls.length, stoppedEarly: harvested.stoppedEarly });
      for (const url of harvested.candidateUrls) candidateUrls.add(url);
      if (harvested.stoppedEarly === 'http_429') {
        stoppedEarly = `http_429:${domain.host}`;
        break;
      }
    }
  }

  return {
    crawl: crawl.id,
    requests,
    domains,
    candidateUrls: [...candidateUrls].sort(),
    sitemapEvidence,
    stoppedEarly,
    zeroDbWrites: true,
  };
}

export async function runCli() {
  const result = await discoverCommonCrawlOpenWeb();
  const ccQueries = result.requests.filter((request) => request.role.startsWith('commoncrawl:') && request.role !== 'commoncrawl:collections');
  const successfulQueryCount = ccQueries.filter((request) => request.classification === 'ok').length;
  const report = {
    startedAt: new Date().toISOString(),
    crawl: result.crawl,
    zeroDbWrites: result.zeroDbWrites,
    stoppedEarly: result.stoppedEarly,
    successfulQueryCount,
    queryCount: ccQueries.length,
    netNewDomainCount: result.domains.length,
    selectedDomainCount: Math.min(result.domains.length, DEFAULT_TOP_DOMAINS),
    candidateUrlCount: result.candidateUrls.length,
    topDomains: result.domains.slice(0, DEFAULT_TOP_DOMAINS).map((domain) => ({
      host: domain.host,
      score: domain.score,
      urlCount: domain.urlCount,
      familyCount: domain.familyCount,
      families: domain.families,
      signals: domain.signals,
    })),
    sitemapEvidence: result.sitemapEvidence,
    requests: result.requests,
    sample: result.candidateUrls.slice(0, 100),
  };
  report.success = Boolean(
    report.crawl &&
    report.zeroDbWrites &&
    !String(report.stoppedEarly || '').startsWith('http_429') &&
    report.successfulQueryCount >= 2 &&
    report.netNewDomainCount >= 3 &&
    report.candidateUrlCount >= 50
  );

  const outDir = 'artifacts/morocco-web-l3-commoncrawl';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# L3 Common Crawl Open-Web Mesh',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Crawl: **${report.crawl || 'none'}**`,
    `- Common Crawl queries: **${report.successfulQueryCount}/${report.queryCount} ok**`,
    `- Net-new ranked .ma domains: **${report.netNewDomainCount}**`,
    `- Candidate URLs: **${report.candidateUrlCount}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    '## Top domains',
    ...report.topDomains.map((item) => `- ${item.host} — score ${item.score} — ${item.urlCount} URLs — ${item.familyCount} query families`),
    '',
    '## Requests',
    ...report.requests.map((item) => `- ${item.classification} — ${item.status} — ${item.role} — ${item.url}`),
  ].join('\n'));

  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
