import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import { parseMubawabRoute, aggregateMubawabIdentity } from './mubawab-url-parser-v2.mjs';

const input = process.env.FREEZE_JSONL_GZ || process.argv[2];
const outDir = process.env.OUTPUT_DIR || process.argv[3] || 'data/recovery/mubawab-v2';
const expectedSha = process.env.FREEZE_SHA256 || 'e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953';
if (!input) throw new Error('FREEZE_JSONL_GZ or argv[2] is required');

const actualSha = crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
if (actualSha !== expectedSha) throw new Error(`freeze sha mismatch: ${actualSha}`);

function preferredUrl(urls, kind, id) {
  const sorted = [...urls].sort((a, b) => {
    const af = /\/fr\//.test(a) ? 0 : 1;
    const bf = /\/fr\//.test(b) ? 0 : 1;
    return af - bf || a.length - b.length || a.localeCompare(b);
  });
  return sorted[0] || `https://www.mubawab.ma/fr/${kind}/${id}`;
}

const groups = new Map();
const nonListingRoutes = [];
let rawRows = 0;
let eligibleRows = 0;
let keepRows = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(input).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  if (row.source_domain !== 'mubawab.ma') continue;

  rawRows += 1;
  if (row.scope_eligible) eligibleRows += 1;
  if (row.classification === 'KEEP') keepRows += 1;

  const route = parseMubawabRoute(row.canonical_url);
  if (!route) {
    nonListingRoutes.push({
      url: row.canonical_url,
      classification: row.classification,
      scope_eligible: row.scope_eligible,
      reason: 'non_detail_route',
    });
    continue;
  }

  if (!groups.has(route.identity)) {
    groups.set(route.identity, {
      ...route,
      urls: [],
      scope_eligible: false,
      classifications: new Set(),
    });
  }

  const group = groups.get(route.identity);
  group.urls.push(row.canonical_url);
  group.scope_eligible ||= !!row.scope_eligible;
  group.classifications.add(row.classification);
}

const passports = [];
const fetchPlan = [];
const metrics = {
  transaction: { recoverable: 0, conflict: 0, unresolved: 0 },
  property_type: { recoverable: 0, conflict: 0, unresolved: 0 },
  surface: { recoverable_high: 0, review: 0, conflict: 0, unresolved: 0 },
  city_review: { single: 0, multiple: 0, none: 0 },
};

for (const group of groups.values()) {
  const parsed = aggregateMubawabIdentity(group.urls);
  const canonical = preferredUrl(group.urls, group.kind, group.id);

  const tx = parsed.transaction_type.state;
  metrics.transaction[tx === 'recoverable_from_url' ? 'recoverable' : tx] += 1;

  const pt = parsed.property_type.state;
  metrics.property_type[pt === 'recoverable_from_url' ? 'recoverable' : pt] += 1;

  const sf = parsed.surface_m2.state;
  if (sf === 'recoverable_from_url') metrics.surface.recoverable_high += 1;
  else metrics.surface[sf] += 1;

  const cs = parsed.city_slug_evidence.state;
  if (cs === 'review') metrics.city_review.single += 1;
  else if (cs === 'conflict') metrics.city_review.multiple += 1;
  else metrics.city_review.none += 1;

  passports.push({
    source: 'mubawab.ma',
    identity: group.identity,
    route_kind: group.kind,
    source_id: group.id,
    canonical_fetch_url: canonical,
    historical_url_count: group.urls.length,
    scope_eligible: group.scope_eligible,
    classifications: [...group.classifications].sort(),
    transaction_type: parsed.transaction_type,
    property_type: parsed.property_type,
    surface_m2: parsed.surface_m2,
    city_slug_evidence: parsed.city_slug_evidence,
    freshness: { state: 'unknown', reason: 'freeze_url_only' },
    mandatory_live_fields: {
      city: 'unresolved_live_required',
      district: 'unresolved_live_required',
      price_mad: 'unresolved_live_required',
      surface_m2: parsed.surface_m2.state === 'recoverable_from_url'
        ? 'candidate_requires_live_crosscheck'
        : 'unresolved_or_review',
    },
  });

  if (group.scope_eligible) {
    fetchPlan.push({
      source: 'mubawab.ma',
      identity: group.identity,
      url: canonical,
      priority: group.kind === 'a' ? 'individual' : 'project',
      reason: 'freshness_and_mandatory_fields',
    });
  }
}

passports.sort((a, b) => a.identity.localeCompare(b.identity));
fetchPlan.sort((a, b) => a.priority.localeCompare(b.priority) || a.identity.localeCompare(b.identity));

const duplicateExtra = rawRows - nonListingRoutes.length - groups.size;
const summary = {
  schema_version: 'AKARFINDER_MUBAWAB_ADAPTER_V2_FREEZE',
  freeze_sha256: actualSha,
  database_access: 0,
  database_writes: 0,
  raw_url_rows: rawRows,
  scope_eligible_url_rows: eligibleRows,
  keep_url_rows: keepRows,
  detail_route_rows: rawRows - nonListingRoutes.length,
  non_listing_route_rows: nonListingRoutes.length,
  unique_detail_identities: groups.size,
  duplicate_historical_url_rows: duplicateExtra,
  raw_url_overcount_vs_unique_detail_identities: rawRows - groups.size,
  raw_url_overcount_pct: +(((rawRows - groups.size) / rawRows) * 100).toFixed(3),
  route_kind_unique: {
    a: [...groups.values()].filter((x) => x.kind === 'a').length,
    pa: [...groups.values()].filter((x) => x.kind === 'pa').length,
  },
  metrics,
  live_fetch_plan_rows: fetchPlan.length,
  freshness_verified: 0,
  note: 'Freeze-only adapter. URL-derived fields are evidence/candidates; mandatory freshness, city, district and price require source-side live verification. Historical duplicate slugs can conflict and are never silently collapsed semantically.',
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'mubawab-freeze-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'mubawab-freeze-passports.jsonl'), passports.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'mubawab-live-fetch-plan.jsonl'), fetchPlan.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'mubawab-non-listing-routes.jsonl'), nonListingRoutes.map((x) => JSON.stringify(x)).join('\n') + '\n');

console.log(JSON.stringify(summary, null, 2));

if (
  rawRows !== 82796 ||
  groups.size !== 74867 ||
  nonListingRoutes.length !== 800 ||
  duplicateExtra !== 7129
) {
  process.exitCode = 2;
}
