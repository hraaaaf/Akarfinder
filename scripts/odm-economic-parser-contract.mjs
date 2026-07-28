import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260728123000_odm_economic_parser_v1.sql';
const migration = readFileSync(migrationPath, 'utf8');

const required = [
  'odm_audit_economic_candidates_v1',
  'odm_audit_atomic_observation_v1',
  'odm_audit_economic_validation_v1',
  'odm_audit_economic_parser_report_v1',
  'observation_id',
  'raw_fragment',
  'normalized_fragment',
  'parser_version',
  'economic_type',
  'rejection_reason',
  'price_per_m2',
  'rent_monthly',
  'rent_daily',
  'rent_weekly',
  'old_price',
  'starting_price',
  'sale_total',
  'unknown_price',
  'no_cross_observation_field_mixing',
  'no_unknown_price_publication',
  'no_rejected_price_publication',
  'all_selected_candidates_are_provenanced',
];
for (const token of required) {
  assert.ok(migration.includes(token), `missing SQL contract token: ${token}`);
}

const forbidden = [
  /update\s+public\.thin_index_search_documents/i,
  /insert\s+into\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /update\s+public\.property_listings/i,
  /insert\s+into\s+public\.property_listings/i,
  /display_eligibility\s*=/i,
  /ranking_quality_boost\s*=/i,
  /fetch\s*\(/i,
  /axios/i,
  /playwright/i,
  /captcha/i,
  /proxy/i,
];
for (const pattern of forbidden) {
  assert.equal(pattern.test(migration), false, `forbidden behavior: ${pattern}`);
}

const amountPattern = /((?:ancien\s+prix|prix\s+barr[ée]|au\s+lieu\s+de|[àa]\s+partir\s+de|dès|des)?\s*([0-9]{1,3}(?:[ .,'’\-][0-9]{3})+|[0-9]{4,10})\s*(mad|dhs?|dh)(?:\s*(?:\/|par)\s*(m2|m²|mois|month|jour|day|semaine|week))?)/giu;

function parseEconomic(text, evidenceSource = 'title', observationId = 'fixture:1') {
  const values = [];
  for (const match of text.matchAll(amountPattern)) {
    const rawFragment = match[1];
    const valueMad = Number(match[2].replace(/[^0-9]/g, ''));
    const cadence = (match[4] ?? '').toLowerCase();
    const fragment = rawFragment.toLowerCase();
    const whole = text.toLowerCase();
    if (valueMad < 500 || valueMad > 1_000_000_000) continue;

    let economicType = 'unknown_price';
    if (['m2', 'm²'].includes(cadence)) economicType = 'price_per_m2';
    else if (['mois', 'month'].includes(cadence)) economicType = 'rent_monthly';
    else if (['jour', 'day'].includes(cadence)) economicType = 'rent_daily';
    else if (['semaine', 'week'].includes(cadence)) economicType = 'rent_weekly';
    else if (/(ancien\s+prix|prix\s+barr[ée]|au\s+lieu\s+de)/u.test(fragment)) economicType = 'old_price';
    else if (/([àa]\s+partir\s+de|dès|des)/u.test(fragment)) economicType = 'starting_price';
    else if (/(loyer|location|[àa]\s+louer)/u.test(whole)) economicType = 'rent_monthly';
    else if (/(vente|[àa]\s+vendre)/u.test(whole)) economicType = 'sale_total';

    let rejectionReason = null;
    if (economicType === 'unknown_price') rejectionReason = 'economic_context_unconfirmed';
    if (economicType === 'old_price') rejectionReason = 'historical_price_not_publicable';
    if (economicType === 'starting_price') rejectionReason = 'starting_price_not_exact';
    if (economicType === 'price_per_m2') rejectionReason = 'unit_price_not_total_price';

    values.push({ valueMad, economicType, evidenceSource, observationId, rawFragment, rejectionReason });
  }
  return values;
}

const fixtures = [
  { text: 'Appartement à vendre 1.650.000 DH', value: 1_650_000, type: 'sale_total', rejection: null },
  { text: 'Appartement à vendre 1 650 000 MAD', value: 1_650_000, type: 'sale_total', rejection: null },
  { text: 'Appartement à vendre 1-650-000 DH', value: 1_650_000, type: 'sale_total', rejection: null },
  { text: 'Location longue durée 8 500 DH/mois', value: 8_500, type: 'rent_monthly', rejection: null },
  { text: 'Location vacances 900 DH/jour', value: 900, type: 'rent_daily', rejection: null },
  { text: 'Terrain à vendre 12 000 DH/m²', value: 12_000, type: 'price_per_m2', rejection: 'unit_price_not_total_price' },
  { text: 'Ancien prix 1 900 000 DH', value: 1_900_000, type: 'old_price', rejection: 'historical_price_not_publicable' },
  { text: 'À partir de 650 000 DH', value: 650_000, type: 'starting_price', rejection: 'starting_price_not_exact' },
  { text: 'Référence 1650000 — prix 650 000 DH', value: 650_000, type: 'unknown_price', rejection: 'economic_context_unconfirmed' },
];

for (const fixture of fixtures) {
  const candidates = parseEconomic(fixture.text);
  assert.equal(candidates.length, 1, `expected one candidate: ${fixture.text}`);
  assert.equal(candidates[0].valueMad, fixture.value, `wrong value: ${fixture.text}`);
  assert.equal(candidates[0].economicType, fixture.type, `wrong type: ${fixture.text}`);
  assert.equal(candidates[0].rejectionReason, fixture.rejection, `wrong rejection: ${fixture.text}`);
  assert.equal(candidates[0].observationId, 'fixture:1');
  assert.equal(candidates[0].evidenceSource, 'title');
}

const negatives = [
  'Appartement 120 m² avec 3 chambres',
  'Téléphone 06 12 34 56 78',
  'Référence annonce 1650000',
  'Surface 1.650.000 m²',
];
for (const text of negatives) {
  assert.deepEqual(parseEconomic(text), [], `false positive: ${text}`);
}

const ambiguous = parseEconomic('À vendre : ancien prix 1 900 000 DH, nouveau prix 1 650 000 DH');
assert.equal(ambiguous.length, 2, 'two economic values must remain ambiguous until reconciliation');
assert.equal(ambiguous[0].economicType, 'old_price');
assert.equal(ambiguous[1].economicType, 'sale_total');

console.log('ODM-ECONOMIC-PARSER-01 contract OK');
