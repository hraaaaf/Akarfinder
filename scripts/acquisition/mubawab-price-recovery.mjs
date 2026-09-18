import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as cheerio from 'cheerio';

const DETAIL_RE = /\/fr\/(?:a|pa)\/(\d+)(?:\/|$)/i;
const SHARD_RE = /\/fr\/(cc|ct|cd|sd)\//i;
const RANK = { cc: 0, ct: 1, cd: 2, sd: 3 };
const DEFAULT_DELAY_MS = 2750;
const UA = 'AkarFinder-price-recovery/1.0 (+https://akarfinder.ma)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeText(value) {
  return String(value || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseGroupedInteger(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseMadPrice(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const million = normalized.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:M\s*DH|MDH)\b/i);
  if (million) {
    const value = Number.parseFloat(million[1].replace(',', '.')) * 1_000_000;
    const rounded = Math.round(value);
    if (rounded >= 100 && rounded <= 2_147_483_647) return rounded;
  }

  const patterns = [
    /([0-9][0-9\s.,]{0,20})\s*(?:DH|DHS|MAD)\b/i,
    /(?:DH|DHS|MAD)\s*([0-9][0-9\s.,]{0,20})\b/i,
    /([0-9][0-9\s.,]{0,20})\s*د\.?\s*م\.?/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = parseGroupedInteger(match[1]);
    if (value !== null && value >= 100 && value <= 2_147_483_647) return value;
  }
  return null;
}

export function inferPricePeriod(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (/\b(par\s+jour|jour|daily|quotidien|\/\s*j(?:our)?\b)/i.test(normalized)) return 'day';
  if (/\b(par\s+mois|mois|monthly|mensuel|\/\s*mois\b)/i.test(normalized)) return 'month';
  if (/\b(par\s+semaine|semaine|weekly|hebdo)/i.test(normalized)) return 'week';
  return null;
}

function candidateFromElement($, node) {
  const root = $(node);
  const values = new Set();

  root.find('[data-price],[data-amount],[itemprop="price"]').addBack('[data-price],[data-amount],[itemprop="price"]').each((_, el) => {
    const wrapped = $(el);
    for (const raw of [wrapped.attr('data-price'), wrapped.attr('data-amount'), wrapped.attr('content'), wrapped.text()]) {
      if (!raw) continue;
      const attrNumeric = /^\s*[0-9][0-9\s.,]*\s*$/.test(raw) ? parseGroupedInteger(raw) : null;
      const parsed = attrNumeric ?? parseMadPrice(raw);
      if (parsed !== null && parsed >= 100) values.add(parsed);
    }
  });

  const text = normalizeText(root.text());
  const textPrice = parseMadPrice(text);
  if (textPrice !== null) values.add(textPrice);

  if (values.size !== 1) return null;
  const [price] = [...values];
  return { price, period: inferPricePeriod(text), context: text.slice(0, 800) };
}

export function extractPriceForListing(html, listingId) {
  const $ = cheerio.load(String(html || ''));
  const id = String(listingId);
  const matches = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(DETAIL_RE);
    if (match?.[1] === id) matches.push(el);
  });

  for (const anchor of matches) {
    let node = anchor;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      const found = candidateFromElement($, node);
      if (found) return { ...found, evidence: `ancestor_${depth}` };
      const parent = $(node).parent().get(0);
      if (!parent) break;
      if (normalizeText($(parent).text()).length > 3500) break;
      node = parent;
    }
  }

  const raw = String(html || '');
  const marker = new RegExp(`\\/(?:a|pa)\\/${id}(?:\\/|["'])`, 'i');
  const hit = raw.search(marker);
  if (hit >= 0) {
    const context = raw.slice(Math.max(0, hit - 1800), hit + 3000).replace(/<[^>]+>/g, ' ');
    const price = parseMadPrice(context);
    if (price !== null) return { price, period: inferPricePeriod(context), context: normalizeText(context).slice(0, 800), evidence: 'raw_window' };
  }
  return null;
}

export function isSafeShardUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['mubawab.ma', 'www.mubawab.ma'].includes(url.hostname.toLowerCase())) return false;
    if (!SHARD_RE.test(url.pathname)) return false;
    if (url.pathname.includes(':')) return false;
    if (url.searchParams.get('n') === '1') return false;
    return true;
  } catch {
    return false;
  }
}

function shardRank(url) {
  const kind = String(url).match(SHARD_RE)?.[1]?.toLowerCase();
  return RANK[kind] ?? -1;
}

function headers(key) {
  return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
}

async function getAll(base, key, table, select, filter = '') {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const url = `${base}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}${filter}`;
    const response = await fetch(url, { headers: headers(key) });
    if (!response.ok) throw new Error(`${table} read failed ${response.status}: ${await response.text()}`);
    const batch = await response.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

async function patchRow(base, key, table, filter, payload) {
  const response = await fetch(`${base}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...headers(key), prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${table} patch failed ${response.status}: ${await response.text()}`);
}

async function loadTargets(base, key) {
  const [sources, corpus] = await Promise.all([
    getAll(base, key, 'listing_sources', 'id,property_listing_id,source_name,listing_url,source_url,displayed_price,price_status,origin_type', '&source_name=eq.mubawab'),
    getAll(base, key, 'mubawab_listing_corpus_v1', 'source_listing_id,evidence_status', '&evidence_status=eq.current_verified'),
  ]);
  const propertyIds = [...new Set(sources.map((row) => row.property_listing_id).filter(Number.isFinite))];
  const properties = [];
  for (let i = 0; i < propertyIds.length; i += 100) {
    const ids = propertyIds.slice(i, i + 100).join(',');
    const response = await fetch(`${base}/rest/v1/property_listings?select=id,price_mad&id=in.(${ids})`, { headers: headers(key) });
    if (!response.ok) throw new Error(`property_listings read failed ${response.status}: ${await response.text()}`);
    properties.push(...await response.json());
  }
  const propertyById = new Map(properties.map((row) => [row.id, row]));
  const current = new Set(corpus.map((row) => String(row.source_listing_id)));
  return sources.flatMap((row) => {
    const rawUrl = row.listing_url || row.source_url || '';
    const match = rawUrl.match(DETAIL_RE);
    if (!match) return [];
    const id = match[1];
    const property = propertyById.get(row.property_listing_id);
    if (row.displayed_price !== null || property?.price_mad !== null && property?.price_mad !== undefined) return [];
    if (!current.has(id)) return [];
    return [{ ...row, source_listing_id: id, property_price_mad: property?.price_mad ?? null }];
  });
}

async function loadShardMap(reportFiles, targetIds) {
  const candidates = new Map([...targetIds].map((id) => [id, []]));
  for (const file of reportFiles) {
    const report = JSON.parse(await fs.readFile(file, 'utf8'));
    for (const shard of report.shards || []) {
      if (shard?.fetchState !== 'ok' || !isSafeShardUrl(shard.url)) continue;
      for (const rawId of shard.listingIds || []) {
        const id = String(rawId);
        if (!candidates.has(id)) continue;
        candidates.get(id).push(shard.url);
      }
    }
  }
  const chosen = new Map();
  for (const [id, urls] of candidates) {
    const unique = [...new Set(urls)].sort((a, b) => shardRank(b) - shardRank(a) || a.length - b.length || a.localeCompare(b));
    if (unique[0]) chosen.set(id, unique[0]);
  }
  return chosen;
}

export async function runRecovery() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error('Supabase credentials are required');
  const base = supabaseUrl.replace(/\/$/, '');
  const reportFiles = (process.env.MUBAWAB_REPORT_FILES || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!reportFiles.length) throw new Error('MUBAWAB_REPORT_FILES is required');
  const delayMs = Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS || String(DEFAULT_DELAY_MS), 10);
  const targets = await loadTargets(base, key);
  const targetById = new Map(targets.map((row) => [row.source_listing_id, row]));
  const shardById = await loadShardMap(reportFiles, new Set(targetById.keys()));
  const idsByShard = new Map();
  for (const [id, shard] of shardById) {
    if (!idsByShard.has(shard)) idsByShard.set(shard, []);
    idsByShard.get(shard).push(id);
  }

  const recovered = [];
  const unresolved = [];
  let requests = 0;
  let stoppedEarly = null;
  let lastStarted = 0;

  for (const [shardUrl, ids] of idsByShard) {
    const remaining = delayMs - (Date.now() - lastStarted);
    if (lastStarted && remaining > 0) await sleep(remaining);
    lastStarted = Date.now();
    const response = await fetch(shardUrl, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'accept-language': 'fr-MA,fr;q=0.9' } });
    requests += 1;
    if (response.status === 429) { stoppedEarly = 'http_429'; break; }
    if (!response.ok) {
      for (const id of ids) unresolved.push({ source_listing_id: id, reason: `http_${response.status}`, shard_url: shardUrl });
      continue;
    }
    const html = await response.text();
    for (const id of ids) {
      const parsed = extractPriceForListing(html, id);
      if (!parsed) {
        unresolved.push({ source_listing_id: id, reason: 'price_not_found_on_shard', shard_url: shardUrl });
        continue;
      }
      const target = targetById.get(id);
      const now = new Date().toISOString();
      await patchRow(base, key, 'listing_sources', `id=eq.${target.id}`, {
        displayed_price: parsed.price,
        price_currency: 'MAD',
        price_period: parsed.period,
        price_status: 'valid',
        last_seen_at: now,
      });
      await patchRow(base, key, 'property_listings', `id=eq.${target.property_listing_id}&price_mad=is.null`, {
        price_mad: parsed.price,
        updated_at: now,
      });
      recovered.push({
        source_listing_id: id,
        source_id: target.id,
        property_listing_id: target.property_listing_id,
        price_mad: parsed.price,
        price_period: parsed.period,
        shard_url: shardUrl,
        evidence: parsed.evidence,
      });
    }
  }

  for (const target of targets) {
    if (!shardById.has(target.source_listing_id)) unresolved.push({ source_listing_id: target.source_listing_id, reason: 'no_shard_attribution' });
  }

  const report = {
    success: stoppedEarly === null,
    targetCurrentDetailNoPriceCount: targets.length,
    mappedToShardCount: shardById.size,
    uniqueShardRequestCount: requests,
    recoveredPriceCount: recovered.length,
    unresolvedCount: unresolved.length,
    stoppedEarly,
    zeroDetailPageRequests: true,
    requestDelayMs: delayMs,
    recovered,
    unresolved,
  };
  const outDir = 'artifacts/mubawab-price-recovery';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# Mubawab current price recovery', '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Current detail targets without price: **${targets.length}**`,
    `- Targets mapped to certified safe shards: **${shardById.size}**`,
    `- Safe shard requests: **${requests}**`,
    `- Prices recovered: **${recovered.length}**`,
    `- Unresolved: **${unresolved.length}**`,
    `- Detail page requests: **0**`,
    `- Early stop: **${stoppedEarly || 'none'}**`,
  ].join('\n'));
  console.log(JSON.stringify({ ...report, recovered: undefined, unresolved: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runRecovery();
