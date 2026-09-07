import fs from 'node:fs/promises';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Provide lane JSON files');
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase credentials required');
const headers = { apikey: key, authorization: `Bearer ${key}` };
const normalize = (v) => String(v || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();

function parseGroupedInteger(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) ? value : null;
}

export function leadingForeignPrice(text) {
  const t = normalize(text);
  const eur = t.match(/^([0-9][0-9\s.,]{0,20})\s*(EUR|EUROS?|€)\b/i);
  if (eur) return { value: parseGroupedInteger(eur[1]), currency: 'EUR' };
  const usd = t.match(/^([0-9][0-9\s.,]{0,20})\s*(USD|DOLLARS?|\$)\b/i);
  if (usd) return { value: parseGroupedInteger(usd[1]), currency: 'USD' };
  return null;
}

async function getUnknownCurrent() {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const url = `${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,canonical_url,metadata&limit=1000&offset=${offset}&evidence_status=eq.current_verified`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Supabase read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    for (const row of batch) if (row?.metadata?.card_enrichment_v1?.price?.status === 'unknown') out.push(row);
    if (batch.length < 1000) break;
  }
  return out;
}

const byId = new Map();
for (const file of files) {
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const obs of report.observations || []) {
    const id = String(obs.id);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(obs);
  }
}

const current = await getUnknownCurrent();
const resolved = [];
const refused = [];
for (const row of current) {
  const id = String(row.source_listing_id);
  const observations = byId.get(id) || [];
  if (!observations.length) continue;
  const leading = observations.map((o) => leadingForeignPrice(o.context)).filter(Boolean);
  if (!leading.length) continue;
  if (leading.length !== observations.length) {
    refused.push({ id, reason: 'missing_leading_foreign_price_on_some_observations' });
    continue;
  }
  if (leading.some((x) => !x.value || x.value < 1)) {
    refused.push({ id, reason: 'invalid_leading_foreign_price' });
    continue;
  }
  const keys = [...new Set(leading.map((x) => `${x.currency}:${x.value}`))];
  if (keys.length !== 1) {
    refused.push({ id, reason: 'foreign_price_consensus_conflict', values: keys });
    continue;
  }
  resolved.push({ id, canonical_url: row.canonical_url, value: leading[0].value, currency: leading[0].currency, source: 'safe_shard_card_primary_foreign_currency_consensus', evidence_count: leading.length });
}

const output = {
  success: current.length === 6225,
  currentUnknownCount: current.length,
  resolvedCount: resolved.length,
  eurResolvedCount: resolved.filter((x) => x.currency === 'EUR').length,
  usdResolvedCount: resolved.filter((x) => x.currency === 'USD').length,
  refusedCount: refused.length,
  projectedKnownPriceCount: 12220 + resolved.length,
  projectedKnownPriceCoveragePct: Number((((12220 + resolved.length) / 18445) * 100).toFixed(2)),
  refused,
};
await fs.mkdir('artifacts/mubawab-foreign-price-resolver-v1', { recursive: true });
await fs.writeFile('artifacts/mubawab-foreign-price-resolver-v1/report.json', JSON.stringify(output, null, 2));
await fs.writeFile('artifacts/mubawab-foreign-price-resolver-v1/resolved.json', JSON.stringify(resolved, null, 2));
console.log(JSON.stringify(output, null, 2));
if (!output.success) process.exitCode = 2;
