import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SAROUTY_ROOT = 'https://www.sarouty.ma/sitemap_index.xml';
export const SAROUTY_HOSTS = new Set(['www.sarouty.ma', 'sarouty.ma']);
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_PROPERTY_SITEMAPS = 24;
export const DEFAULT_MAX_URLS = 20_000;
export const DEFAULT_UA = 'AkarFinder-public-index/3.0 (+https://akarfinder.ma)';

export function decodeMarkup(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(?:47|x2f);/gi, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
}

export function normalizeHttpsUrl(raw, base = SAROUTY_ROOT) {
  try {
    const u = new URL(decodeMarkup(raw).trim(), base);
    u.hash = '';
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export function extractXmlLocs(xml) {
  return [...String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeMarkup(match[1]).trim())
    .filter(Boolean);
}

export function isPropertySitemapUrl(raw) {
  const url = normalizeHttpsUrl(raw);
  if (!url) return false;
  const u = new URL(url);
  return SAROUTY_HOSTS.has(u.hostname) && /\/property_details\d*\.xml$/i.test(u.pathname);
}

export function isSaroutyListingCandidate(raw, base = SAROUTY_ROOT) {
  const url = normalizeHttpsUrl(raw, base);
  if (!url) return false;
  const u = new URL(url);
  if (!SAROUTY_HOSTS.has(u.hostname)) return false;
  if (/\.xml$/i.test(u.pathname)) return false;
  if (u.pathname === '/' || !u.pathname.trim()) return false;
  return true;
}

export function classifyFetchOutcome({ status, error, contentType = '', text = '' }) {
  if (error === 'timeout') return 'timeout';
  if (error) return 'network_error';
  if (status === 403) return 'http_403';
  if (status === 429) return 'http_429';
  if (status < 200 || status >= 300) return `http_${status || 0}`;
  if (!/<(?:urlset|sitemapindex)\b/i.test(text)) return 'schema_drift';
  if (contentType && !/(?:xml|text\/plain|octet-stream)/i.test(contentType)) return 'schema_drift';
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
        accept: 'application/xml,text/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
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

export async function discoverSaroutyPublicListings({
  fetchImpl = globalThis.fetch,
  rootUrl = SAROUTY_ROOT,
  maxPropertySitemaps = DEFAULT_MAX_PROPERTY_SITEMAPS,
  maxUrls = DEFAULT_MAX_URLS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const requests = [];
  const urls = new Set();
  let stoppedEarly = null;

  const record = (url, role, response) => {
    const classification = classifyFetchOutcome(response);
    requests.push({
      url,
      role,
      status: response.status,
      finalUrl: response.finalUrl,
      contentType: response.contentType,
      bytes: Buffer.byteLength(response.text || ''),
      classification,
      ...(response.error ? { error: response.error } : {}),
    });
    return classification;
  };

  const root = await fetchText(rootUrl, { fetchImpl, timeoutMs, userAgent });
  const rootClass = record(rootUrl, 'sitemap-index', root);
  if (rootClass !== 'ok') {
    return { urls: [], requests, stoppedEarly: rootClass, childSitemaps: [], zeroDbWrites: true };
  }

  const childSitemaps = extractXmlLocs(root.text)
    .map((raw) => normalizeHttpsUrl(raw, rootUrl))
    .filter(Boolean)
    .filter(isPropertySitemapUrl)
    .slice(0, maxPropertySitemaps);

  if (childSitemaps.length === 0) {
    return { urls: [], requests, stoppedEarly: 'schema_drift:no_property_sitemaps', childSitemaps: [], zeroDbWrites: true };
  }

  for (const sitemap of childSitemaps) {
    const response = await fetchText(sitemap, { fetchImpl, timeoutMs, userAgent });
    const classification = record(sitemap, 'property-sitemap', response);
    if (classification === 'http_429') {
      stoppedEarly = 'http_429';
      break;
    }
    if (classification !== 'ok') continue;

    for (const raw of extractXmlLocs(response.text)) {
      const normalized = normalizeHttpsUrl(raw, sitemap);
      if (!normalized || !isSaroutyListingCandidate(normalized, sitemap)) continue;
      urls.add(normalized);
      if (urls.size >= maxUrls) break;
    }
    if (urls.size >= maxUrls) break;
  }

  return {
    urls: [...urls],
    requests,
    stoppedEarly,
    childSitemaps,
    zeroDbWrites: true,
  };
}

export async function runSaroutyCli() {
  const result = await discoverSaroutyPublicListings();
  const report = {
    source: 'sarouty',
    startedAt: new Date().toISOString(),
    discoveredUrlCount: result.urls.length,
    childSitemapCount: result.childSitemaps.length,
    stoppedEarly: result.stoppedEarly,
    zeroDbWrites: result.zeroDbWrites,
    requests: result.requests,
    sample: result.urls.slice(0, 50),
  };
  report.success = report.discoveredUrlCount > 0 && report.zeroDbWrites && report.stoppedEarly !== 'http_429';

  const outDir = 'artifacts/morocco-web-l2-sarouty';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# L2 Sarouty Public Adapter',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Candidate URLs: **${report.discoveredUrlCount}**`,
    `- Property sitemaps: **${report.childSitemapCount}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    ...report.requests.map((r) => `- ${r.classification} — ${r.status} — ${r.url}`),
  ].join('\n'));

  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runSaroutyCli();
}
