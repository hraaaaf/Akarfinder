import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { avitoListingId, isAvitoRealEstateListing, isAvitoUrl } from './avito-sitemap-enumerator.mjs';

export const DEFAULT_DB_PAGE_SIZE = 1000;
export const DEFAULT_MANIFEST_LIMIT = 25;
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';

export function isAvitoShardUrl(raw) {
  if (!isAvitoUrl(raw) || avitoListingId(raw)) return false;
  const url = new URL(raw);
  const pathName = decodeURIComponent(url.pathname).toLowerCase();
  return pathName.startsWith('/fr/') && (pathName.includes('/immobilier') || pathName.includes('immobilier'))
    || pathName.startsWith('/sp/immobilier/');
}

export function selectAvitoShardManifest(rows) {
  const unique = new Set();
  for (const row of rows || []) {
    const raw = String(row?.canonical_url || '').trim();
    if (isAvitoShardUrl(raw)) unique.add(raw);
  }
  return [...unique].sort((a, b) => {
    const depth = new URL(b).pathname.split('/').filter(Boolean).length - new URL(a).pathname.split('/').filter(Boolean).length;
    return depth || a.localeCompare(b);
  });
}

export function extractAvitoListingsFromHtml(html, baseUrl = 'https://www.avito.ma/') {
  const found = new Map();
  const text = String(html || '').replace(/&amp;/g, '&').replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const patterns = [
    /(?:href|data-url|data-href)\s*=\s*["']([^"']+\.htm(?:\?[^"']*)?)["']/gi,
    /https:\/\/(?:www\.)?avito\.ma\/[^\s"'<>]+\.htm(?:\?[^\s"'<>]*)?/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1] || match[0];
      try {
        const url = new URL(raw, baseUrl);
        url.hash = '';
        const canonical = url.href;
        if (!isAvitoRealEstateListing(canonical)) continue;
        const id = avitoListingId(canonical);
        if (!found.has(id)) found.set(id, canonical);
      } catch {}
    }
  }
  return [...found.values()];
}

export async function loadAvitoRowsFromSupabase({ supabaseUrl, serviceRoleKey, fetchImpl = globalThis.fetch, pageSize = DEFAULT_DB_PAGE_SIZE } = {}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase read credentials are required');
  const base = supabaseUrl.replace(/\/$/, '');
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
    url.searchParams.set('select', 'canonical_url');
    url.searchParams.set('source_domain', 'eq.avito.ma');
    url.searchParams.set('canonical_url', 'not.is.null');
    const response = await fetchImpl(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        range: `${offset}-${offset + pageSize - 1}`,
        'range-unit': 'items',
      },
    });
    if (!response.ok) throw new Error(`Supabase Avito manifest read failed: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Supabase Avito manifest response was not an array');
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { zeroDbWrites: true, sourceRowCount: rows.length, shardUrls: selectAvitoShardManifest(rows) };
}

async function fetchHtml(url, { fetchImpl, timeoutMs, userAgent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'accept-language': 'fr-MA,fr;q=0.9' },
    });
    return { status: response.status, finalUrl: response.url || url, text: await response.text() };
  } catch (error) {
    return { status: 0, finalUrl: url, text: '', error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) };
  } finally { clearTimeout(timer); }
}

export async function runAvitoShardManifest({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  manifestLimit = DEFAULT_MANIFEST_LIMIT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
} = {}) {
  const manifest = await loadAvitoRowsFromSupabase({ supabaseUrl, serviceRoleKey, fetchImpl });
  const selected = manifest.shardUrls.slice(0, manifestLimit);
  const listingById = new Map();
  const shards = [];
  let stoppedEarly = null;
  for (const shardUrl of selected) {
    const response = await fetchHtml(shardUrl, { fetchImpl, timeoutMs, userAgent });
    if (response.status === 429) {
      stoppedEarly = 'http_429';
      shards.push({ url: shardUrl, status: 429, listingCount: 0 });
      break;
    }
    const listings = response.status >= 200 && response.status < 300 ? extractAvitoListingsFromHtml(response.text, response.finalUrl) : [];
    for (const listing of listings) listingById.set(avitoListingId(listing), listing);
    shards.push({ url: shardUrl, status: response.status, finalUrl: response.finalUrl, listingCount: listings.length, ...(response.error ? { error: response.error } : {}) });
  }
  const listingUrls = [...listingById.values()];
  return {
    zeroDbWrites: true,
    sourceRowCount: manifest.sourceRowCount,
    safeShardCount: manifest.shardUrls.length,
    selectedShardCount: selected.length,
    requestCount: shards.length,
    uniqueRealEstateListingCount: listingUrls.length,
    listingUrls,
    shards,
    stoppedEarly,
  };
}

export async function runCli() {
  const limit = Number.parseInt(process.env.AVITO_MANIFEST_LIMIT || String(DEFAULT_MANIFEST_LIMIT), 10);
  const report = await runAvitoShardManifest({
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    manifestLimit: limit,
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites === true && report.safeShardCount > 0 && report.requestCount > 0 && report.stoppedEarly !== 'http_429';
  const outDir = 'artifacts/morocco-web-l8-avito-shards';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  console.log(JSON.stringify({ ...report, listingUrls: undefined, shards: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
