import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const BASE_URL = 'https://agenz.ma';
export const ROBOTS_URL = `${BASE_URL}/robots.txt`;
export const DEFAULT_DELAY_MS = 3000;
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_MAX_PAGES = 25;
export const DEFAULT_MAX_LISTINGS = 5000;
export const USER_AGENT = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';

export const ROOTS = [
  `${BASE_URL}/fr/acheter/immo-casablanca`,
  `${BASE_URL}/fr/louer/immo-casablanca/location-`,
  `${BASE_URL}/fr/acheter/immo-rabat`,
  `${BASE_URL}/fr/louer/immo-rabat/location-`,
  `${BASE_URL}/fr/acheter/immo-marrakech`,
  `${BASE_URL}/fr/louer/immo-marrakech/location-`,
  `${BASE_URL}/fr/acheter/immo-tanger`,
  `${BASE_URL}/fr/louer/immo-tanger/location-`,
  `${BASE_URL}/fr/acheter/immo-agadir`,
  `${BASE_URL}/fr/louer/immo-agadir/location-`,
];

const HARD_BLOCK_MARKERS = ['captcha', 'cf-chl-', 'verify you are human', 'access denied'];

export function parseRobots(text = '') {
  let wildcard = false;
  let crawlDelaySeconds = null;
  const disallow = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) { wildcard = ua[1].trim() === '*'; continue; }
    if (!wildcard) continue;
    const d = line.match(/^Crawl-delay:\s*([0-9]+(?:\.[0-9]+)?)$/i);
    if (d) crawlDelaySeconds = Number(d[1]);
    const rule = line.match(/^Disallow:\s*(.*)$/i);
    if (rule && rule[1].trim()) disallow.push(rule[1].trim());
  }
  return { crawlDelaySeconds, disallow };
}

export function isHardBlock(html = '') {
  const s = String(html).toLowerCase();
  return HARD_BLOCK_MARKERS.some((m) => s.includes(m));
}

export function agenzListingId(raw) {
  try {
    const u = new URL(raw, BASE_URL);
    if (u.hostname !== 'agenz.ma') return null;
    const m = u.pathname.match(/^\/fr\/annonces\/immo-[^/]+\/(?:vente|location)-[^/]+\/[^/]+\/(\d+)\/?$/i);
    return m ? m[1] : null;
  } catch { return null; }
}

function absolute(href) {
  try { return new URL(href, BASE_URL).toString(); } catch { return null; }
}

export function extractListingUrls(html = '') {
  const byId = new Map();
  for (const m of String(html).matchAll(/href=["']([^"']+)["']/gi)) {
    const u = absolute(m[1]);
    const id = u && agenzListingId(u);
    if (id && !byId.has(id)) byId.set(id, u);
  }
  return [...byId.values()];
}

export function extractDiscoveryUrls(html = '') {
  const out = new Set();
  for (const m of String(html).matchAll(/href=["']([^"']+)["']/gi)) {
    const u = absolute(m[1]);
    if (!u) continue;
    const parsed = new URL(u);
    if (parsed.hostname !== 'agenz.ma') continue;
    if (/^\/fr\/(?:acheter|louer)\/immo-[^/?#]+/i.test(parsed.pathname)) out.add(parsed.toString());
  }
  return [...out];
}

export function parseResultCount(html = '') {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const m = text.match(/([\d\s]+)\s+(?:Appartements|Villas|Annonces immobilières)\s+à\s+(?:vendre|louer)/i);
  return m ? Number(m[1].replace(/\s/g, '')) : null;
}

function blockedByRobots(url, rules = []) {
  const p = new URL(url).pathname;
  return rules.some((r) => r !== '/' && p.startsWith(r));
}

async function fetchText(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' } });
    return { status: r.status, finalUrl: r.url || url, text: await r.text() };
  } catch (error) {
    return { status: 0, finalUrl: url, text: '', error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) };
  } finally { clearTimeout(timer); }
}

export async function enumerateAgenz({ roots = ROOTS, fetchImpl = globalThis.fetch, sleepImpl = (ms) => new Promise((r) => setTimeout(r, ms)), maxPages = DEFAULT_MAX_PAGES, maxListings = DEFAULT_MAX_LISTINGS, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const robots = await fetchText(ROBOTS_URL, { fetchImpl, timeoutMs });
  if (robots.status === 403 || robots.status === 429 || robots.status === 0) return { zeroDbWrites: true, stoppedEarly: `robots_http_${robots.status}`, requestCount: 1, listingUrls: [] };
  const parsedRobots = robots.status === 404 ? { crawlDelaySeconds: null, disallow: [] } : parseRobots(robots.text);
  const delayMs = Math.max(DEFAULT_DELAY_MS, Math.ceil((parsedRobots.crawlDelaySeconds || 0) * 1000));
  const queue = roots.filter((u) => !blockedByRobots(u, parsedRobots.disallow));
  const seen = new Set();
  const listingById = new Map();
  const pages = [];
  let requestCount = 1;
  let stoppedEarly = null;

  while (queue.length && seen.size < maxPages && listingById.size < maxListings) {
    const url = queue.shift();
    if (seen.has(url) || blockedByRobots(url, parsedRobots.disallow)) continue;
    await sleepImpl(delayMs);
    seen.add(url);
    const r = await fetchText(url, { fetchImpl, timeoutMs });
    requestCount += 1;
    if (r.status === 429) { stoppedEarly = 'http_429'; break; }
    if (r.status === 403 || isHardBlock(r.text)) { stoppedEarly = 'hard_block'; break; }
    if (r.status < 200 || r.status >= 300) { pages.push({ url, status: r.status, listingCount: 0 }); continue; }
    const listings = extractListingUrls(r.text);
    for (const listing of listings) {
      const id = agenzListingId(listing);
      if (id && !listingById.has(id)) listingById.set(id, listing);
      if (listingById.size >= maxListings) break;
    }
    for (const next of extractDiscoveryUrls(r.text)) if (!seen.has(next) && !queue.includes(next)) queue.push(next);
    pages.push({ url, status: r.status, listingCount: listings.length, resultCount: parseResultCount(r.text) });
  }

  const listingUrls = [...listingById.values()];
  return { zeroDbWrites: true, robotsStatus: robots.status, crawlDelaySeconds: parsedRobots.crawlDelaySeconds, delayMs, rootCount: roots.length, pageCount: seen.size, requestCount, uniqueListingCount: listingUrls.length, listingUrls, pages, queueRemaining: queue.length, stoppedEarly, cappedByPages: seen.size >= maxPages && queue.length > 0, cappedByListings: listingUrls.length >= maxListings };
}

export async function runCli() {
  const report = await enumerateAgenz({ maxPages: Number.parseInt(process.env.AGENZ_MAX_PAGES || String(DEFAULT_MAX_PAGES), 10), maxListings: Number.parseInt(process.env.AGENZ_MAX_LISTINGS || String(DEFAULT_MAX_LISTINGS), 10) });
  const outDir = 'artifacts/morocco-web-l8-agenz';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  console.log(JSON.stringify({ ...report, listingUrls: undefined, pages: undefined }, null, 2));
  if (report.stoppedEarly) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
