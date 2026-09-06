import fs from 'node:fs/promises';

export const POLICY_VERSION = 'mubawab-freshness-v1.0.0';

export function scoreListing({ current, historical, hasUrl }) {
  if (current) {
    const reasons = ['current_manifest_certified'];
    if (historical) reasons.push('historical_catalog_reappearance');
    else reasons.push('current_only_observation');
    if (hasUrl) reasons.push('canonical_url_observed');
    else reasons.push('canonical_url_missing');

    let score = 90;
    if (hasUrl) score += 5;
    if (historical) score += 5;
    return {
      freshness_score: Math.min(score, 100),
      freshness_status: 'fresh_confirmed',
      freshness_reasons: reasons,
    };
  }

  if (historical) {
    return {
      freshness_score: 40,
      freshness_status: 'uncertain',
      freshness_reasons: [
        'historical_catalog_observation',
        'not_reobserved_in_current_manifest',
        'no_negative_liveness_proof',
      ],
    };
  }

  throw new Error('listing is absent from both evidence sets');
}

function headers() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  };
}

async function fetchCorpus(base) {
  const rows = [];
  const page = 1000;
  for (let offset = 0;; offset += page) {
    const url = `${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,evidence_status,canonical_url&order=source_listing_id.asc&limit=${page}&offset=${offset}`;
    const r = await fetch(url, { headers: headers() });
    if (!r.ok) throw new Error(`corpus read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < page) break;
  }
  return rows;
}

async function patchIds(base, ids, payload) {
  const batchSize = 180;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const filter = batch.join(',');
    const url = `${base}/rest/v1/mubawab_listing_corpus_v1?source_listing_id=in.(${filter})`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers(), prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`freshness patch failed ${r.status}: ${await r.text()}`);
  }
}

function sampleIds(ids) {
  if (!ids.length) return [];
  const picks = [0, Math.floor((ids.length - 1) / 2), ids.length - 1];
  return [...new Set(picks.map(i => ids[i]))];
}

async function main() {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }

  const historicalPath = process.env.MUBAWAB_HISTORICAL_STATE || 'artifacts/mubawab-historical/state.json';
  const currentPath = process.env.MUBAWAB_CURRENT_IDS || 'artifacts/mubawab-current/listing-ids.txt';

  const historicalState = JSON.parse(await fs.readFile(historicalPath, 'utf8'));
  const historicalIds = new Set((historicalState.seen_source_ids || []).map(String).filter(x => /^\d+$/.test(x)));
  const currentIds = new Set((await fs.readFile(currentPath, 'utf8')).split(/\s+/).filter(x => /^\d+$/.test(x)));

  if (historicalIds.size !== 31731) throw new Error(`historical count drift: ${historicalIds.size}`);
  if (currentIds.size !== 18445) throw new Error(`current count drift: ${currentIds.size}`);

  const union = new Set([...historicalIds, ...currentIds]);
  if (union.size !== 37420) throw new Error(`union count drift: ${union.size}`);

  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const rows = await fetchCorpus(base);
  if (rows.length !== 37420) throw new Error(`database corpus drift: ${rows.length}`);

  const groups = new Map();
  for (const row of rows) {
    const id = String(row.source_listing_id);
    if (!union.has(id)) throw new Error(`unexpected database id ${id}`);
    const result = scoreListing({
      current: currentIds.has(id),
      historical: historicalIds.has(id),
      hasUrl: Boolean(row.canonical_url),
    });
    const key = JSON.stringify(result);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number(id));
  }

  const scoredAt = new Date().toISOString();
  for (const [key, ids] of groups) {
    const result = JSON.parse(key);
    await patchIds(base, ids, {
      ...result,
      freshness_policy_version: POLICY_VERSION,
      freshness_scored_at: scoredAt,
      updated_at: scoredAt,
    });
  }

  const distribution = [];
  for (const [key, ids] of groups) {
    const result = JSON.parse(key);
    distribution.push({
      score: result.freshness_score,
      status: result.freshness_status,
      reasons: result.freshness_reasons,
      count: ids.length,
      sample_ids: sampleIds(ids),
    });
  }
  distribution.sort((a, b) => b.score - a.score || a.status.localeCompare(b.status));

  const summary = {
    policy_version: POLICY_VERSION,
    scored_at: scoredAt,
    total: rows.length,
    historical_catalog: historicalIds.size,
    current_manifest: currentIds.size,
    overlap: [...currentIds].filter(id => historicalIds.has(id)).length,
    current_only: [...currentIds].filter(id => !historicalIds.has(id)).length,
    historical_only: [...historicalIds].filter(id => !currentIds.has(id)).length,
    distribution,
  };

  if (summary.overlap !== 12756 || summary.current_only !== 5689 || summary.historical_only !== 18975) {
    throw new Error(`evidence partition drift: ${JSON.stringify(summary)}`);
  }
  if (distribution.reduce((n, x) => n + x.count, 0) !== 37420) throw new Error('distribution does not cover full corpus');

  await fs.mkdir('artifacts/mubawab-freshness', { recursive: true });
  await fs.writeFile('artifacts/mubawab-freshness/report.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(err => { console.error(err); process.exit(1); });
}
