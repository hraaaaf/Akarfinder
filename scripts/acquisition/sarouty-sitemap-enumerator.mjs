import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const DEFAULT_ROBOTS_URL = 'https://www.sarouty.ma/robots.txt';
export const DEFAULT_MAX_SITEMAP_DOCS = 20;
export const DEFAULT_MAX_URLS = 200000;
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';
export const MIN_CRAWL_DELAY_MS = 10000;

const SAROUTY_HOSTS = new Set(['sarouty.ma', 'www.sarouty.ma']);
const TRANSACTION_SEGMENTS = new Set(['buy', 'rent', 'acheter', 'louer', 'للبيع', 'للكراء']);

export function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseRobots(robotsText) {
  const sitemaps = [];
  let crawlDelaySeconds = null;
  let inWildcardGroup = false;
  for (const raw of String(robotsText || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      inWildcardGroup = ua[1].trim() === '*';
      continue;
    }
    const sitemap = line.match(/^Sitemap:\s*(https?:\/\/\S+)$/i);
    if (sitemap) {
      sitemaps.push(sitemap[1]);
      continue;
    }
    if (inWildcardGroup) {
      const delay = line.match(/^Crawl-delay:\s*([0-9]+(?:\.[0-9]+)?)$/i);
      if (delay) crawlDelaySeconds = Number(delay[1]);
    }
  }
  return { sitemapRoots: [...new Set(sitemaps)], crawlDelaySeconds };
}

export function parseLocs(xml) {
  const out = [];
  for (const match of String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    out.push(decodeXml(match[1].trim()));
  }
  return out;
}

export function isSaroutyUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && SAROUTY_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function saroutyListingId(raw) {
  if (!isSaroutyUrl(raw)) return null;
  const url = new URL(raw);
  const queryId = url.searchParams.get('listing_id');
  if (/^\d{5,9}$/.test(queryId || '')) return queryId;
  const match = url.pathname.match(/-(\d{5,9})(?:\.html)?\/?$/i);
  return match ? match[1] : null;
}

export function isSaroutyRealEstateListing(raw) {
  const id = saroutyListingId(raw);
  if (!id) return false;
  const url = new URL(raw);
  if (/\/property-details\/?$/i.test(url.pathname) && url.searchParams.get('listing_id') === id) return true;
  if (/\/plp\//i.test(url.pathname)) return true;
  const parts = url.pathname.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part).toLowerCase(); } catch { return part.toLowerCase(); }
  });
  return parts.some((part) => TRANSACTION_SEGMENTS.has(part));
}

export function decodeBody(buffer) {
  const input = Buffer.from(buffer);
  if (input.length >= 2 && input[0] === 0x1f && input[1] === 0x8b) return gunzipSync(input).toString('utf8');
  return input.toString('utf8');
}

async function fetchBytes(url, { fetchImpl, timeoutMs, userAgent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'application/xml,text/xml,text/plain;q=0.9,*/*;q=0.5',
      },
    });
    return {
      status: response.status,
      finalUrl: response.url || url,
      contentType: response.headers?.get?.('content-type') || '',
      bytes: Buffer.from(await response.arrayBuffer()),
    };
  } catch (error) {
    return {
      status: 0,
      finalUrl: url,
      contentType: '',
      bytes: Buffer.alloc(0),
      error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function enumerateSaroutySitemaps({
  robotsUrl = DEFAULT_ROBOTS_URL,
  fetchImpl = globalThis.fetch,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxSitemapDocs = DEFAULT_MAX_SITEMAP_DOCS,
  maxUrls = DEFAULT_MAX_URLS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (typeof sleepImpl !== 'function') throw new TypeError('sleepImpl must be a function');

  const robots = await fetchBytes(robotsUrl, { fetchImpl, timeoutMs, userAgent });
  if (robots.status === 429) return { zeroDbWrites: true, stoppedEarly: 'http_429', requestCount: 1, listingUrls: [] };
  if (robots.status < 200 || robots.status >= 300) throw new Error(`robots fetch failed: HTTP ${robots.status}`);

  const parsedRobots = parseRobots(decodeBody(robots.bytes));
  const sitemapRoots = parsedRobots.sitemapRoots.filter(isSaroutyUrl);
  if (!sitemapRoots.length) throw new Error('No Sarouty sitemap declared in robots.txt');
  const declaredDelayMs = Math.ceil((parsedRobots.crawlDelaySeconds ?? 10) * 1000);
  const crawlDelayMs = Math.max(MIN_CRAWL_DELAY_MS, declaredDelayMs);

  const queue = [...sitemapRoots];
  const seenDocs = new Set();
  const listingById = new Map();
  const sitemapDocs = [];
  let requestCount = 1;
  let stoppedEarly = null;

  while (queue.length && seenDocs.size < maxSitemapDocs && listingById.size < maxUrls) {
    const sitemapUrl = queue.shift();
    if (!isSaroutyUrl(sitemapUrl) || seenDocs.has(sitemapUrl)) continue;
    await sleepImpl(crawlDelayMs);
    seenDocs.add(sitemapUrl);
    const response = await fetchBytes(sitemapUrl, { fetchImpl, timeoutMs, userAgent });
    requestCount += 1;
    if (response.status === 429) {
      stoppedEarly = 'http_429';
      sitemapDocs.push({ url: sitemapUrl, status: 429, locCount: 0, listingCount: 0 });
      break;
    }
    if (response.status < 200 || response.status >= 300) {
      sitemapDocs.push({ url: sitemapUrl, status: response.status, locCount: 0, listingCount: 0 });
      continue;
    }

    const locs = parseLocs(decodeBody(response.bytes));
    let listingCount = 0;
    for (const loc of locs) {
      if (!isSaroutyUrl(loc)) continue;
      const locUrl = new URL(loc);
      if (/\.xml(?:\.gz)?$/i.test(locUrl.pathname)) {
        if (!seenDocs.has(loc) && queue.length + seenDocs.size < maxSitemapDocs * 4) queue.push(loc);
        continue;
      }
      if (!isSaroutyRealEstateListing(loc)) continue;
      const id = saroutyListingId(loc);
      if (!listingById.has(id)) {
        listingById.set(id, loc);
        listingCount += 1;
      }
      if (listingById.size >= maxUrls) break;
    }
    sitemapDocs.push({ url: sitemapUrl, finalUrl: response.finalUrl, status: response.status, contentType: response.contentType, locCount: locs.length, listingCount });
  }

  const listingUrls = [...listingById.values()];
  return {
    zeroDbWrites: true,
    robotsUrl,
    sitemapRoots,
    crawlDelaySeconds: parsedRobots.crawlDelaySeconds,
    crawlDelayMs,
    sitemapDocCount: sitemapDocs.length,
    requestCount,
    uniqueRealEstateListingCount: listingUrls.length,
    listingUrls,
    sitemapDocs,
    queueRemaining: queue.length,
    stoppedEarly,
    cappedByDocs: seenDocs.size >= maxSitemapDocs && queue.length > 0,
    cappedByUrls: listingUrls.length >= maxUrls,
  };
}

export async function runCli() {
  const report = await enumerateSaroutySitemaps({
    maxSitemapDocs: Number.parseInt(process.env.SAROUTY_MAX_SITEMAP_DOCS || String(DEFAULT_MAX_SITEMAP_DOCS), 10),
    maxUrls: Number.parseInt(process.env.SAROUTY_MAX_URLS || String(DEFAULT_MAX_URLS), 10),
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites === true
    && report.sitemapRoots?.length > 0
    && report.sitemapDocCount > 0
    && report.crawlDelayMs >= MIN_CRAWL_DELAY_MS
    && report.stoppedEarly !== 'http_429';

  const outDir = 'artifacts/morocco-web-l8-sarouty-sitemap';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  console.log(JSON.stringify({ ...report, listingUrls: undefined, sitemapDocs: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
