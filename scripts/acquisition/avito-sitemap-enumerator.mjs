import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const DEFAULT_ROBOTS_URL = 'https://www.avito.ma/robots.txt';
export const DEFAULT_MAX_SITEMAP_DOCS = 20;
export const DEFAULT_MAX_URLS = 200000;
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';

const AVITO_HOSTS = new Set(['avito.ma', 'www.avito.ma']);
const REAL_ESTATE_CATEGORY_SEGMENTS = new Set([
  'appartements', 'local', 'terrains_et_fermes', 'villas_et_riads', 'bureaux',
  'locations_de_vacances', 'maisons_et_villas', 'autre_immobilier', 'autres_immobilier',
  'maisons', 'magasins_et_commerces', 'bureaux_et_plateaux', 'colocations',
  'فيلات___رياض', 'محلات', 'بقع_و_مزارع', 'شقق', 'دار_أو_ڤيلا', 'كراء_مشترك',
  'مكاتب', 'منازل_للعطلة', 'عقار_آخر', 'منازل', 'برطما_شقة',
]);

export function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseSitemapDirectives(robotsText) {
  const out = [];
  for (const line of String(robotsText || '').split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap:\s*(https?:\/\/\S+)\s*$/i);
    if (match) out.push(match[1]);
  }
  return [...new Set(out)];
}

export function parseLocs(xml) {
  const out = [];
  for (const match of String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    out.push(decodeXml(match[1].trim()));
  }
  return out;
}

export function isAvitoUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && AVITO_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function avitoListingId(raw) {
  if (!isAvitoUrl(raw)) return null;
  const pathname = new URL(raw).pathname;
  const match = pathname.match(/_(\d{7,9})\.htm$/i);
  return match ? match[1] : null;
}

export function categorySegment(raw) {
  if (!isAvitoUrl(raw)) return null;
  const parts = new URL(raw).pathname.split('/').filter(Boolean);
  if (parts.length < 3) return null;
  try {
    return decodeURIComponent(parts[2]).toLowerCase();
  } catch {
    return parts[2].toLowerCase();
  }
}

export function isAvitoRealEstateListing(raw) {
  if (!avitoListingId(raw)) return false;
  const segment = categorySegment(raw);
  return segment ? REAL_ESTATE_CATEGORY_SEGMENTS.has(segment) : false;
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

export async function enumerateAvitoSitemap({
  robotsUrl = DEFAULT_ROBOTS_URL,
  fetchImpl = globalThis.fetch,
  maxSitemapDocs = DEFAULT_MAX_SITEMAP_DOCS,
  maxUrls = DEFAULT_MAX_URLS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  const robots = await fetchBytes(robotsUrl, { fetchImpl, timeoutMs, userAgent });
  if (robots.status === 429) return { zeroDbWrites: true, stoppedEarly: 'http_429', requestCount: 1, sitemapDocs: [], listingUrls: [] };
  if (robots.status < 200 || robots.status >= 300) throw new Error(`robots fetch failed: HTTP ${robots.status}`);
  const sitemapRoots = parseSitemapDirectives(decodeBody(robots.bytes)).filter(isAvitoUrl);
  if (!sitemapRoots.length) throw new Error('No Avito sitemap declared in robots.txt');

  const queue = [...sitemapRoots];
  const seenDocs = new Set();
  const listingById = new Map();
  const sitemapDocs = [];
  let requestCount = 1;
  let stoppedEarly = null;

  while (queue.length && seenDocs.size < maxSitemapDocs && listingById.size < maxUrls) {
    const sitemapUrl = queue.shift();
    if (!isAvitoUrl(sitemapUrl) || seenDocs.has(sitemapUrl)) continue;
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
    const xml = decodeBody(response.bytes);
    const locs = parseLocs(xml);
    let listingCount = 0;
    for (const loc of locs) {
      if (!isAvitoUrl(loc)) continue;
      if (/\.xml(?:\.gz)?(?:$|\?)/i.test(new URL(loc).pathname + new URL(loc).search)) {
        if (!seenDocs.has(loc) && queue.length + seenDocs.size < maxSitemapDocs * 4) queue.push(loc);
        continue;
      }
      if (!isAvitoRealEstateListing(loc)) continue;
      const id = avitoListingId(loc);
      if (!listingById.has(id)) {
        listingById.set(id, loc);
        listingCount += 1;
      }
      if (listingById.size >= maxUrls) break;
    }
    sitemapDocs.push({
      url: sitemapUrl,
      finalUrl: response.finalUrl,
      status: response.status,
      contentType: response.contentType,
      locCount: locs.length,
      listingCount,
    });
  }

  const listingUrls = [...listingById.values()];
  return {
    zeroDbWrites: true,
    robotsUrl,
    sitemapRoots,
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
  const report = await enumerateAvitoSitemap({
    maxSitemapDocs: Number.parseInt(process.env.AVITO_MAX_SITEMAP_DOCS || String(DEFAULT_MAX_SITEMAP_DOCS), 10),
    maxUrls: Number.parseInt(process.env.AVITO_MAX_URLS || String(DEFAULT_MAX_URLS), 10),
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites === true
    && report.sitemapRoots?.length > 0
    && report.sitemapDocCount > 0
    && report.stoppedEarly !== 'http_429';

  const outDir = 'artifacts/morocco-web-l8-avito-sitemap';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# Morocco Web L8 — Avito Sitemap Enumerator',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Sitemap roots: **${report.sitemapRoots?.length || 0}**`,
    `- Sitemap docs fetched: **${report.sitemapDocCount || 0}**`,
    `- HTTP requests: **${report.requestCount}**`,
    `- Unique real-estate listing URLs: **${report.uniqueRealEstateListingCount || 0}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    `- Queue remaining: **${report.queueRemaining || 0}**`,
    '',
    '## Safety',
    '- Public robots.txt and declared sitemap documents only.',
    '- No private API or authenticated endpoint.',
    '- Immediate stop on HTTP 429.',
    '- No production DB writes.',
  ].join('\n'));
  console.log(JSON.stringify({ ...report, listingUrls: undefined, sitemapDocs: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
