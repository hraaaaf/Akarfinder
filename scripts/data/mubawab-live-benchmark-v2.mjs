import fs from 'node:fs';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import { extractDetail } from '../scrapers/utils/extract.js';

const planPath = process.env.MUBAWAB_FETCH_PLAN || process.argv[2] || 'data/recovery/mubawab-v2/mubawab-live-fetch-plan.jsonl';
const outputPrefix = process.env.OUTPUT_PREFIX || 'mubawab-live-benchmark-v2';
const sampleSize = Math.max(1, Math.min(300, Number(process.env.SAMPLE_SIZE || 100)));
const fetchDelayMs = Math.max(250, Number(process.env.FETCH_DELAY_MS || 500));
const USER_AGENT = 'AkarFinderMubawabParserV2/1.0';

function rank(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function meta($, key) {
  return clean($(`meta[property="${key}"]`).attr('content') || $(`meta[name="${key}"]`).attr('content')) || null;
}
function isSoftPage(title, text) {
  const t = normalize(title);
  const body = normalize(text);
  return /^(?:404|accueil|page not found|not found)\b/.test(t)
    || /ce bien a ete vendu|annonce n.existe plus|page introuvable/.test(body);
}
function robotsAllowed(robots, url) {
  const pathname = new URL(url).pathname || '/';
  const lines = robots.split(/\r?\n/).map((x) => x.replace(/#.*/, '').trim()).filter(Boolean);
  let applies = false;
  const disallow = [];
  const allow = [];
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      applies = value === '*' || value.toLowerCase() === USER_AGENT.toLowerCase();
      continue;
    }
    if (!applies) continue;
    if (key === 'disallow' && value) disallow.push(value);
    if (key === 'allow' && value) allow.push(value);
  }
  const best = (xs) => xs.filter((x) => pathname.startsWith(x)).sort((a, b) => b.length - a.length)[0] || '';
  const a = best(allow);
  const d = best(disallow);
  return !d || a.length >= d.length;
}

let robots = null;
async function canFetch(url) {
  if (robots === null) {
    const origin = new URL(url).origin;
    try {
      const response = await fetch(`${origin}/robots.txt`, {
        headers: { 'user-agent': USER_AGENT },
        redirect: 'follow',
      });
      robots = response.ok ? await response.text() : '';
    } catch {
      robots = false;
    }
  }
  return robots !== false && robotsAllowed(robots || '', url);
}

function detectTransaction(url, title, description) {
  const text = normalize(`${decodeURIComponent(url)} ${title || ''} ${description || ''}`);
  const sale = /\b(?:a vendre|en vente|vente|for sale|to buy)\b/.test(text);
  const rent = /\b(?:a louer|en location|location|for rent|rental)\b/.test(text);
  if (sale && !rent) return 'sale';
  if (rent && !sale) return 'rent';
  return null;
}
function detectPropertyType(title, description) {
  const text = normalize(`${title || ''} ${description || ''}`);
  const defs = [
    ['apartment', /\b(?:appartement|apartment)\b/],
    ['studio', /\bstudio\b/],
    ['duplex', /\bduplex\b/],
    ['villa', /\bvilla\b/],
    ['riad', /\briad\b/],
    ['house', /\b(?:maison|house)\b/],
    ['land', /\b(?:terrain|land)\b/],
    ['office', /\b(?:bureau|office)\b/],
    ['commercial', /\b(?:local commercial|commerce|commercial|magasin)\b/],
  ];
  const hits = defs.filter(([, re]) => re.test(text)).map(([type]) => type);
  return hits.length === 1 ? hits[0] : null;
}
function plausibleLocationPart(value) {
  const n = normalize(value);
  if (!n || n.length < 2 || n.length > 60) return false;
  if (/\b(?:vendre|vente|louer|location|appartement|villa|maison|terrain|bureau|immobilier|maroc)\b/.test(n)) return false;
  if (/\d{4,}/.test(n)) return false;
  return true;
}
function locationPairs($, detail) {
  const pairs = [];
  const push = (district, city, evidence) => {
    district = clean(district);
    city = clean(city);
    if (!plausibleLocationPart(district) || !plausibleLocationPart(city)) return;
    const key = `${normalize(district)}\u0000${normalize(city)}`;
    if (!pairs.some((x) => x.key === key)) pairs.push({ key, district, city, evidence });
  };

  $('h2, h3, h4, [class*=location], [class*=Location]').each((_, el) => {
    const t = clean($(el).text());
    const m = t.match(/^(.{2,60}?)\s+(?:à|a|in)\s+(.{2,40})$/iu);
    if (m) push(m[1], m[2], 'location_heading');
  });

  const candidates = (detail.location_candidates || []).map(clean).filter(Boolean);
  if (candidates.length >= 2) {
    for (let i = 0; i < candidates.length - 1; i += 1) {
      push(candidates[i], candidates[i + 1], 'breadcrumb_adjacent');
    }
  }

  return pairs;
}
function resolveLocation($, detail) {
  const pairs = locationPairs($, detail);
  const uniqueCities = [...new Set(pairs.map((x) => normalize(x.city)))];
  const uniqueDistricts = [...new Set(pairs.map((x) => normalize(x.district)))];
  if (pairs.length && uniqueCities.length === 1 && uniqueDistricts.length === 1) {
    return {
      city: pairs[0].city,
      district: pairs[0].district,
      confidence: 'high',
      evidence: pairs.map((x) => x.evidence),
    };
  }

  const city = clean(detail.city);
  const district = clean(detail.district);
  if (city && district && plausibleLocationPart(city) && plausibleLocationPart(district)) {
    return { city, district, confidence: 'review', evidence: ['extractDetail'] };
  }

  return {
    city: city && plausibleLocationPart(city) ? city : null,
    district: null,
    confidence: city ? 'review' : 'missing',
    evidence: city ? ['extractDetail:city'] : [],
    pair_candidates: pairs,
  };
}
function hasPriceSignal(text) {
  return /\b\d[\d\s.,]{2,}\s*(?:dh|dhs|mad|dirhams?)\b/i.test(text);
}
function hasSurfaceSignal(text) {
  return /\b\d{1,6}(?:[.,]\d+)?\s*m(?:²|2)\b/i.test(text);
}

const plan = fs.readFileSync(planPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((row) => row.priority === 'individual')
  .sort((a, b) => rank(a.identity).localeCompare(rank(b.identity)))
  .slice(0, sampleSize);

const results = [];
for (const row of plan) {
  const rec = {
    identity: row.identity,
    url: row.url,
    robots_allowed: false,
    http_status: null,
    active: false,
    fields: {},
    parser_miss: [],
  };

  if (!(await canFetch(row.url))) {
    rec.blocked = 'robots';
    results.push(rec);
    continue;
  }
  rec.robots_allowed = true;

  let response;
  try {
    response = await fetch(row.url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
  } catch {
    rec.blocked = 'fetch_error';
    results.push(rec);
    continue;
  }

  rec.http_status = response.status;
  rec.final_url = response.url;
  if (response.status !== 200) {
    rec.blocked = `http_${response.status}`;
    results.push(rec);
    await new Promise((resolve) => setTimeout(resolve, fetchDelayMs));
    continue;
  }

  const html = await response.text();
  const $ = load(html);
  const text = clean($('body').text());
  const title = meta($, 'og:title') || clean($('h1').first().text()) || null;
  const detail = extractDetail(html);
  const description = detail.description_snippet || meta($, 'description') || meta($, 'og:description') || null;
  const soft = isSoftPage(title, text);
  const location = resolveLocation($, detail);

  rec.active = !soft;
  rec.fields = {
    title,
    city: location.city,
    district: location.district,
    price_raw: detail.price_raw,
    surface_raw: detail.surface_raw,
    transaction_type: detectTransaction(response.url || row.url, title, description),
    property_type: detectPropertyType(title, description),
  };
  rec.location_evidence = location;
  rec.signals = {
    price: hasPriceSignal(text),
    surface: hasSurfaceSignal(text),
    location_pairs: locationPairs($, detail).length,
  };

  if (!rec.fields.price_raw && rec.signals.price) rec.parser_miss.push('price');
  if (!rec.fields.surface_raw && rec.signals.surface) rec.parser_miss.push('surface');
  if (!rec.fields.city && rec.signals.location_pairs) rec.parser_miss.push('city');
  if (!rec.fields.district && rec.signals.location_pairs) rec.parser_miss.push('district');

  rec.mandatory_complete = !!(
    rec.active &&
    rec.fields.city &&
    rec.fields.district &&
    rec.fields.price_raw &&
    rec.fields.surface_raw
  );

  results.push(rec);
  await new Promise((resolve) => setTimeout(resolve, fetchDelayMs));
}

const count = (fn) => results.filter(fn).length;
const statusCounts = {};
for (const r of results) {
  const key = r.http_status == null ? String(r.blocked || 'none') : String(r.http_status);
  statusCounts[key] = (statusCounts[key] || 0) + 1;
}

const summary = {
  schema_version: 'AKARFINDER_MUBAWAB_LIVE_BENCHMARK_V2',
  sample_size: results.length,
  robots_allowed: count((r) => r.robots_allowed),
  http_status_counts: statusCounts,
  active_http_200: count((r) => r.http_status === 200 && r.active),
  soft_or_gone_http_200: count((r) => r.http_status === 200 && !r.active),
  mandatory_complete: count((r) => r.mandatory_complete),
  field_coverage: {
    city: count((r) => !!r.fields?.city),
    district: count((r) => !!r.fields?.district),
    price: count((r) => !!r.fields?.price_raw),
    surface: count((r) => !!r.fields?.surface_raw),
    transaction_type: count((r) => !!r.fields?.transaction_type),
    property_type: count((r) => !!r.fields?.property_type),
  },
  parser_miss: {
    city: count((r) => r.parser_miss?.includes('city')),
    district: count((r) => r.parser_miss?.includes('district')),
    price: count((r) => r.parser_miss?.includes('price')),
    surface: count((r) => r.parser_miss?.includes('surface')),
  },
  database_access: 0,
  database_writes: 0,
};

fs.writeFileSync(`${outputPrefix}.json`, JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(`${outputPrefix}.jsonl`, results.map((row) => JSON.stringify(row)).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
