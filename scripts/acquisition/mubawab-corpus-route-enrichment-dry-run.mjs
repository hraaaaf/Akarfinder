import fs from 'node:fs/promises';
import path from 'node:path';

const TYPE_MAP = new Map([
  ['appartements','apartment'],['terrains','land'],['villas-et-maisons-de-luxe','villa'],
  ['bureaux-et-commerces','office_commercial'],['locaux','commercial'],['maisons','house'],
  ['riads','riad'],['fermes','farm']
]);

function parseRoute(raw) {
  const u = new URL(raw);
  const p = u.pathname.split('/').filter(Boolean);
  if (p[0] !== 'fr') return {};
  const kind = p[1];
  const out = { kind };
  let tail = '';
  if (kind === 'cc') tail = p[2] || '';
  else if (kind === 'ct') { out.city = p[2] || null; tail = p[3] || ''; }
  else if (kind === 'cd' || kind === 'sd') { out.city = p[2] || null; out.district = p[3] || null; tail = p[4] || ''; }
  else return out;
  if (tail.endsWith('-a-vendre') || tail === 'immobilier-a-vendre') out.transaction = 'sale';
  else if (tail.endsWith('-a-louer') || tail === 'immobilier-a-louer') out.transaction = 'rent';
  else if (tail.includes('vacational')) out.transaction = 'vacation';
  let typeSlug = tail.replace(/-a-vendre$|-a-louer$/,'');
  if (TYPE_MAP.has(typeSlug)) out.propertyType = TYPE_MAP.get(typeSlug);
  return out;
}

function add(set, value) { if (value) set.add(value); }

const reportFiles = (process.env.MUBAWAB_REPORT_FILES || '').split(',').map(v => v.trim()).filter(Boolean);
if (!reportFiles.length) throw new Error('MUBAWAB_REPORT_FILES is required');
const byId = new Map();
let shardCount = 0;
for (const file of reportFiles) {
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const shard of report.shards || []) {
    if (shard?.fetchState !== 'ok') continue;
    shardCount += 1;
    const route = parseRoute(shard.url);
    for (const rawId of shard.listingIds || []) {
      const id = String(rawId);
      if (!byId.has(id)) byId.set(id, { city:new Set(), district:new Set(), propertyType:new Set(), transaction:new Set() });
      const row = byId.get(id);
      add(row.city, route.city); add(row.district, route.district); add(row.propertyType, route.propertyType); add(row.transaction, route.transaction);
    }
  }
}

function stats(field) {
  let zero=0, unique=0, conflict=0;
  for (const row of byId.values()) {
    const n = row[field].size;
    if (n===0) zero += 1; else if (n===1) unique += 1; else conflict += 1;
  }
  return { zero, unique, conflict, uniquePct: Number((unique / byId.size * 100).toFixed(2)) };
}
const output = {
  success: shardCount === 3174 && byId.size === 18445,
  zeroDbWrites: true,
  shardCount,
  currentUniqueIdCount: byId.size,
  fields: {
    city: stats('city'), transaction: stats('transaction'), propertyType: stats('propertyType'), district: stats('district')
  }
};
const outDir='artifacts/mubawab-corpus-route-enrichment-dry-run';
await fs.mkdir(outDir,{recursive:true});
await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(output,null,2));
await fs.writeFile(path.join(outDir,'report.md'),[
  '# Mubawab corpus-wide route enrichment dry-run','',
  `- Success: **${output.success?'YES':'NO'}**`,`- DB writes: **0**`,`- Safe shards: **${shardCount}**`,`- Current IDs: **${byId.size}**`,
  '',`- City unique: **${output.fields.city.unique} (${output.fields.city.uniquePct}%)**`,
  `- Transaction unique: **${output.fields.transaction.unique} (${output.fields.transaction.uniquePct}%)**`,
  `- Property type unique: **${output.fields.propertyType.unique} (${output.fields.propertyType.uniquePct}%)**`,
  `- District unique: **${output.fields.district.unique} (${output.fields.district.uniquePct}%)**`
].join('\n'));
console.log(JSON.stringify(output,null,2));
if (!output.success) process.exitCode=2;
