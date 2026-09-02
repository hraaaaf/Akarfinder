import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_UA = 'AkarFinder-public-index/3.1 (+https://akarfinder.ma)';
export const DEFAULT_MAX_PAGES = 12;
export const DEFAULT_MAX_URLS_PER_SOURCE = 20_000;

const MUBAWAB_HOSTS = new Set(['www.mubawab.ma', 'mubawab.ma']);
const MAROCANNONCES_HOSTS = new Set(['www.marocannonces.com', 'marocannonces.com']);

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

export function extractHtmlRefs(html) {
  const text = decodeMarkup(html);
  const refs = new Set();
  for (const match of text.matchAll(/(?:href|data-url|data-href|data-link|data-target)\s*=\s*["']([^"']+)["']/gi)) refs.add(match[1]);
  for (const match of text.matchAll(/https:\/\/[^\s"'<>]+/gi)) refs.add(match[0]);
  return [...refs];
}

export function isMubawabListingUrl(raw) {
  const url = normalizeHttpsUrl(raw, 'https://www.mubawab.ma/');
  if (!url) return false;
  const u = new URL(url);
  return MUBAWAB_HOSTS.has(u.hostname) && /^\/fr\/(?:a|pa)\/\d+(?:\/|$)/i.test(u.pathname);
}

export function canonicalizeMarocAnnoncesListing(raw) {
  const cleaned = decodeMarkup(raw).trim();
  const match = cleaned.match(/(?:https:\/\/(?:www\.)?marocannonces\.com\/)?(categorie\/\d+\/[^\s"'<>]*?annonce\/\d+\/[^\s"'<>]+)/i);
  if (!match) return null;
  const url = normalizeHttpsUrl(`/${match[1].replace(/^\/+/, '')}`, 'https://www.marocannonces.com/');
  if (!url) return null;
  const u = new URL(url);
  return MAROCANNONCES_HOSTS.has(u.hostname) ? url : null;
}

export function classifyHtmlFetchOutcome({ status, error, contentType = '', text = '' }) {
  if (error === 'timeout') return 'timeout';
  if (error) return 'network_error';
  if (status === 403) return 'http_403';
  if (status === 429) return 'http_429';
  if (status < 200 || status >= 300) return `http_${status || 0}`;
  if (contentType && !/(?:html|text\/plain)/i.test(contentType)) return 'schema_drift';
  if (!String(text || '').trim()) return 'schema_drift';
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
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
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

function mubawabSeeds() {
  // Mubawab currently disallows paths containing ':' in robots.txt, so the
  // legacy :p:N pagination must not be generated. Exhaustive L8 acquisition
  // uses the dedicated robots-safe shard manifest enumerator instead.
  return [
    'https://www.mubawab.ma/fr/cc/immobilier-a-vendre',
    'https://www.mubawab.ma/fr/cc/immobilier-a-louer',
  ];
}

function marocAnnoncesSeeds(maxPages) {
  const roots = [
    'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html',
    'https://www.marocannonces.com/categorie/319/Vente-immobilier/Villas-Maisons-Riads.html',
  ];
  return roots.flatMap((root) => {
    const stem = root.replace(/\.html$/i, '');
    return [root, ...Array.from({ length: Math.max(0, maxPages - 1) }, (_, i) => `${stem}/${i + 2}.html`)];
  });
}

async function discoverSource({ name, seeds, extract, fetchImpl, timeoutMs, userAgent, maxUrls }) {
  const urls = new Set();
  const requests = [];
  let stoppedEarly = null;

  for (const seed of seeds) {
    const response = await fetchText(seed, { fetchImpl, timeoutMs, userAgent });
    const classification = classifyHtmlFetchOutcome(response);
    requests.push({
      url: seed,
      status: response.status,
      finalUrl: response.finalUrl,
      contentType: response.contentType,
      bytes: Buffer.byteLength(response.text || ''),
      classification,
      ...(response.error ? { error: response.error } : {}),
    });
    if (classification === 'http_429') {
      stoppedEarly = 'http_429';
      break;
    }
    if (classification !== 'ok') continue;

    for (const candidate of extract(response.text)) {
      urls.add(candidate);
      if (urls.size >= maxUrls) break;
    }
    if (urls.size >= maxUrls) break;
  }

  return { name, urls: [...urls], requests, stoppedEarly, zeroDbWrites: true };
}

export function extractMubawabListings(html) {
  const out = new Set();
  for (const raw of extractHtmlRefs(html)) {
    const url = normalizeHttpsUrl(raw, 'https://www.mubawab.ma/');
    if (url && isMubawabListingUrl(url)) out.add(url);
  }
  return [...out];
}

export function extractMarocAnnoncesListings(html) {
  const out = new Set();
  for (const raw of extractHtmlRefs(html)) {
    const url = canonicalizeMarocAnnoncesListing(raw);
    if (url) out.add(url);
  }
  const text = decodeMarkup(html);
  for (const match of text.matchAll(/(?:https:\/\/(?:www\.)?marocannonces\.com\/)?categorie\/\d+\/[^\s"'<>]*?annonce\/\d+\/[^\s"'<>]+/gi)) {
    const url = canonicalizeMarocAnnoncesListing(match[0]);
    if (url) out.add(url);
  }
  return [...out];
}

export async function discoverMubawabAndMarocAnnonces({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  maxPages = DEFAULT_MAX_PAGES,
  maxUrlsPerSource = DEFAULT_MAX_URLS_PER_SOURCE,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const mubawab = await discoverSource({
    name: 'mubawab',
    seeds: mubawabSeeds(),
    extract: extractMubawabListings,
    fetchImpl,
    timeoutMs,
    userAgent,
    maxUrls: maxUrlsPerSource,
  });
  const marocannonces = await discoverSource({
    name: 'marocannonces',
    seeds: marocAnnoncesSeeds(maxPages),
    extract: extractMarocAnnoncesListings,
    fetchImpl,
    timeoutMs,
    userAgent,
    maxUrls: maxUrlsPerSource,
  });

  return { sources: [mubawab, marocannonces], zeroDbWrites: true };
}

export async function runCli() {
  const result = await discoverMubawabAndMarocAnnonces();
  const report = {
    startedAt: new Date().toISOString(),
    zeroDbWrites: result.zeroDbWrites,
    sources: result.sources.map((source) => ({
      name: source.name,
      discoveredUrlCount: source.urls.length,
      stoppedEarly: source.stoppedEarly,
      requests: source.requests,
      sample: source.urls.slice(0, 50),
    })),
  };
  report.productiveSourceCount = report.sources.filter((source) => source.discoveredUrlCount > 0).length;
  report.discoveredUrlCount = report.sources.reduce((sum, source) => sum + source.discoveredUrlCount, 0);
  report.success = report.zeroDbWrites && report.productiveSourceCount === 2 && report.sources.every((source) => source.stoppedEarly !== 'http_429');

  const outDir = 'artifacts/morocco-web-l2-mubawab-marocannonces';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# L2 Mubawab + MarocAnnonces Public Adapters',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Productive sources: **${report.productiveSourceCount}/2**`,
    `- Candidate URLs: **${report.discoveredUrlCount}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    '',
    ...report.sources.flatMap((source) => [
      `## ${source.name}`,
      `- Candidate URLs: **${source.discoveredUrlCount}**`,
      `- Early stop: **${source.stoppedEarly || 'none'}**`,
      ...source.requests.map((r) => `- ${r.classification} — ${r.status} — ${r.url}`),
      '',
    ]),
  ].join('\n'));

  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
