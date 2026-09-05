import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  enumerateMubawab,
  isRobotsSafeUrl,
  normalizeMubawabUrl,
  shardKind,
  shardRank,
} from './mubawab-exhaustive-enumerator.mjs';

export const DEFAULT_DB_PAGE_SIZE = 1000;
export const DEFAULT_MANIFEST_LIMIT = 50;
export const DEFAULT_REQUEST_DELAY_MS = 2750;

function shardKey(raw) {
  const normalized = normalizeMubawabUrl(raw);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.hostname = 'www.mubawab.ma';
  return url.href;
}

export function selectSafeShardManifest(rows) {
  const unique = new Map();
  for (const row of rows || []) {
    const normalized = normalizeMubawabUrl(row?.canonical_url || '');
    if (!normalized || !isRobotsSafeUrl(normalized) || !shardKind(normalized)) continue;
    unique.set(shardKey(normalized), normalized);
  }
  return [...unique.values()].sort((a, b) => {
    const rankDiff = shardRank(b) - shardRank(a);
    return rankDiff || a.localeCompare(b);
  });
}

export function checkpointFromReport(report = {}) {
  const completed = new Map();
  const listingIds = new Set();

  for (const raw of report?.checkpoint?.completedShardUrls || []) {
    const key = shardKey(raw);
    if (key) completed.set(key, normalizeMubawabUrl(raw));
  }
  for (const id of report?.checkpoint?.listingIds || []) {
    if (/^\d+$/.test(String(id))) listingIds.add(String(id));
  }
  for (const shard of report?.shards || []) {
    if (shard?.fetchState !== 'ok') continue;
    const key = shardKey(shard.url);
    if (key) completed.set(key, normalizeMubawabUrl(shard.url));
    for (const id of shard?.listingIds || []) {
      if (/^\d+$/.test(String(id))) listingIds.add(String(id));
    }
  }

  return {
    completedShardUrls: [...completed.values()].filter(Boolean),
    listingIds: [...listingIds].sort((a, b) => Number(a) - Number(b)),
  };
}

export async function loadCheckpointReport(filePath) {
  if (!filePath) return { completedShardUrls: [], listingIds: [] };
  const report = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return checkpointFromReport(report);
}

export async function loadMubawabShardManifestFromSupabase({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  pageSize = DEFAULT_DB_PAGE_SIZE,
} = {}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase read credentials are required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const base = supabaseUrl.replace(/\/$/, '');
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
    url.searchParams.set('select', 'canonical_url');
    url.searchParams.set('source_domain', 'eq.mubawab.ma');
    url.searchParams.set('canonical_url', 'not.is.null');
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));
    const response = await fetchImpl(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase manifest read failed: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Supabase manifest response was not an array');
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return {
    zeroDbWrites: true,
    sourceRowCount: rows.length,
    shardUrls: selectSafeShardManifest(rows),
  };
}

export async function runShardManifest({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  manifestLimit = DEFAULT_MANIFEST_LIMIT,
  maxRequests = manifestLimit,
  requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
  checkpoint = { completedShardUrls: [], listingIds: [] },
} = {}) {
  const manifest = await loadMubawabShardManifestFromSupabase({ supabaseUrl, serviceRoleKey, fetchImpl });
  const targets = manifest.shardUrls.slice(0, manifestLimit);
  const targetKeys = new Set(targets.map(shardKey));
  const completedBefore = new Map();
  for (const raw of checkpoint.completedShardUrls || []) {
    const key = shardKey(raw);
    if (key && targetKeys.has(key)) completedBefore.set(key, normalizeMubawabUrl(raw));
  }
  const previousIds = new Set((checkpoint.listingIds || []).map(String).filter((id) => /^\d+$/.test(id)));
  const roots = targets.filter((url) => !completedBefore.has(shardKey(url)));

  const enumeration = roots.length > 0
    ? await enumerateMubawab({ roots, fetchImpl, maxRequests, maxDepth: 0, requestDelayMs })
    : {
        zeroDbWrites: true,
        requestCount: 0,
        uniqueListingUrlCount: 0,
        rootExpectedCount: 0,
        reconciliationGap: null,
        shardStates: {},
        requestDelayMs,
        stoppedEarly: null,
        queueRemaining: 0,
        shards: [],
        listingUrls: [],
      };

  const completed = new Map(completedBefore);
  const aggregateIds = new Set(previousIds);
  for (const shard of enumeration.shards || []) {
    if (shard.fetchState !== 'ok') continue;
    const key = shardKey(shard.url);
    if (key && targetKeys.has(key)) completed.set(key, normalizeMubawabUrl(shard.url));
    for (const id of shard.listingIds || []) aggregateIds.add(String(id));
  }

  const checkpointNext = {
    completedShardUrls: [...completed.values()].filter(Boolean),
    listingIds: [...aggregateIds].sort((a, b) => Number(a) - Number(b)),
  };

  return {
    ...enumeration,
    zeroDbWrites: true,
    sourceRowCount: manifest.sourceRowCount,
    safeShardCount: manifest.shardUrls.length,
    targetShardCount: targets.length,
    previousCompletedShardCount: completedBefore.size,
    selectedShardCount: roots.length,
    currentCompletedShardCount: (enumeration.shards || []).filter((s) => s.fetchState === 'ok').length,
    totalCompletedShardCount: completed.size,
    remainingShardCount: Math.max(0, targets.length - completed.size),
    aggregatedUniqueListingIdCount: aggregateIds.size,
    checkpoint: checkpointNext,
  };
}

export async function runCli() {
  const manifestLimit = Number.parseInt(process.env.MUBAWAB_MANIFEST_LIMIT || String(DEFAULT_MANIFEST_LIMIT), 10);
  const maxRequests = Number.parseInt(process.env.MUBAWAB_MAX_REQUESTS || String(manifestLimit), 10);
  const requestDelayMs = Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS || String(DEFAULT_REQUEST_DELAY_MS), 10);
  const checkpoint = await loadCheckpointReport(process.env.MUBAWAB_CHECKPOINT_REPORT || '');
  const report = await runShardManifest({
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    manifestLimit,
    maxRequests,
    requestDelayMs,
    checkpoint,
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites
    && report.targetShardCount > 0
    && report.totalCompletedShardCount === report.targetShardCount
    && report.remainingShardCount === 0
    && report.stoppedEarly === null;

  const outDir = 'artifacts/morocco-web-l8-mubawab-manifest';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'listing-ids.txt'), `${report.checkpoint.listingIds.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# Morocco Web L8 — Mubawab Supabase Shard Manifest Replay',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Robots-safe target shards: **${report.targetShardCount}**`,
    `- Completed before this run: **${report.previousCompletedShardCount}**`,
    `- Selected remaining shards: **${report.selectedShardCount}**`,
    `- Completed this run: **${report.currentCompletedShardCount}**`,
    `- Total completed shards: **${report.totalCompletedShardCount}**`,
    `- Remaining shards: **${report.remainingShardCount}**`,
    `- HTTP requests this run: **${report.requestCount}**`,
    `- Request delay: **${report.requestDelayMs} ms**`,
    `- Aggregated unique listing IDs: **${report.aggregatedUniqueListingIdCount}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    '## Contract',
    '- Supabase access is read-only.',
    '- Only public robots-safe Mubawab shard URLs are fetched.',
    '- A prior artifact can be used as a checkpoint; already successful shards are not fetched again.',
    '- Listing IDs are accumulated across checkpoints.',
    '- HTTP 429 stops the current run without discarding prior progress.',
    '- No production DB writes.',
  ].join('\n'));
  console.log(JSON.stringify({ ...report, listingUrls: undefined, shards: undefined, checkpoint: { completedShardUrls: report.checkpoint.completedShardUrls.length, listingIds: report.checkpoint.listingIds.length } }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
