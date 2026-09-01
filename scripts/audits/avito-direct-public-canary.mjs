import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const sampleSize = Math.max(1, Math.min(500, Number(arg('sample', '100')) || 100));
const concurrency = Math.max(1, Math.min(4, Number(arg('concurrency', '2')) || 2));
const timeoutMs = Math.max(3000, Math.min(30000, Number(arg('timeout-ms', '12000')) || 12000));
const maxSitemaps = Math.max(1, Math.min(100, Number(arg('max-sitemaps', '40')) || 40));
const outDir = arg('out-dir', 'artifacts/avito-direct-public-canary');
const rootSitemap = 'https://www.avito.ma/sitemap.xml';
const UA = 'AkarFinder-public-index-audit/1.0 (+https://akarfinder.ma)';

const state = {
  startedAt: new Date().toISOString(),
  rootSitemap,
  sampleSize,
  concurrency,
  timeoutMs,
  maxSitemaps,
  sitemapDocs: [],
  discoveredUrls: 0,
  candidateUrls: 0,
  sampledUrls: [],
  pages: [],
  stoppedEarly: null,
};

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((m) => m[1].replaceAll('&amp;', '&').trim())
    .filter(Boolean);
}

function isSamePublicHost(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && (u.hostname === 'www.avito.ma' || u.hostname === 'avito.ma');
  } catch { return false; }
}

function isSitemapUrl(raw) {
  try { return /(?:sitemap|\.xml(?:$|\?))/i.test(new URL(raw).pathname); }
  catch { return false; }
}

function isLikelyRealEstateDetail(raw) {
  try {
    const u = new URL(raw);
    const p = decodeURIComponent(u.pathname).toLowerCase();
    if (!isSamePublicHost(raw)) return false;
    if (/\/(?:api|login|signup|account|help|blog)(?:\/|$)/.test(p)) return false;
    const realEstateHint = /(immobilier|appartement|villa|riad|maison|terrain|bureau|commerce|magasin|local|studio|duplex|ferme)/.test(p);
    const idHint = /(?:[-_/]\d{5,})(?:[/?_-]|$)/.test(p) || /_[0-9]{5,}(?:\.htm|\/|$)/.test(p);
    return realEstateHint && idHint;
  } catch { return false; }
}

async function fetchText(url, { accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept, 'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5' },
    });
    const text = await res.text();
    return { status: res.status, finalUrl: res.url, text, ms: Math.round(performance.now() - t0), contentType: res.headers.get('content-type') || '' };
  } catch (error) {
    return { status: 0, finalUrl: url, text: '', ms: Math.round(performance.now() - t0), error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) };
  } finally { clearTimeout(timer); }
}

async function discoverFromSitemaps() {
  const queue = [rootSitemap];
  const seenSitemaps = new Set();
  const urls = new Set();
  while (queue.length && seenSitemaps.size < maxSitemaps) {
    const sitemapUrl = queue.shift();
    if (seenSitemaps.has(sitemapUrl) || !isSamePublicHost(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);
    const r = await fetchText(sitemapUrl, { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' });
    state.sitemapDocs.push({ url: sitemapUrl, status: r.status, ms: r.ms, contentType: r.contentType, bytes: Buffer.byteLength(r.text), error: r.error || null });
    if (r.status === 403 || r.status === 429) {
      state.stoppedEarly = `sitemap_http_${r.status}`;
      break;
    }
    if (r.status < 200 || r.status >= 300) continue;
    for (const loc of extractLocs(r.text)) {
      if (!isSamePublicHost(loc)) continue;
      if (isSitemapUrl(loc)) {
        if (!seenSitemaps.has(loc)) queue.push(loc);
      } else {
        urls.add(loc);
      }
    }
  }
  return [...urls];
}

function extractPublicFields(html, url) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  const ld = [];
  for (const s of scripts) {
    try { const parsed = JSON.parse(s); ld.push(...(Array.isArray(parsed) ? parsed : [parsed])); } catch {}
  }
  const flat = JSON.stringify(ld);
  const getMeta = (key) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
    return (html.match(re1)?.[1] || html.match(re2)?.[1] || null)?.trim() || null;
  };
  const price = flat.match(/"price"\s*:\s*"?([0-9][0-9 .,_]*)"?/i)?.[1] || getMeta('product:price:amount');
  const title = getMeta('og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null;
  const locality = flat.match(/"addressLocality"\s*:\s*"([^"]+)"/i)?.[1] || null;
  const surface = html.match(/(?:surface|superficie)[^0-9]{0,30}([0-9]{1,6}(?:[.,][0-9]+)?)\s*(?:m²|m2)/i)?.[1] || null;
  let listingId = null;
  try {
    const p = new URL(url).pathname;
    listingId = p.match(/(?:[-_/])(\d{5,})(?:[/?_.-]|$)/)?.[1] || null;
  } catch {}
  return { title, price: price?.trim() || null, locality, surface, listingId, jsonLdObjects: ld.length };
}

async function mapLimit(items, limit, fn) {
  const result = new Array(items.length);
  let cursor = 0;
  let hardStop = false;
  async function worker() {
    while (!hardStop) {
      const i = cursor++;
      if (i >= items.length) return;
      const value = await fn(items[i], i);
      result[i] = value;
      if (value?.status === 403 || value?.status === 429) {
        hardStop = true;
        state.stoppedEarly = `detail_http_${value.status}`;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return result.filter(Boolean);
}

function summarize() {
  const statusCounts = {};
  for (const p of state.pages) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  const ok = state.pages.filter((p) => p.status >= 200 && p.status < 300);
  const withField = (k) => ok.filter((p) => p.fields?.[k]).length;
  const ids = ok.map((p) => p.fields?.listingId).filter(Boolean);
  return {
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString(),
    rootSitemap,
    sitemapDocumentsAttempted: state.sitemapDocs.length,
    sitemapStatusCounts: Object.fromEntries(Object.entries(state.sitemapDocs.reduce((a, x) => ((a[x.status] = (a[x.status] || 0) + 1), a), {}))),
    discoveredUrls: state.discoveredUrls,
    candidateUrls: state.candidateUrls,
    sampled: state.pages.length,
    statusCounts,
    http2xx: ok.length,
    uniqueListingIds: new Set(ids).size,
    extraction: {
      title: withField('title'), price: withField('price'), locality: withField('locality'), surface: withField('surface'), listingId: withField('listingId'),
    },
    stoppedEarly: state.stoppedEarly,
    zeroDbWrites: true,
    forbiddenInternalApiUsed: false,
  };
}

await fs.mkdir(outDir, { recursive: true });
const allUrls = await discoverFromSitemaps();
state.discoveredUrls = allUrls.length;
const candidates = allUrls.filter(isLikelyRealEstateDetail);
state.candidateUrls = candidates.length;
state.sampledUrls = candidates.slice(0, sampleSize);
if (!state.stoppedEarly) {
  state.pages = await mapLimit(state.sampledUrls, concurrency, async (url) => {
    const r = await fetchText(url);
    return { url, status: r.status, finalUrl: r.finalUrl, ms: r.ms, bytes: Buffer.byteLength(r.text), contentType: r.contentType || null, error: r.error || null, fields: r.status >= 200 && r.status < 300 ? extractPublicFields(r.text, r.finalUrl) : null };
  });
}
const summary = summarize();
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify({ summary, sitemapDocs: state.sitemapDocs, pages: state.pages }, null, 2));
const md = `# Avito direct public acquisition canary\n\n- Root sitemap: ${rootSitemap}\n- Sitemap docs attempted: ${summary.sitemapDocumentsAttempted}\n- Discovered public URLs: ${summary.discoveredUrls}\n- Likely real-estate detail candidates: ${summary.candidateUrls}\n- Detail pages sampled: ${summary.sampled}\n- HTTP 2xx: ${summary.http2xx}\n- Statuses: ${JSON.stringify(summary.statusCounts)}\n- Unique listing IDs: ${summary.uniqueListingIds}\n- Fields (2xx only): ${JSON.stringify(summary.extraction)}\n- Early stop: ${summary.stoppedEarly || 'none'}\n- DB writes: 0\n- Internal API usage: 0\n`;
await fs.writeFile(path.join(outDir, 'report.md'), md);
console.log(JSON.stringify(summary, null, 2));
if (state.sitemapDocs.length === 0) process.exitCode = 2;
