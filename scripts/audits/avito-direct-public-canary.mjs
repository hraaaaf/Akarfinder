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
const maxPages = Math.max(5, Math.min(120, Number(arg('max-pages', '60')) || 60));
const maxDepth = Math.max(0, Math.min(3, Number(arg('max-depth', '2')) || 2));
const outDir = arg('out-dir', 'artifacts/avito-direct-public-canary');
const UA = 'AkarFinder-public-index-audit/1.1 (+https://akarfinder.ma)';
const ORIGIN = 'https://www.avito.ma';

const seedSurfaces = [
  { url: `${ORIGIN}/`, kind: 'homepage', source: 'verified-public-root' },
  { url: `${ORIGIN}/robots.txt`, kind: 'robots', source: 'verified-public-root' },
  { url: `${ORIGIN}/sitemap.xml`, kind: 'sitemap', source: 'robots-declared' },
  { url: `${ORIGIN}/fr/maroc/immobilier`, kind: 'real-estate-entry', source: 'route-hypothesis' },
];

const state = {
  startedAt: new Date().toISOString(),
  seedSurfaces,
  sampleSize,
  concurrency,
  timeoutMs,
  maxPages,
  maxDepth,
  pages: [],
  discovered: new Map(),
  stoppedEarly: null,
};

const realEstateRx = /(immobilier|appartement|apartments?|villa|maison|terrain|bureau|commerce|magasin|local(?:[-_/]|$)|studio|duplex|riad|ferme|lotissement|residence|résidence|location|louer|vente|vendre|achat|acheter|projet[-_ ]?neuf|agence[-_ ]?immobili|promoteur|شقة|عقار|منزل|فيلا|ارض|أرض|كراء|بيع)/i;
const transactionRx = /(location|louer|rent|vente|vendre|achat|acheter|sale|كراء|بيع)/i;
const detailIdRx = /(?:[-_/])(\d{5,})(?:[/?_.-]|$)/;

function isAllowedPublicUrl(raw) {
  try {
    const u = new URL(raw, ORIGIN);
    if (u.protocol !== 'https:' || !['www.avito.ma', 'avito.ma'].includes(u.hostname)) return false;
    const p = decodeURIComponent(u.pathname).toLowerCase();
    if (/\/(?:api|login|signup|account|controlpanel|payment|delivery)(?:\/|$)/.test(p)) return false;
    return true;
  } catch { return false; }
}

function normalizeUrl(raw, base = ORIGIN) {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    if (!isAllowedPublicUrl(u.href)) return null;
    return u.href;
  } catch { return null; }
}

function stripHtml(input) {
  return String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyUrl(raw) {
  try {
    const u = new URL(raw);
    const p = decodeURIComponent(u.pathname).toLowerCase();
    const whole = `${p} ${u.search}`;
    if (p === '/robots.txt') return 'robots';
    if (/sitemap|\.xml$/.test(p)) return 'sitemap';
    if (/agence|promoteur|professionnel|boutique|vendeur|seller/.test(whole) && realEstateRx.test(whole)) return 'professional';
    if (detailIdRx.test(p) && realEstateRx.test(whole)) return 'listing-detail';
    if (/recherche|search|\?/.test(whole) && realEstateRx.test(whole)) return 'search';
    if (realEstateRx.test(whole)) return 'category-or-taxonomy';
    return 'other';
  } catch { return 'invalid'; }
}

function extractLinks(html, baseUrl) {
  const links = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeUrl(m[1], baseUrl);
    if (!url) continue;
    links.push({ url, anchor: stripHtml(m[2]).slice(0, 180) });
  }
  for (const m of html.matchAll(/https:\/\/(?:www\.)?avito\.ma\/[A-Za-z0-9À-ÿ_%?&=+.,~:@!$'()*;\/-]+/g)) {
    const url = normalizeUrl(m[0], baseUrl);
    if (url) links.push({ url, anchor: '' });
  }
  const dedup = new Map();
  for (const item of links) {
    if (!dedup.has(item.url)) dedup.set(item.url, item);
  }
  return [...dedup.values()];
}

function isRealEstateLink(link) {
  return realEstateRx.test(`${link.url} ${link.anchor}`);
}

function parseJsonLd(html) {
  const out = [];
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    try {
      const parsed = JSON.parse(m[1].trim());
      out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {}
  }
  return out;
}

function getMeta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i');
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
  return (html.match(a)?.[1] || html.match(b)?.[1] || null)?.trim() || null;
}

function extractPublicData(html, url) {
  const ld = parseJsonLd(html);
  const flat = JSON.stringify(ld);
  const text = stripHtml(html);
  const title = getMeta(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null;
  const description = getMeta(html, 'og:description') || getMeta(html, 'description') || null;
  const price = flat.match(/"price"\s*:\s*"?([0-9][0-9 .,_]*)"?/i)?.[1] || getMeta(html, 'product:price:amount') || text.match(/([0-9][0-9 .,_]{2,})\s*(?:MAD|DH|DHS)\b/i)?.[1] || null;
  const locality = flat.match(/"addressLocality"\s*:\s*"([^"]+)"/i)?.[1] || null;
  const surface = text.match(/(?:surface|superficie)[^0-9]{0,30}([0-9]{1,6}(?:[.,][0-9]+)?)\s*(?:m²|m2)/i)?.[1] || text.match(/([0-9]{1,6}(?:[.,][0-9]+)?)\s*(?:m²|m2)\b/i)?.[1] || null;
  const rooms = text.match(/([0-9]{1,2})\s*(?:pi[eè]ces?|rooms?)\b/i)?.[1] || null;
  const bedrooms = text.match(/([0-9]{1,2})\s*(?:chambres?|ch\.)\b/i)?.[1] || null;
  const bathrooms = text.match(/([0-9]{1,2})\s*(?:salles? de bains?|sdb)\b/i)?.[1] || null;
  const transaction = transactionRx.test(`${url} ${title || ''} ${description || ''}`)
    ? (`${url} ${title || ''} ${description || ''}`.match(transactionRx)?.[0] || null)
    : null;
  const listingId = (() => {
    try { return new URL(url).pathname.match(detailIdRx)?.[1] || flat.match(/"(?:sku|productID|identifier)"\s*:\s*"?(\d{5,})"?/i)?.[1] || null; }
    catch { return null; }
  })();
  const imageUrls = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\s<>]+\.(?:jpe?g|png|webp)(?:\?[^"'\s<>]*)?/gi)) imageUrls.add(m[0]);
  return {
    title,
    description: description?.slice(0, 500) || null,
    price: price?.trim() || null,
    locality,
    surface,
    rooms,
    bedrooms,
    bathrooms,
    transaction,
    listingId,
    imageCount: imageUrls.size,
    jsonLdObjects: ld.length,
  };
}

async function fetchText(url, { accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': UA,
        accept,
        'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5',
      },
    });
    const text = await res.text();
    return {
      status: res.status,
      finalUrl: res.url,
      text,
      ms: Math.round(performance.now() - t0),
      contentType: res.headers.get('content-type') || '',
    };
  } catch (error) {
    return {
      status: 0,
      finalUrl: url,
      text: '',
      ms: Math.round(performance.now() - t0),
      contentType: '',
      error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error),
    };
  } finally { clearTimeout(timer); }
}

async function runCensus() {
  const queue = seedSurfaces.map((seed) => ({ ...seed, depth: 0, discoveredFrom: null }));
  const seen = new Set();
  let stopAll = false;

  while (queue.length && state.pages.length < maxPages && !stopAll) {
    const batch = [];
    while (queue.length && batch.length < concurrency && state.pages.length + batch.length < maxPages) {
      const item = queue.shift();
      const url = normalizeUrl(item.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      batch.push({ ...item, url });
    }
    if (!batch.length) continue;

    const results = await Promise.all(batch.map(async (item) => {
      const accept = item.kind === 'sitemap' ? 'application/xml,text/xml;q=0.9,*/*;q=0.5' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
      const r = await fetchText(item.url, { accept });
      const type = classifyUrl(r.finalUrl || item.url);
      const links = r.status >= 200 && r.status < 300 && /html|xml|text/i.test(r.contentType || '') ? extractLinks(r.text, r.finalUrl || item.url) : [];
      const relatedLinks = links.filter(isRealEstateLink);
      const data = r.status >= 200 && r.status < 300 && /html/i.test(r.contentType || '') ? extractPublicData(r.text, r.finalUrl || item.url) : null;
      return {
        item,
        record: {
          url: item.url,
          finalUrl: r.finalUrl,
          seedKind: item.kind,
          seedSource: item.source,
          depth: item.depth,
          discoveredFrom: item.discoveredFrom,
          pageType: type,
          status: r.status,
          ms: r.ms,
          bytes: Buffer.byteLength(r.text),
          contentType: r.contentType,
          error: r.error || null,
          totalPublicLinks: links.length,
          realEstateLinks: relatedLinks.length,
          data,
        },
        relatedLinks,
      };
    }));

    for (const { item, record, relatedLinks } of results) {
      state.pages.push(record);
      if (record.status === 429) {
        state.stoppedEarly = `http_429:${record.url}`;
        stopAll = true;
        break;
      }

      for (const link of relatedLinks) {
        if (!state.discovered.has(link.url)) {
          state.discovered.set(link.url, {
            url: link.url,
            anchor: link.anchor,
            discoveredFrom: record.finalUrl || record.url,
            pageType: classifyUrl(link.url),
          });
        }
        if (item.depth < maxDepth && !seen.has(link.url) && queue.length < maxPages * 8) {
          queue.push({
            url: link.url,
            kind: classifyUrl(link.url),
            source: 'public-link-discovery',
            depth: item.depth + 1,
            discoveredFrom: record.finalUrl || record.url,
          });
        }
      }
    }
  }
}

function summarize() {
  const statusCounts = {};
  const typeCounts = {};
  for (const p of state.pages) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    typeCounts[p.pageType] = (typeCounts[p.pageType] || 0) + 1;
  }
  const ok = state.pages.filter((p) => p.status >= 200 && p.status < 300);
  const realEstatePages = ok.filter((p) => p.pageType !== 'other' && p.pageType !== 'robots' && p.pageType !== 'sitemap');
  const detailPages = ok.filter((p) => p.pageType === 'listing-detail');
  const ids = detailPages.map((p) => p.data?.listingId).filter(Boolean);
  const fieldCoverage = {};
  for (const field of ['title', 'description', 'price', 'locality', 'surface', 'rooms', 'bedrooms', 'bathrooms', 'transaction', 'listingId']) {
    fieldCoverage[field] = detailPages.filter((p) => p.data?.[field]).length;
  }
  return {
    startedAt: state.startedAt,
    finishedAt: new Date().toISOString(),
    seedsAttempted: seedSurfaces.length,
    pagesAttempted: state.pages.length,
    statusCounts,
    pageTypeCounts: typeCounts,
    http2xx: ok.length,
    realEstatePages2xx: realEstatePages.length,
    publicRealEstateUrlsDiscovered: state.discovered.size,
    listingDetailPages2xx: detailPages.length,
    uniqueListingIds: new Set(ids).size,
    detailFieldCoverage: fieldCoverage,
    stoppedEarly: state.stoppedEarly,
    zeroDbWrites: true,
    forbiddenInternalApiUsed: false,
    scope: [
      'public real-estate category/search/taxonomy pages',
      'public listing detail pages and public listing fields',
      'public professional/agency/promoter pages when linked from real-estate surfaces',
      'public geography/type/transaction/filter routes discoverable from those surfaces',
      'public images/structured metadata counts',
    ],
  };
}

await fs.mkdir(outDir, { recursive: true });
await runCensus();
const summary = summarize();
const discovered = [...state.discovered.values()].slice(0, sampleSize);
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify({ summary, seeds: seedSurfaces, pages: state.pages, discovered }, null, 2));
const md = `# Avito real-estate public surface census\n\n- Seeds attempted: ${summary.seedsAttempted}\n- Pages attempted: ${summary.pagesAttempted}\n- HTTP statuses: ${JSON.stringify(summary.statusCounts)}\n- Page types: ${JSON.stringify(summary.pageTypeCounts)}\n- HTTP 2xx: ${summary.http2xx}\n- Real-estate pages 2xx: ${summary.realEstatePages2xx}\n- Public real-estate URLs discovered: ${summary.publicRealEstateUrlsDiscovered}\n- Listing detail pages 2xx: ${summary.listingDetailPages2xx}\n- Unique listing IDs: ${summary.uniqueListingIds}\n- Detail fields: ${JSON.stringify(summary.detailFieldCoverage)}\n- Early stop: ${summary.stoppedEarly || 'none'}\n- DB writes: 0\n- Internal API usage: 0\n`;
await fs.writeFile(path.join(outDir, 'report.md'), md);
console.log(JSON.stringify(summary, null, 2));
if (state.pages.length === 0) process.exitCode = 2;
