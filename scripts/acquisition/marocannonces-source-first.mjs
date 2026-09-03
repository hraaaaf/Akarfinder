import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const BASE_URL = 'https://www.marocannonces.com';
export const ROBOTS_URL = `${BASE_URL}/robots.txt`;
export const DEFAULT_DELAY_MS = 3000;
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_MAX_PAGES = 25;
export const DEFAULT_MAX_LISTINGS = 5000;
export const USER_AGENT = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';

export const RESIDENTIAL_ROOTS = [
  `${BASE_URL}/categorie/315/Vente-immobilier/Appartements.html`,
  `${BASE_URL}/categorie/319/Vente-immobilier/Villas-Maisons-Riads.html`,
  `${BASE_URL}/categorie/332/Vente-immobilier/Terrains-constructibles.html`,
  `${BASE_URL}/categorie/321/Location-immobilier/Appartements.html`,
  `${BASE_URL}/categorie/322/Location-immobilier/Villas-Maisons-Riads.html`,
];

const HARD_BLOCK_MARKERS = [
  'please wait while your request is being verified',
  'one moment, please',
  'cf-chl-',
  'captcha',
];

function absolutize(href) {
  try { return new URL(href, BASE_URL).toString(); } catch { return null; }
}

export function parseRobots(text = '') {
  let wildcard = false;
  let crawlDelaySeconds = null;
  const disallow = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      wildcard = ua[1].trim() === '*';
      continue;
    }
    if (!wildcard) continue;
    const delay = line.match(/^Crawl-delay:\s*([0-9]+(?:\.[0-9]+)?)$/i);
    if (delay) crawlDelaySeconds = Number(delay[1]);
    const rule = line.match(/^Disallow:\s*(.*)$/i);
    if (rule && rule[1].trim()) disallow.push(rule[1].trim());
  }
  return { crawlDelaySeconds, disallow };
}

export function isHardBlock(html = '') {
  const lower = String(html).toLowerCase();
  return HARD_BLOCK_MARKERS.some((marker) => lower.includes(marker));
}

export function marocAnnoncesListingId(raw) {
  try {
    const u = new URL(raw, BASE_URL);
    if (u.hostname !== 'www.marocannonces.com') return null;
    const m = u.pathname.match(/\/annonce\/(\d+)\//i);
    return m ? m[1] : null;
  } catch { return null; }
}

export function extractListingUrls(html = '') {
  const byId = new Map();
  for (const match of String(html).matchAll(/href=["']([^"']+)["']/gi)) {
    const abs = absolutize(match[1]);
    if (!abs) continue;
    const id = marocAnnoncesListingId(abs);
    if (id && !byId.has(id)) byId.set(id, abs);
  }
  return [...byId.values()];
}

export function extractPaginationUrls(html = '', currentUrl) {
  const current = new URL(currentUrl);
  const out = new Set();
  for (const match of String(html).matchAll(/href=["']([^"']+)["']/gi)) {
    const abs = absolutize(match[1]);
    if (!abs) continue;
    const u = new URL(abs);
    if (u.hostname !== 'www.marocannonces.com') continue;
    if (!/^\/categorie\/\d+\//i.test(u.pathname)) continue;
    if (!/\/\d+\.html$/i.test(u.pathname)) continue;
    const currentCategory = current.pathname.match(/^\/categorie\/(\d+)\//i)?.[1];
    const nextCategory = u.pathname.match(/^\/categorie\/(\d+)\//i)?.[1];
    if (currentCategory && nextCategory === currentCategory) out.add(u.toString());
  }
  return [...out];
}

export function parseCategoryCounts(html = '') {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const m = text.match(/Vous consultez les\s+([\d\s]+)\s+annonces[^\d]+dont\s+([\d\s]+)\s+de/i);
  if (!m) return { sectionTotal: null, categoryTotal: null };
  return {
    sectionTotal: Number(m[1].replace(/\s/g, '')),
    categoryTotal: Number(m[2].replace(/\s/g, '')),
  };
}

function pathBlocked(url, disallow = []) {
  const pathname = new URL(url).pathname;
  return disallow.some((rule) => rule !== '/' && pathname.startsWith(rule));
}

async function fetchText(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' },
    });
    return { status: r.status, finalUrl: r.url || url, text: await r.text() };
  } catch (error) {
    return { status: 0, finalUrl: url, text: '', error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function enumerateMarocAnnonces({
  roots = RESIDENTIAL_ROOTS,
  fetchImpl = globalThis.fetch,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxPages = DEFAULT_MAX_PAGES,
  maxListings = DEFAULT_MAX_LISTINGS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const robots = await fetchText(ROBOTS_URL, { fetchImpl, timeoutMs });
  if (robots.status === 403 || robots.status === 429 || robots.status === 0) {
    return { zeroDbWrites: true, stoppedEarly: `robots_http_${robots.status}`, requestCount: 1, listingUrls: [] };
  }
  const parsedRobots = robots.status === 404 ? { crawlDelaySeconds: null, disallow: [] } : parseRobots(robots.text);
  const delayMs = Math.max(DEFAULT_DELAY_MS, Math.ceil((parsedRobots.crawlDelaySeconds || 0) * 1000));

  const queue = roots.filter((u) => !pathBlocked(u, parsedRobots.disallow));
  const seenPages = new Set();
  const listingById = new Map();
  const pages = [];
  let requestCount = 1;
  let stoppedEarly = null;

  while (queue.length && seenPages.size < maxPages && listingById.size < maxListings) {
    const url = queue.shift();
    if (seenPages.has(url) || pathBlocked(url, parsedRobots.disallow)) continue;
    await sleepImpl(delayMs);
    seenPages.add(url);
    const r = await fetchText(url, { fetchImpl, timeoutMs });
    requestCount += 1;
    if (r.status === 429) { stoppedEarly = 'http_429'; break; }
    if (r.status === 403 || isHardBlock(r.text)) { stoppedEarly = 'hard_block'; break; }
    if (r.status < 200 || r.status >= 300) {
      pages.push({ url, status: r.status, listingCount: 0 });
      continue;
    }

    const listings = extractListingUrls(r.text);
    for (const listing of listings) {
      const id = marocAnnoncesListingId(listing);
      if (id && !listingById.has(id)) listingById.set(id, listing);
      if (listingById.size >= maxListings) break;
    }
    const pagination = extractPaginationUrls(r.text, url);
    for (const next of pagination) if (!seenPages.has(next) && !queue.includes(next)) queue.push(next);
    pages.push({ url, status: r.status, listingCount: listings.length, ...parseCategoryCounts(r.text) });
  }

  const listingUrls = [...listingById.values()];
  return {
    zeroDbWrites: true,
    robotsStatus: robots.status,
    crawlDelaySeconds: parsedRobots.crawlDelaySeconds,
    delayMs,
    rootCount: roots.length,
    pageCount: seenPages.size,
    requestCount,
    uniqueListingCount: listingUrls.length,
    listingUrls,
    pages,
    queueRemaining: queue.length,
    stoppedEarly,
    cappedByPages: seenPages.size >= maxPages && queue.length > 0,
    cappedByListings: listingUrls.length >= maxListings,
  };
}

export async function runCli() {
  const report = await enumerateMarocAnnonces({
    maxPages: Number.parseInt(process.env.MAROCANNONCES_MAX_PAGES || String(DEFAULT_MAX_PAGES), 10),
    maxListings: Number.parseInt(process.env.MAROCANNONCES_MAX_LISTINGS || String(DEFAULT_MAX_LISTINGS), 10),
  });
  const outDir = 'artifacts/morocco-web-l8-marocannonces';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  console.log(JSON.stringify({ ...report, listingUrls: undefined, pages: undefined }, null, 2));
  if (report.stoppedEarly) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
