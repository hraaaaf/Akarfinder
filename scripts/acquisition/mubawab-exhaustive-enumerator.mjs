import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';
export const DEFAULT_MAX_REQUESTS = 40;
export const DEFAULT_DELAY_MS = 2500;
export const DEFAULT_MAX_DEPTH = 4;
export const DEFAULT_ROOTS = [
  'https://www.mubawab.ma/fr/cc/immobilier-a-vendre',
  'https://www.mubawab.ma/fr/cc/immobilier-a-louer',
  'https://www.mubawab.ma/fr/cc/immobilier-vacational',
];

const HOSTS = new Set(['mubawab.ma', 'www.mubawab.ma']);
const DISALLOWED_PREFIXES = ['/login', '/cms/', '/ads/b/', '/report-inappropriate'];
const SHARD_PATH = /^\/fr\/(cc|ct|cd|sd)\/[^?#]+$/i;
const LISTING_PATH = /^\/fr\/(?:a|pa)\/(\d+)(?:\/|$)/i;
const RESULT_COUNT_RE = /\(([0-9][0-9\s\u00a0\u202f.,]*)\s+r[ée]sultats?\)/iu;

function decodeMarkup(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(?:47|x2f);/gi, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
}

export function normalizeMubawabUrl(raw, base = 'https://www.mubawab.ma/') {
  try {
    const url = new URL(decodeMarkup(raw).trim(), base);
    if (url.protocol !== 'https:' || !HOSTS.has(url.hostname.toLowerCase())) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function isRobotsSafeUrl(raw) {
  const normalized = normalizeMubawabUrl(raw);
  if (!normalized) return false;
  const url = new URL(normalized);
  // Decode before applying fail-closed guards so encoded colon pagination and
  // invalid percent escapes cannot turn into a bypass.
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return false; }
  const robotsPath = pathname.replace(/^\/(?:fr|en|ar|es|nl|it)(?=\/)/i, '').replace(/\/{2,}/g, '/').toLowerCase();
  if (DISALLOWED_PREFIXES.some((prefix) => robotsPath === prefix || robotsPath.startsWith(prefix))) return false;
  // Cached conservative deny list; never use it as a replacement for a fresh
  // robots.txt check before any real HTTP acquisition.
  if (pathname.includes(':')) return false;
  if (url.searchParams.get('n') === '1') return false;
  return true;
}


const ROBOTS_URL = 'https://www.mubawab.ma/robots.txt';
const KNOWN_GENERIC_DISALLOWS = new Set([
  '/login', '/*/login', '/cms/', '/*/cms/', '/ads/b/', '/*/ads/b/',
  '/report-inappropriate', '/*/report-inappropriate', '/*:', '/*?n=1',
]);

// Conservative snapshot gate, not a generic robots parser: if site rules
// change, stop rather than risk interpreting new directives incorrectly.
export function verifyMubawabRobots(text, userAgent = DEFAULT_UA) {
  if (!/^AkarFinder-public-index\//i.test(userAgent)) return null;
  if (typeof text !== 'string' || !text.trim() || text.length > 256_000) return null;
  const match = /^User-agent:\s*\*\s*$/im.exec(text);
  if (!match) return null;
  const block = text.slice(match.index + match[0].length).split(/\n(?=User-agent:)/i)[0];
  const disallows = [];
  let crawlDelay = 0;
  for (const original of block.split(/\r?\n/)) {
    const line = original.split('#', 1)[0].trim();
    if (!line) continue;
    const parsed = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!parsed) return null;
    const [, key, raw] = parsed;
    const value = raw.trim();
    if (key.toLowerCase() === 'disallow') disallows.push(value);
    else if (key.toLowerCase() === 'crawl-delay') {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return null;
      crawlDelay = Math.max(crawlDelay, number);
    } else if (key.toLowerCase() !== 'allow' && key.toLowerCase() !== 'sitemap') {
      // Unexpected directive: fail closed until reviewed.
      return null;
    }
  }
  if (!disallows.includes('/*:') || !disallows.includes('/*?n=1')) return null;
  if (disallows.some((rule) => !KNOWN_GENERIC_DISALLOWS.has(rule))) return null;
  return { crawlDelayMs: Math.ceil(crawlDelay * 1000), verified: true };
}

export function parseResultCount(html) {
  const text = decodeMarkup(html).replace(/<[^>]*>/g, ' ');
  const match = text.match(RESULT_COUNT_RE);
  if (!match) return null;
  const digits = match[1].replace(/[^0-9]/g, '');
  return digits ? Number.parseInt(digits, 10) : null;
}

function extractRefs(html) {
  const text = decodeMarkup(html);
  const refs = new Set();
  for (const match of text.matchAll(/(?:href|data-url|data-href|data-link|data-target)\s*=\s*["']([^"']+)["']/gi)) refs.add(match[1]);
  for (const match of text.matchAll(/https:\/\/[^\s"'<>]+/gi)) refs.add(match[0]);
  return [...refs];
}

export function extractListingUrls(html, base = 'https://www.mubawab.ma/') {
  const byId = new Map();
  for (const raw of extractRefs(html)) {
    const normalized = normalizeMubawabUrl(raw, base);
    if (!normalized || !isRobotsSafeUrl(normalized)) continue;
    const match = new URL(normalized).pathname.match(LISTING_PATH);
    if (!match) continue;
    if (!byId.has(match[1])) byId.set(match[1], normalized);
  }
  return [...byId.values()];
}

export function shardKind(raw) {
  const normalized = normalizeMubawabUrl(raw);
  if (!normalized) return null;
  const match = new URL(normalized).pathname.match(SHARD_PATH);
  return match?.[1]?.toLowerCase() || null;
}

export function shardRank(raw) {
  const kind = shardKind(raw);
  return { cc: 0, ct: 1, cd: 2, sd: 3 }[kind] ?? -1;
}

function intentToken(raw) {
  const normalized = normalizeMubawabUrl(raw);
  if (!normalized) return null;
  const path = new URL(normalized).pathname.toLowerCase();
  if (path.includes('immobilier-a-vendre') || path.includes('a-vendre')) return 'sale';
  if (path.includes('immobilier-a-louer') || path.includes('a-louer')) return 'rent';
  if (path.includes('vacational') || path.includes('vacances')) return 'vacation';
  return null;
}

export function extractChildShardUrls(html, currentUrl) {
  const current = normalizeMubawabUrl(currentUrl);
  if (!current) return [];
  const currentRank = shardRank(current);
  const currentIntent = intentToken(current);
  const out = new Set();
  for (const raw of extractRefs(html)) {
    const normalized = normalizeMubawabUrl(raw, current);
    if (!normalized || !isRobotsSafeUrl(normalized)) continue;
    if (!SHARD_PATH.test(new URL(normalized).pathname)) continue;
    if (shardRank(normalized) <= currentRank) continue;
    const childIntent = intentToken(normalized);
    if (currentIntent && childIntent && currentIntent !== childIntent) continue;
    out.add(normalized);
  }
  return [...out].sort();
}

export function reconcileShard({ url, expectedCount, listingUrls, childUrls }) {
  const observed = new Set(listingUrls).size;
  const expected = Number.isInteger(expectedCount) ? expectedCount : null;
  let state = 'unknown-count';
  if (expected !== null && expected === observed) state = 'complete-leaf';
  else if (expected !== null && expected < observed) state = 'counter-drift';
  else if (childUrls.length > 0) state = 'split-required';
  else if (expected !== null && expected > observed) state = 'coverage-gap';
  return {
    url,
    expectedCount: expected,
    observedListingCount: observed,
    childShardCount: childUrls.length,
    state,
    deficit: expected === null ? null : Math.max(0, expected - observed),
  };
}

export function summarizeEnumeration(shards, listingUrls) {
  const counts = {};
  for (const shard of shards) counts[shard.reconciliation.state] = (counts[shard.reconciliation.state] || 0) + 1;
  const rootExpected = shards.filter((item) => item.depth === 0 && Number.isInteger(item.reconciliation.expectedCount))
    .reduce((sum, item) => sum + item.reconciliation.expectedCount, 0);
  return {
    zeroDbWrites: true,
    requestCount: shards.length,
    uniqueListingUrlCount: listingUrls.length,
    rootExpectedCount: rootExpected,
    reconciliationGap: rootExpected > 0 ? Math.max(0, rootExpected - listingUrls.length) : null,
    shardStates: counts,
  };
}

function classifyFetch({ status, error, contentType = '', text = '' }) {
  if (error === 'timeout') return 'timeout';
  if (error) return 'network_error';
  if (status === 429) return 'http_429';
  if (status === 403) return 'http_403';
  if (status < 200 || status >= 300) return `http_${status || 0}`;
  if (contentType && !/html/i.test(contentType)) return 'schema_drift';
  if (!String(text).trim()) return 'schema_drift';
  return 'ok';
}

async function fetchText(url, { fetchImpl, timeoutMs, userAgent }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'accept-language': 'fr-MA,fr;q=0.9,en;q=0.5',
      },
    });
    return {
      status: response.status,
      finalUrl: response.url || url,
      contentType: response.headers?.get?.('content-type') || '',
      text: await response.text(),
    };
  } catch (error) {
    return { status: 0, finalUrl: url, contentType: '', text: '', error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function enumerateMubawab({
  roots = DEFAULT_ROOTS,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  userAgent = DEFAULT_UA,
  maxRequests = DEFAULT_MAX_REQUESTS,
  maxDepth = DEFAULT_MAX_DEPTH,
  delayMs = DEFAULT_DELAY_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  // Fail closed for default (real network) consumers, not just the CLI.
  // Offline tests inject their own fake fetch. This flag is merely an operator
  // acknowledgment; a documented license/authorization is still required.
  if (fetchImpl === globalThis.fetch && process.env.MUBAWAB_AUTHORIZED_ACCESS !== 'yes') {
    return {
      ...summarizeEnumeration([], []),
      requestCount: 0, robotsRequestCount: 0, coverageCertified: false,
      stoppedEarly: 'authorization_missing', queueRemaining: roots.length,
      shards: [], listingUrls: [],
    };
  }
  const queue = roots.map((url) => ({ url: normalizeMubawabUrl(url), depth: 0 })).filter((item) => item.url && isRobotsSafeUrl(item.url));
  const queued = new Set(queue.map((item) => item.url));
  const visited = new Set();
  const listingById = new Map();
  const shards = [];
  let stoppedEarly = null;
  let requestCount = 0;
  // Every run verifies the current public robots document first. Unknown or
  // changed rules fail closed; no listing/shard HTTP request is sent.
  const robotsResponse = await fetchText(ROBOTS_URL, { fetchImpl, timeoutMs, userAgent });
  const robotsPolicy = robotsResponse.status === 200 && robotsResponse.finalUrl === ROBOTS_URL
    ? verifyMubawabRobots(robotsResponse.text, userAgent)
    : null;
  if (!robotsPolicy) {
    return {
      ...summarizeEnumeration([], []),
      requestCount: 0, robotsRequestCount: 1, coverageCertified: false,
      stoppedEarly: 'robots_unverified', queueRemaining: queue.length,
      shards: [], listingUrls: [],
    };
  }
  // Live fetch cannot disable the minimal delay through caller configuration.
  const effectiveDelayMs = fetchImpl === globalThis.fetch
    ? Math.max(2000, delayMs, robotsPolicy.crawlDelayMs)
    : Math.max(0, delayMs, robotsPolicy.crawlDelayMs);
  let lastRequestAt = Date.now();

  while (queue.length > 0 && requestCount < maxRequests) {
    const item = queue.shift();
    if (!item || visited.has(item.url)) continue;
    visited.add(item.url);

    if (lastRequestAt !== null) {
      const remainingMs = effectiveDelayMs - (Date.now() - lastRequestAt);
      if (remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }
    lastRequestAt = Date.now();
    requestCount += 1;
    const response = await fetchText(item.url, { fetchImpl, timeoutMs, userAgent });
    const fetchState = classifyFetch(response);
    if (fetchState === 'http_429' || fetchState === 'http_403') {
      stoppedEarly = fetchState;
      shards.push({ url: item.url, depth: item.depth, fetchState, reconciliation: reconcileShard({ url: item.url, expectedCount: null, listingUrls: [], childUrls: [] }) });
      break;
    }
    if (fetchState !== 'ok') {
      shards.push({ url: item.url, depth: item.depth, fetchState, reconciliation: reconcileShard({ url: item.url, expectedCount: null, listingUrls: [], childUrls: [] }) });
      continue;
    }

    const listings = extractListingUrls(response.text, response.finalUrl);
    for (const listing of listings) {
      const id = new URL(listing).pathname.match(LISTING_PATH)?.[1];
      if (id && !listingById.has(id)) listingById.set(id, listing);
    }

    const children = item.depth < maxDepth ? extractChildShardUrls(response.text, response.finalUrl) : [];
    const expectedCount = parseResultCount(response.text);
    const reconciliation = reconcileShard({ url: item.url, expectedCount, listingUrls: listings, childUrls: children });
    shards.push({
      url: item.url,
      finalUrl: response.finalUrl,
      depth: item.depth,
      fetchState,
      listingCount: listings.length,
      childShardCount: children.length,
      reconciliation,
    });

    if (reconciliation.state === 'split-required') {
      for (const child of children) {
        if (!visited.has(child) && !queued.has(child)) {
          queued.add(child);
          queue.push({ url: child, depth: item.depth + 1 });
        }
      }
    }
  }

  const listingUrls = [...listingById.values()];
  return {
    ...summarizeEnumeration(shards, listingUrls),
    requestCount,
    robotsRequestCount: 1,
    coverageCertified: false,
    stoppedEarly,
    queueRemaining: queue.length,
    shards,
    listingUrls,
  };
}

export async function runCli() {
  // An explicit operator-controlled gate is required in addition to robots.txt.
  // This switch is not a license; authorization must be documented externally.
  if (process.env.MUBAWAB_AUTHORIZED_ACCESS !== 'yes') {
    console.error('Mubawab live acquisition disabled: documented commercial access authorization required.');
    process.exitCode = 2;
    return;
  }
  const maxRequests = Number.parseInt(process.env.MUBAWAB_MAX_REQUESTS || String(DEFAULT_MAX_REQUESTS), 10);
  const report = await enumerateMubawab({ maxRequests });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites && !report.stoppedEarly && report.requestCount > 0;

  const outDir = 'artifacts/morocco-web-l8-mubawab-exhaustive';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# Morocco Web L8 — Mubawab Exhaustive Enumerator',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Requests: **${report.requestCount}**`,
    `- Root expected count: **${report.rootExpectedCount}**`,
    `- Unique listing URLs: **${report.uniqueListingUrlCount}**`,
    `- Reconciliation gap: **${report.reconciliationGap}**`,
    `- Queue remaining: **${report.queueRemaining}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    `- Shard states: **${JSON.stringify(report.shardStates)}**`,
    '',
    '## Safety',
    '- Public HTTPS pages only.',
    '- Legacy colon pagination is rejected by robots safety guard.',
    '- 429 stops the run immediately.',
    '- No credentials, CAPTCHA bypass, private API, proxy evasion or DB writes.',
  ].join('\n'));
  console.log(JSON.stringify({ ...report, listingUrls: undefined, shards: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
