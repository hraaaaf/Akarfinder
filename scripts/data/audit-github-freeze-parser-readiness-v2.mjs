import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';

const input = process.env.FREEZE_JSONL_GZ || process.argv[2];
const outDir = process.env.OUTPUT_DIR || process.argv[3] || 'data/recovery/parser-readiness-v2';
const expectedSha =
  process.env.FREEZE_SHA256 ||
  'e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953';

if (!input) throw new Error('FREEZE_JSONL_GZ or argv[2] is required');

const actualSha = crypto
  .createHash('sha256')
  .update(fs.readFileSync(input))
  .digest('hex');

if (actualSha !== expectedSha) {
  throw new Error('freeze sha mismatch: ' + actualSha);
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

function pathParts(url) {
  try {
    return new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part).toLowerCase());
  } catch {
    return [];
  }
}

function structuredRouteCandidates(row) {
  const source = row.source_domain;
  const p = pathParts(row.canonical_url);
  const out = {};

  if (source === 'agenz.ma' && p.length >= 6 && p[1] === 'annonces' && p[2].startsWith('immo-')) {
    out.city = p[2].slice(5);
    const split = p[3].indexOf('-');
    if (split > 0) {
      const tx = p[3].slice(0, split);
      const propertyType = p[3].slice(split + 1);
      if (['vente', 'location'].includes(tx)) out.transaction_type = tx;
      if (propertyType) out.property_type = propertyType.replace(/s$/, '');
    }
    if (p[4] && !/^\d+$/.test(p[4])) out.district = p[4];
  } else if (source === 'marocimmo.com' && p.length >= 6 && ['fr', 'en', 'ar'].includes(p[0])) {
    if (['vente', 'location'].includes(p[1])) out.transaction_type = p[1];
    out.property_type = p[2];
    out.city = p[3];
    out.district = p[4];
  } else if (source === 'domio.ma' && p.length >= 5 && ['fr', 'en', 'ar'].includes(p[0])) {
    out.property_type = p[1];
    if (['louer', 'vendre'].includes(p[2])) out.transaction_type = p[2];
    out.city = p[3];
  } else if (source === 'mouldar.com' && p.length >= 6 && ['fr', 'en', 'ar'].includes(p[0])) {
    const tx = { buy: 'sale', achat: 'sale', rent: 'rent', location: 'rent' }[p[1]];
    if (tx) out.transaction_type = tx;
    out.property_type = p[2];
    out.city = p[3];
    if (!['all-the-city', 'toute-la-ville', 'all-city'].includes(p[4])) out.district = p[4];
  } else if (source === 'kawtarimmobilier.com' && p.length >= 4 && ['vente', 'location'].includes(p[1])) {
    out.city = p[0];
    out.transaction_type = p[1];
    out.property_type = p[2];
  } else if (
    source === 'barnes-marrakech.com' &&
    p.length >= 4 &&
    ['fr', 'en'].includes(p[0]) &&
    ['vente', 'location', 'sale', 'rent'].includes(p[1])
  ) {
    out.transaction_type = p[1];
    out.city = p[2];
  } else if (source === 'masaken.ma' && p.length >= 4 && p[1] === 'immobilier-maroc') {
    const segment = p[2];
    const transactions = [
      ['vente-', 'sale'],
      ['location-', 'rent'],
      ['sale-', 'sale'],
      ['rental-', 'rent'],
    ];
    const propertyTypes = [
      'appartement','apartment','terrain','land','villa','maison','house',
      'bureau','office','commerce','commercial','riad','ferme','farm',
    ];
    for (const [prefix, tx] of transactions) {
      if (!segment.startsWith(prefix)) continue;
      const remainder = segment.slice(prefix.length);
      for (const propertyType of propertyTypes) {
        if (remainder.startsWith(propertyType + '-')) {
          out.transaction_type = tx;
          out.property_type = propertyType;
          out.city = remainder.slice(propertyType.length + 1);
          break;
        }
      }
      break;
    }
  } else if (source === 'soukimmobilier.com' && p.length >= 4 && ['fr', 'ar', 'en'].includes(p[0])) {
    const notCity = ['sale', 'vente', 'location', 'rent', 'buy', 'achat'];
    if (!notCity.includes(p[1]) && !/^\d+$/.test(p[1])) {
      out.city = p[1];
      out.property_type = p[2];
    }
  }

  return out;
}

const trackedFields = [
  'title','description','published_at','source_listing_id','address',
  'city','district','price_mad','surface_m2',
];
const requiredFields = ['canonical_url','city','district','price_mad','surface_m2'];

const total = {
  rows: 0,
  unique_urls: 0,
  scope_eligible: 0,
  keep: 0,
  expired: 0,
  non_real_estate: 0,
  deep_unique_http_200_urls: 0,
  mandatory_complete_rows: 0,
};

const existingFieldCoverage = Object.fromEntries(trackedFields.map((field) => [field, 0]));
const source = {};
const uniqueUrls = new Set();
const routeCandidateCounts = {
  city: 0,
  district: 0,
  transaction_type: 0,
  property_type: 0,
};
const routeEvidence = [];

const rl = readline.createInterface({
  input: fs.createReadStream(input).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  total.rows += 1;
  uniqueUrls.add(row.canonical_url);
  if (row.scope_eligible) total.scope_eligible += 1;
  if (row.classification === 'KEEP') total.keep += 1;
  if (row.classification === 'EXPIRED') total.expired += 1;
  if (row.classification === 'NON_REAL_ESTATE') total.non_real_estate += 1;
  if ((row.deep_http_statuses || []).includes(200)) total.deep_unique_http_200_urls += 1;
  if (requiredFields.every((field) => present(row[field]))) total.mandatory_complete_rows += 1;
  for (const field of trackedFields) if (present(row[field])) existingFieldCoverage[field] += 1;

  source[row.source_domain] ||= {
    rows: 0,
    scope_eligible: 0,
    keep: 0,
    deep_http_200_urls: 0,
    mandatory_complete_rows: 0,
    existing_field_coverage: Object.fromEntries(trackedFields.map((field) => [field, 0])),
    structured_route_candidates: {},
  };
  const src = source[row.source_domain];
  src.rows += 1;
  if (row.scope_eligible) src.scope_eligible += 1;
  if (row.classification === 'KEEP') src.keep += 1;
  if ((row.deep_http_statuses || []).includes(200)) src.deep_http_200_urls += 1;
  if (requiredFields.every((field) => present(row[field]))) src.mandatory_complete_rows += 1;
  for (const field of trackedFields) if (present(row[field])) src.existing_field_coverage[field] += 1;

  const candidates = structuredRouteCandidates(row);
  for (const [field, value] of Object.entries(candidates)) {
    routeCandidateCounts[field] += 1;
    src.structured_route_candidates[field] =
      (src.structured_route_candidates[field] || 0) + 1;
    routeEvidence.push({
      url: row.canonical_url,
      source: row.source_domain,
      field,
      value,
      state: 'recoverable_from_url',
      confidence: 'high',
      evidence: 'canonical_url_structured_route',
    });
  }
}

total.unique_urls = uniqueUrls.size;

const sourcePriority = Object.entries(source)
  .sort(([, a], [, b]) => b.rows - a.rows)
  .map(([name, stats]) => ({ source: name, ...stats }));

const summary = {
  schema_version: 'AKARFINDER_PARSER_READINESS_V2_BASELINE',
  freeze_sha256: actualSha,
  database_access: 0,
  database_writes: 0,
  core_schema_note:
    'The canonical freeze has a universal URL/crawl-evidence core plus optional business-field enrichment on the deep-observed subset. Structured-route candidates outside explicit field evidence are recoverable_from_url, not parser_miss proof.',
  total,
  existing_field_coverage: existingFieldCoverage,
  structured_route_recoverable: routeCandidateCounts,
  source_priority: sourcePriority,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'parser-readiness-v2-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(outDir, 'parser-readiness-v2-structured-route-evidence.jsonl'),
  routeEvidence.map((row) => JSON.stringify(row)).join('\n') + '\n',
);

console.log(JSON.stringify(summary, null, 2));

if (
  total.rows !== 226286 ||
  total.unique_urls !== 226286 ||
  total.deep_unique_http_200_urls !== 8487 ||
  total.mandatory_complete_rows !== 1191 ||
  existingFieldCoverage.city !== 8454 ||
  existingFieldCoverage.district !== 6296 ||
  existingFieldCoverage.price_mad !== 3770 ||
  existingFieldCoverage.surface_m2 !== 4567
) {
  process.exitCode = 2;
}
