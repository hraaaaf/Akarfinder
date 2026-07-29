import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260729173000_odm_typed_economic_candidates_v2.sql','utf8');

for (const token of [
  'odm_audit_economic_candidates_v2','odm_audit_economic_validation_v2','odm_audit_economic_parser_report_v2',
  'sale_total','rent_monthly','rent_daily','rent_weekly','price_per_m2','starting_price','old_price',
  'discounted_price','deposit','charges','agency_fee','unknown_price',
  'candidate_id','field_path','observation_id','observed_at','raw_fragment','normalized_fragment','parser_version',
  'price_range_requires_reconciliation','ancillary_amount_not_listing_price',
  'no_ancillary_amount_publication','no_historical_or_unit_price_publication','no_range_publication',
  "'publication_eligible',false","'ranking_eligible',false",
]) assert.ok(migration.includes(token),`missing token: ${token}`);

for (const pattern of [
  /update\s+public\.thin_index_search_documents/i,
  /insert\s+into\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,
  /update\s+public\.property_listings/i,
  /insert\s+into\s+public\.property_listings/i,
  /delete\s+from\s+public\.property_listings/i,
  /display_eligibility\s*=/i,
  /ranking_quality_boost\s*=/i,
  /publication_eligible'\s*,\s*true/i,
  /ranking_eligible'\s*,\s*true/i,
]) assert.equal(pattern.test(migration),false,`forbidden behavior: ${pattern}`);

function classify(text) {
  const t=text.toLowerCase();
  if (/\/\s*(m2|m²)|par\s+(m2|m²)/u.test(t)) return ['price_per_m2',true];
  if (/caution|dépôt de garantie|depot de garantie/u.test(t)) return ['deposit',true];
  if (/charges?|syndic|frais mensuel/u.test(t)) return ['charges',true];
  if (/frais d.?agence|commission agence|honoraires/u.test(t)) return ['agency_fee',true];
  if (/ancien prix|prix barré|au lieu de/u.test(t)) return ['old_price',true];
  if (/prix promo|prix réduit|promotion|remise/u.test(t)) return ['discounted_price',false];
  if (/à partir de|a partir de|dès/u.test(t)) return ['starting_price',true];
  if (/\/\s*jour|par jour/u.test(t)) return ['rent_daily',false];
  if (/\/\s*semaine|par semaine/u.test(t)) return ['rent_weekly',false];
  if (/\/\s*mois|par mois|loyer|à louer|a louer/u.test(t)) return ['rent_monthly',false];
  if (/vente|à vendre|a vendre/u.test(t)) return ['sale_total',false];
  return ['unknown_price',true];
}

const fixtures=[
  ['Appartement à vendre 1 250 000 DH','sale_total',false],
  ['Loyer 8 500 DH par mois','rent_monthly',false],
  ['Location 900 DH / jour','rent_daily',false],
  ['Location 4 000 DH / semaine','rent_weekly',false],
  ['Prix 14 500 DH / m²','price_per_m2',true],
  ['Ancien prix 1 400 000 DH','old_price',true],
  ['À partir de 950 000 DH','starting_price',true],
  ['Prix promo 1 150 000 DH','discounted_price',false],
  ['Caution 20 000 DH','deposit',true],
  ['Charges syndic 600 DH','charges',true],
  ["Frais d'agence 12 000 DH",'agency_fee',true],
  ['Montant 123 456 DH','unknown_price',true],
];
for (const [text,type,rejected] of fixtures) assert.deepEqual(classify(text),[type,rejected],text);

assert.match(migration,/metadata\.public_index_result\.title/);
assert.match(migration,/metadata\.serper_search\.snippet/);
assert.match(migration,/thin_index\.title/);
assert.match(migration,/revoke all on public\.odm_audit_economic_validation_v2 from public,anon,authenticated/);
assert.match(migration,/grant select on public\.odm_audit_economic_validation_v2 to service_role/);

console.log('ODM-TYPED-ECONOMIC-CANDIDATES-V2 contract OK');