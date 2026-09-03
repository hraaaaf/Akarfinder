import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_ROBOTS_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_UA,
  MIN_CRAWL_DELAY_MS,
  decodeBody,
  isSaroutyRealEstateListing,
  isSaroutyUrl,
  parseLocs,
  parseRobots,
  saroutyListingId,
} from './sarouty-sitemap-enumerator.mjs';

export const PROPERTY_SITEMAP_RE = /^property_details\d*\.xml(?:\.gz)?$/i;

export function isSaroutyPropertySitemap(raw) {
  if (!isSaroutyUrl(raw)) return false;
  try {
    const base = new URL(raw).pathname.split('/').pop() || '';
    return PROPERTY_SITEMAP_RE.test(base);
  } catch {
    return false;
  }
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

export async function enumerateSaroutyPropertySitemaps({
  robotsUrl = DEFAULT_ROBOTS_URL,
  fetchImpl = globalThis.fetch,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxPropertySitemaps = 20,
  maxUrls = 200000,
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

  const propertySitemaps = [];
  const rootDocs = [];
  let requestCount = 1;
  let stoppedEarly = null;

  for (const root of sitemapRoots) {
    await sleepImpl(crawlDelayMs);
    const response = await fetchBytes(root, { fetchImpl, timeoutMs, userAgent });
    requestCount += 1;
    if (response.status === 429) {
      stoppedEarly = 'http_429';
      break;
    }
    if (response.status < 200 || response.status >= 300) {
      rootDocs.push({ url: root, status: response.status, locCount: 0 });
      continue;
    }
    const locs = parseLocs(decodeBody(response.bytes));
    for (const loc of locs) {
      if (isSaroutyPropertySitemap(loc) && !propertySitemaps.includes(loc)) propertySitemaps.push(loc);
    }
    rootDocs.push({ url: root, status: response.status, locCount: locs.length, propertySitemapCount: propertySitemaps.length });
  }

  const selectedSitemaps = propertySitemaps.slice(0, maxPropertySitemaps);
  const listingById = new Map();
  const sitemapDocs = [];

  for (const sitemapUrl of selectedSitemaps) {
    if (listingById.size >= maxUrls || stoppedEarly) break;
    await sleepImpl(crawlDelayMs);
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
      if (!isSaroutyRealEstateListing(loc)) continue;
      const id = saroutyListingId(loc);
      if (id && !listingById.has(id)) {
        listingById.set(id, loc);
        listingCount += 1;
      }
      if (listingById.size >= maxUrls) break;
    }
    sitemapDocs.push({ url: sitemapUrl, status: response.status, locCount: locs.length, listingCount });
  }

  const listingUrls = [...listingById.values()];
  return {
    zeroDbWrites: true,
    robotsUrl,
    sitemapRoots,
    crawlDelaySeconds: parsedRobots.crawlDelaySeconds,
    crawlDelayMs,
    rootSitemapCount: rootDocs.length,
    rootDocs,
    discoveredPropertySitemapCount: propertySitemaps.length,
    selectedPropertySitemapCount: selectedSitemaps.length,
    sitemapDocs,
    requestCount,
    uniqueRealEstateListingCount: listingUrls.length,
    listingUrls,
    stoppedEarly,
    cappedBySitemaps: selectedSitemaps.length < propertySitemaps.length,
    cappedByUrls: listingUrls.length >= maxUrls,
  };
}

export async function runCli() {
  const report = await enumerateSaroutyPropertySitemaps({
    maxPropertySitemaps: Number.parseInt(process.env.SAROUTY_MAX_PROPERTY_SITEMAPS || '20', 10),
    maxUrls: Number.parseInt(process.env.SAROUTY_MAX_URLS || '200000', 10),
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites === true
    && report.sitemapRoots?.length > 0
    && report.discoveredPropertySitemapCount > 0
    && report.crawlDelayMs >= MIN_CRAWL_DELAY_MS
    && !report.stoppedEarly;

  const outDir = 'artifacts/morocco-web-l8-sarouty-property-sitemap';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  console.log(JSON.stringify({ ...report, listingUrls: undefined, rootDocs: undefined, sitemapDocs: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
