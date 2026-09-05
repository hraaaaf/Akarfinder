import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_UA = 'AkarFinder-public-index/4.0 (+https://akarfinder.ma)';
export const DEFAULT_MAX_REQUESTS = 40;
export const DEFAULT_MAX_DEPTH = 4;
export const DEFAULT_REQUEST_DELAY_MS = 0;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const pathname = url.pathname;
  const robotsPath = pathname.replace(/^\/(?:fr|en|ar|es|nl|it)(?=\/)/i, '');
  if (DISALLOWED_PREFIXES.some((prefix) => robotsPath === prefix || robotsPath.startsWith(prefix))) return false;
  if (pathname.includes(':')) return false;
  if (url.searchParams.get('n') === '1') return false;
  return true;
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

function listingIdFromUrl(raw) {
  const normalized = normalizeMubawabUrl(raw);
  if (!normalized) return null;
  return new URL(normalized).pathname.match(LISTING_PATH)?.[1] || null;
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
      redirect: 'follow',
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
  requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) throw new TypeError('requestDelayMs must be a non-negative number');
  const queue = roots.map((url) => ({ url: normalizeMubawabUrl(url), depth: 0 })).filter((item) => item.url && isRobotsSafeUrl(item.url));
  const queued = new Set(queue.map((item) => item.url));
  const visited = new Set();
  const listingById = new Map();
  const shards = [];
  let stoppedEarly = null;
  let lastRequestStartedAt = 0;

  while (queue.length > 0 && shards.length < maxRequests) {
    const item = queue.shift();
    if (!item || visited.has(item.url)) continue;
    visited.add(item.url);

    if (lastRequestStartedAt > 0 && requestDelayMs > 0) {
      const remaining = requestDelayMs - (Date.now() - lastRequestStartedAt);
      if (remaining > 0) await sleep(remaining);
    }
    lastRequestStartedAt = Date.now();

    const response = await fetchText(item.url, { fetchImpl, timeoutMs, userAgent });
    const fetchState = classifyFetch(response);
    if (fetchState === 'http_429') {
      stoppedEarly = 'http_429';
      break;
    }
    if (fetchState !== 'ok') {
      shards.push({
        url: item.url,
        depth: item.depth,
        fetchState,
        listingIds: [],
        listingUrls: [],
        reconciliation: reconcileShard({ url: item.url, expectedCount: null, listingUrls: [], childUrls: [] }),
      });
      continue;
    }

    const listings = extractListingUrls(response.text, response.finalUrl);
    const listingIds = listings.map(listingIdFromUrl).filter(Boolean);
    for (const listing of listings) {
      const id = listingIdFromUrl(listing);
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
      listingIds,
      listingUrls: listings,
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
    requestDelayMs,
    stoppedEarly,
    queueRemaining: queue.length,
    shards,
    listingUrls,
  };
}

export async function runCli() {
  const maxRequests = Number.parseInt(process.env.MUBAWAB_MAX_REQUESTS || String(DEFAULT_MAX_REQUESTS), 10);
  const requestDelayMs = Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS || String(DEFAULT_REQUEST_DELAY_MS), 10);
  const report = await enumerateMubawab({ maxRequests, requestDelayMs });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites && report.stoppedEarly !== 'http_429' && report.requestCount > 0;

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
    `- Request delay: **${report.requestDelayMs} ms**`,
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
    '- Request starts are paced by the configured floor.',
    '- 429 stops the run immediately.',
    '- No credentials against Mubawab, CAPTCHA bypass, private API, proxy evasion or DB writes.',
  ].join('\n'));
  console.log(JSON.stringify({ ...report, listingUrls: undefined, shards: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
