import fs from 'node:fs/promises';
import path from 'node:path';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Provide lane JSON files');
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase credentials required');

const headers = { apikey: key, authorization: `Bearer ${key}` };
const normalize = (v) => String(v || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();
const byId = new Map();
for (const file of files) {
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const obs of report.observations || []) {
    const id = String(obs.id);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(obs);
  }
}

async function getUnknownCurrent() {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const url = `${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,canonical_url,metadata&limit=1000&offset=${offset}&evidence_status=eq.current_verified`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Supabase read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    out.push(...batch.filter((row) => row?.metadata?.card_enrichment_v1?.price?.status === 'unknown'));
    if (batch.length < 1000) break;
  }
  return out;
}

function parseCurrencyCandidates(text, currency) {
  const patterns = currency === 'EUR'
    ? [/([0-9][0-9\s.,]{0,20})\s*(?:EUR|EUROS?|€)\b/gi, /(?:EUR|EUROS?|€)\s*([0-9][0-9\s.,]{0,20})\b/gi]
    : [/([0-9][0-9\s.,]{0,20})\s*(?:USD|DOLLARS?|\$)\b/gi, /(?:USD|DOLLARS?|\$)\s*([0-9][0-9\s.,]{0,20})\b/gi];
  const values = new Set();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const digits = m[1].replace(/[^0-9]/g, '');
      if (!digits) continue;
      const value = Number.parseInt(digits, 10);
      if (Number.isSafeInteger(value) && value >= 1) values.add(value);
    }
  }
  return [...values];
}

function classify(observations) {
  if (!observations.length) return { category: 'no_card_observation' };
  const contexts = observations.map((o) => normalize(o.context));
  const joined = contexts.join(' || ');
  if (observations.some((o) => o.priceAmbiguous === true)) {
    return { category: 'residual_multi_amount', evidence: contexts[0]?.slice(0, 300) || null };
  }
  if (/prix\s+(?:à|a)\s+consulter/i.test(joined)) {
    return { category: 'prix_a_consulter', evidence: contexts.find((x) => /prix\s+(?:à|a)\s+consulter/i.test(x))?.slice(0, 300) || null };
  }
  if (/(?:\*{3,}|x{3,})[\s-]*(?:\*{2,}|x{2,})/i.test(joined)) {
    return { category: 'masked_or_truncated', evidence: contexts.find((x) => /(?:\*{3,}|x{3,})/i.test(x))?.slice(0, 300) || null };
  }
  const eur = parseCurrencyCandidates(joined, 'EUR');
  if (eur.length) return { category: eur.length === 1 ? 'eur_unique' : 'eur_ambiguous', value: eur.length === 1 ? eur[0] : null, values: eur.length > 1 ? eur : undefined, evidence: contexts.find((x) => /(?:EUR|EUROS?|€)/i.test(x))?.slice(0, 300) || null };
  const usd = parseCurrencyCandidates(joined, 'USD');
  if (usd.length) return { category: usd.length === 1 ? 'usd_unique' : 'usd_ambiguous', value: usd.length === 1 ? usd[0] : null, values: usd.length > 1 ? usd : undefined, evidence: contexts.find((x) => /(?:USD|DOLLARS?|\$)/i.test(x))?.slice(0, 300) || null };
  const mad = joined.match(/([0-9][0-9\s.,]{0,20})\s*(?:DH|DHS|MAD)\b/i);
  if (mad) return { category: 'mad_numeric_parser_miss', evidence: contexts.find((x) => /(?:DH|DHS|MAD)\b/i.test(x))?.slice(0, 300) || null };
  return { category: 'no_numeric_price_on_card', evidence: contexts[0]?.slice(0, 300) || null };
}

const rows = await getUnknownCurrent();
const counts = {};
const samples = {};
const recoverable = [];
for (const row of rows) {
  const id = String(row.source_listing_id);
  const result = classify(byId.get(id) || []);
  counts[result.category] = (counts[result.category] || 0) + 1;
  if (!samples[result.category]) samples[result.category] = [];
  if (samples[result.category].length < 8) samples[result.category].push({ id, canonical_url: row.canonical_url, ...result });
  if (result.category === 'eur_unique' || result.category === 'usd_unique' || result.category === 'mad_numeric_parser_miss') {
    recoverable.push({ id, canonical_url: row.canonical_url, ...result });
  }
}
const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
const output = {
  success: rows.length === 6225 && totalClassified === rows.length,
  currentUnknownCount: rows.length,
  totalClassified,
  counts,
  recoverableCandidateCount: recoverable.length,
  samples,
};
await fs.mkdir('artifacts/mubawab-price-unknown-diagnostic', { recursive: true });
await fs.writeFile('artifacts/mubawab-price-unknown-diagnostic/report.json', JSON.stringify(output, null, 2));
await fs.writeFile('artifacts/mubawab-price-unknown-diagnostic/recoverable.json', JSON.stringify(recoverable, null, 2));
console.log(JSON.stringify(output, null, 2));
if (!output.success) process.exitCode = 2;
