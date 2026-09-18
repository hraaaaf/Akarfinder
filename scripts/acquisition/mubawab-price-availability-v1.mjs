import fs from 'node:fs/promises';

const mode = process.env.MODE || 'dry-run';
const laneFiles = process.argv.slice(2);
if (!laneFiles.length) throw new Error('Provide lane JSON files');
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase credentials required');
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const normalize = (v) => String(v || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();

const byId = new Map();
for (const file of laneFiles) {
  const lane = JSON.parse(await fs.readFile(file, 'utf8'));
  if (lane.stoppedBy) throw new Error(`lane ${lane.laneIndex} stopped by ${lane.stoppedBy}`);
  if (lane.requestCount !== lane.targetShardCount) throw new Error(`lane ${lane.laneIndex} incomplete`);
  for (const obs of lane.observations || []) {
    if (!obs?.id) continue;
    const id = String(obs.id);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(obs);
  }
}

async function getCurrent() {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const url = `${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,source_domain,evidence_status,evidence_observed_at,canonical_url,metadata&limit=1000&offset=${offset}&evidence_status=eq.current_verified&order=source_listing_id.asc`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Supabase read ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

function classifyUnknown(observations) {
  if (!observations.length) return { status: 'no_card_observation', reason: 'no_card_observation_in_certified_p23_sweep' };
  const contexts = observations.map((o) => normalize(o.context)).filter(Boolean);
  const joined = contexts.join(' || ');
  if (/prix\s+(?:à|a)\s+consulter/i.test(joined)) return { status: 'not_disclosed', reason: 'explicit_prix_a_consulter' };
  if (/(?:\*{3,}|x{3,})[\s-]*(?:\*{2,}|x{2,})/i.test(joined)) return { status: 'masked', reason: 'masked_or_truncated_price' };
  if (observations.some((o) => o.priceAmbiguous === true)) return { status: 'ambiguous', reason: 'multiple_mad_amounts_on_card' };
  const foreign = /(?:EUR|EUROS?|€|USD|DOLLARS?|\$)/i.test(joined);
  if (foreign) return { status: 'ambiguous', reason: 'foreign_currency_evidence_not_resolved' };
  if (/([0-9][0-9\s.,]{0,20})\s*(?:DH|DHS|MAD)\b/i.test(joined)) return { status: 'rejected_evidence', reason: 'numeric_mad_evidence_failed_strict_parser' };
  return { status: 'not_observed_on_card', reason: 'no_numeric_price_on_certified_card_observation' };
}

function availabilityFor(row) {
  const price = row?.metadata?.card_enrichment_v1?.price;
  if (price?.status === 'unique') {
    return {
      version: 1,
      status: 'known',
      reason: 'card_enrichment_price_unique',
      currency: price.currency || (price.value_mad != null || typeof price.value === 'number' ? 'MAD' : null),
    };
  }
  return { version: 1, ...classifyUnknown(byId.get(String(row.source_listing_id)) || []) };
}

async function upsert(rows) {
  const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?on_conflict=source_listing_id`, {
    method: 'POST',
    headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase upsert ${r.status}: ${await r.text()}`);
}

const current = await getCurrent();
if (current.length !== 18445) throw new Error(`expected 18445 current rows, got ${current.length}`);
const counts = {};
const plan = [];
for (const row of current) {
  const availability = availabilityFor(row);
  counts[availability.status] = (counts[availability.status] || 0) + 1;
  plan.push({ source_listing_id: row.source_listing_id, availability });
}
const classified = Object.values(counts).reduce((a, b) => a + b, 0);
if (classified !== 18445) throw new Error(`classification mismatch ${classified}`);

await fs.mkdir('artifacts/mubawab-price-availability-v1', { recursive: true });
await fs.writeFile('artifacts/mubawab-price-availability-v1/plan.json', JSON.stringify(plan));

if (mode === 'apply') {
  const now = new Date().toISOString();
  const rows = current.map((row) => {
    const availability = { ...availabilityFor(row), classified_at: now, source: 'certified_p23_cards_plus_current_corpus' };
    return {
      source_listing_id: row.source_listing_id,
      source_domain: row.source_domain,
      evidence_status: row.evidence_status,
      evidence_observed_at: row.evidence_observed_at,
      metadata: { ...(row.metadata || {}), price_availability_v1: availability },
      updated_at: now,
    };
  });
  for (let i = 0; i < rows.length; i += 200) await upsert(rows.slice(i, i + 200));
}

const post = await getCurrent();
const tagged = post.filter((r) => r?.metadata?.price_availability_v1?.version === 1).length;
const postUnique = post.filter((r) => r?.metadata?.card_enrichment_v1?.price?.status === 'unique').length;
const report = {
  success: mode === 'dry-run' ? tagged <= 18445 : tagged === 18445,
  mode,
  zeroDbWrites: mode === 'dry-run',
  currentTotal: current.length,
  classified,
  counts,
  priceUniqueUnchanged: postUnique,
  taggedAfter: tagged,
};
await fs.writeFile('artifacts/mubawab-price-availability-v1/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
