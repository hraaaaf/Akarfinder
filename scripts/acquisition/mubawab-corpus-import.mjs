import fs from 'node:fs/promises';

const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);

const paths = {
  historicalState: process.env.MUBAWAB_HISTORICAL_STATE || 'artifacts/mubawab-historical/state.json',
  currentIds: process.env.MUBAWAB_CURRENT_IDS || 'artifacts/mubawab-current/listing-ids.txt',
  urlFiles: (process.env.MUBAWAB_URL_FILES || '').split(',').map(s => s.trim()).filter(Boolean),
};

const historical = JSON.parse(await fs.readFile(paths.historicalState, 'utf8'));
const historicalIds = new Set((historical.seen_source_ids || []).map(String).filter(x => /^\d+$/.test(x)));
const currentIds = new Set((await fs.readFile(paths.currentIds, 'utf8')).split(/\s+/).filter(x => /^\d+$/.test(x)));
const urlMap = new Map();
for (const file of paths.urlFiles) {
  try {
    const text = await fs.readFile(file, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const url = raw.trim();
      const m = url.match(/\/a\/(\d+)(?:\/|$)/);
      if (m && !urlMap.has(m[1])) urlMap.set(m[1], url);
    }
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }
}

const union = new Set([...historicalIds, ...currentIds]);
const rows = [...union].sort((a,b) => Number(a)-Number(b)).map(id => {
  const current = currentIds.has(id);
  return {
    source_listing_id: Number(id),
    source_domain: 'mubawab.ma',
    canonical_url: urlMap.get(id) || null,
    evidence_status: current ? 'current_verified' : 'historical_unverified',
    evidence_observed_at: current ? '2026-09-05T12:40:36Z' : '2026-09-04T18:38:00Z',
    freshness_score: null,
    metadata: current
      ? { current_manifest_certified: true, source_artifacts: [9967776380, 9968679191, 9969651653] }
      : { historical_catalog: true, source_artifact: 9949834432 },
  };
});

if (historicalIds.size !== 31731) throw new Error(`historical count drift: ${historicalIds.size}`);
if (currentIds.size !== 18445) throw new Error(`current count drift: ${currentIds.size}`);
if (union.size !== 37420) throw new Error(`union count drift: ${union.size}`);

const endpoint = `${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/mubawab_listing_corpus_v1?on_conflict=source_listing_id`;
const batchSize = 500;
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) throw new Error(`upsert failed ${response.status}: ${await response.text()}`);
  if ((i / batchSize) % 10 === 0) console.log(`upserted ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
}

const verify = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/mubawab_listing_corpus_v1?select=evidence_status`, {
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    prefer: 'count=exact',
    range: '0-0',
  },
});
if (!verify.ok) throw new Error(`verification read failed ${verify.status}: ${await verify.text()}`);
console.log(JSON.stringify({ historical: historicalIds.size, current: currentIds.size, union: union.size, mappedUrls: urlMap.size }, null, 2));
