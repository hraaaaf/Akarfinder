import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FIELDS = ['city', 'district', 'price_mad', 'surface_m2'];
const INPUTS = [
  { key: 'mubawab_50', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_50' },
  { key: 'mubawab_frontier_100', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_FRONTIER' },
  { key: 'mubawab_district_shards_120', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_DISTRICT' },
  { key: 'mubawab_district_remainder_217', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_REMAINDER' },
  { key: 'mubawab_new_cities_30', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_NEW_CITIES' },
  { key: 'mubawab_regional_8', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_REGIONAL_8' },
  { key: 'mubawab_regional_40', source: 'mubawab.ma', prefix: 'a:', env: 'CARD_LEDGER_MUBAWAB_REGIONAL_40' },
  { key: 'domio_linked_70', source: 'domio.ma', prefix: 'domio:', env: 'CARD_LEDGER_DOMIO_LINKED' },
  { key: 'domio_resume_after12', source: 'domio.ma', prefix: 'domio:', env: 'CARD_LEDGER_DOMIO_RESUME' },
];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const canonicalField = (field, value) => field === 'city' || field === 'district' ? normalize(value) : Number(value);
const validField = (field, value) => field === 'city' || field === 'district'
  ? typeof value === 'string' && normalize(value).length >= 2 && normalize(value).length <= 75
  : typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= (field === 'price_mad' ? 1e10 : 100000);
const domainAllowed = (source, url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === source || u.hostname === `www.${source}`);
  } catch { return false; }
};
function validateRow(sourceSpec, row) {
  const id = row?.identity;
  if (typeof id !== 'string' || !(sourceSpec.source === 'mubawab.ma' ? /^a:\d+$/.test(id) : /^domio:\d+$/.test(id))) return false;
  if (!domainAllowed(sourceSpec.source, row.canonical_url ?? row.url)) return false;
  if (row.freshness_certified === true || row.active_detail_verified === true || row.cross_source_deduplicated === true) return false;
  return true;
}
function validCompleteCard(row) {
  const flaggedComplete = row.five_field_observed === true || row.five_field_present === true;
  return flaggedComplete && !row.cross_page_conflict && !row.price_ambiguous && !row.surface_ambiguous && !row.district_ambiguous &&
    !(row.cross_page_conflicts?.length > 0) && FIELDS.every(field => validField(field, row[field]));
}
function cleanRecord(row, source) {
  const url = row.canonical_url || row.url;
  return { source, identity: row.identity, canonical_url: url,
    city: row.city ?? null, district: row.district ?? null,
    price_mad: row.price_mad ?? null, surface_m2: row.surface_m2 ?? null };
}
/** Cross-run reconciliation: NEVER fill missing fields by mixing separate cards. */
export function consolidateCardObservations(inputs) {
  const grouped = new Map();
  const perInput = [];
  let rejected = 0;
  for (const input of inputs) {
    if (!INPUTS.some(x => x.key === input.key && x.source === input.source)) throw new Error(`Unknown source descriptor ${input.key}`);
    let accepted = 0, complete = 0;
    for (const row of input.rows) {
      if (!validateRow(input, row)) { rejected++; continue; }
      accepted++; if (validCompleteCard(row)) complete++;
      const identity = `${input.source}|${row.identity}`;
      if (!grouped.has(identity)) grouped.set(identity, []);
      grouped.get(identity).push({ row, key: input.key, source: input.source });
    }
    perInput.push({ input: input.key, observations: input.rows.length, accepted, five_field_cards: complete });
  }
  const rows = [];
  let conflictingRows = 0, allFive = 0;
  const conflictsByField = Object.fromEntries(FIELDS.map(k => [k, 0]));
  for (const [uniqueId, entries] of grouped) {
    const conflictingFields = [];
    for (const field of FIELDS) {
      const evidence = new Set(entries.map(x => x.row[field]).filter(value => validField(field, value)).map(value => canonicalField(field, value)));
      if (evidence.size > 1) { conflictingFields.push(field); conflictsByField[field]++; }
    }
    const completeCards = entries.filter(x => validCompleteCard(x.row));
    const baseline = completeCards[0] ?? entries[0];
    const clean = cleanRecord(baseline.row, baseline.source);
    const complete = conflictingFields.length === 0 && completeCards.length > 0;
    if (!complete) {
      // No first-wins on contradictory values, nor Frankenstein composite from unrelated cards.
      for (const field of conflictingFields) clean[field] = null;
    }
    const item = {
      ...clean, observation_count: entries.length,
      observed_in: [...new Set(entries.map(x => x.key))].sort(),
      cross_run_conflicts: conflictingFields,
      five_field_observed_consistent: complete,
      potential_same_property_other_id: false,
      state: conflictingFields.length ? 'review_conflicting_card_evidence' : complete ? 'observed_five_fields_not_certified' : 'review_missing_fields',
      freshness_certified: false, active_sale_verified: false, cross_source_deduplicated: false,
    };
    rows.push(item);
    if (conflictingFields.length) conflictingRows++;
    if (complete) allFive++;
  }
  const signatures = new Map();
  for (const row of rows) {
    if (!row.five_field_observed_consistent) continue;
    const sig = [normalize(row.city), normalize(row.district), row.price_mad, row.surface_m2].join('|');
    if (!signatures.has(sig)) signatures.set(sig, []);
    signatures.get(sig).push(row);
  }
  let signatureGroups = 0, signatureRows = 0, crossSourceGroups = 0;
  for (const group of signatures.values()) {
    if (group.length < 2) continue;
    signatureGroups++; signatureRows += group.length;
    if (new Set(group.map(x => x.source)).size > 1) crossSourceGroups++;
    for (const row of group) row.potential_same_property_other_id = true;
  }
  rows.sort((a, b) => a.source.localeCompare(b.source) || a.identity.localeCompare(b.identity));
  const bySource = Object.fromEntries([...new Set(rows.map(r => r.source))].sort().map(source => [source, {
    ids: rows.filter(r => r.source === source).length,
    five_fields: rows.filter(r => r.source === source && r.five_field_observed_consistent).length,
    conflicts: rows.filter(r => r.source === source && r.cross_run_conflicts.length).length,
  }]));
  const report = {
    schema_version: 'AKARFINDER_ACQUISITION_LEDGER_V1',
    semantics: 'distinct_source_ids_with_consistent_card_fields_only_no_freshness_or_physical_dedup_certification',
    input_summaries: perInput, raw_card_observations: perInput.reduce((n, x) => n + x.accepted, 0),
    distinct_source_id_count: rows.length, five_field_observed_consistent: allFive,
    cross_run_conflict_rows: conflictingRows, cross_run_conflicts_by_field: conflictsByField,
    suspected_same_property_signature_groups: signatureGroups,
    suspected_same_property_signature_rows: signatureRows,
    candidate_cross_source_signature_groups: crossSourceGroups,
    rejected_untrusted_or_promoted_input_rows: rejected,
    per_source: bySource, commercially_available_verified_count: 0,
    freshness_certified_count: 0, physically_unique_certified_count: 0,
    database_access: 0, database_writes: 0, production_published_count: 0,
    note: 'Candidate signatures are NOT proof of same property; no cross-source merging or publication. Every listing remains review until activity, uniqueness and usage rights are established.',
  };
  return { report, rows };
}
export async function readLedgerInputs(env = process.env) {
  const inputs = [];
  for (const spec of INPUTS) {
    const p = env[spec.env];
    if (!p) throw new Error(`Missing ${spec.env}`);
    const data = await fs.readFile(p, 'utf8');
    const rows = data.split(/\r?\n/).filter(Boolean).map(JSON.parse);
    const sha256 = createHash('sha256').update(data).digest('hex');
    inputs.push({ ...spec, rows, sha256 });
  }
  return inputs;
}
async function main() {
  const inputs = await readLedgerInputs();
  const { report, rows } = consolidateCardObservations(inputs);
  report.input_sha256 = Object.fromEntries(inputs.map(x => [x.key, x.sha256]));
  const prefix = process.env.OUTPUT_PREFIX || 'acquisition-ledger-v1';
  await fs.writeFile(prefix + '.json', JSON.stringify(report, null, 2) + '\n');
  await fs.writeFile(prefix + '.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(JSON.stringify({ ...report, input_sha256: undefined }, null, 2));
  if (rows.length === 0) process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e instanceof Error ? e.message : 'ledger_failed'); process.exitCode = 1; });
}
