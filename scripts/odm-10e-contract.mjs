import fs from 'node:fs';
const a=fs.readFileSync('supabase/migrations/20260727170000_odm_10e_tier_d_enrichment.sql','utf8');
const b=fs.readFileSync('supabase/migrations/20260727170500_odm_10e_delta_quality_recompute.sql','utf8');
for (const token of ['canonical_url_token_match','odm_10e_type_from_url','odm_10e_intent_from_url','ranking_rows_changed']) {
  if (!(a+b).includes(token)) throw new Error(`missing ${token}`);
}
if ((a+b).match(/normalized_price_mad\s*=/i)) throw new Error('ODM-10E must not infer price');
if ((a+b).match(/normalized_surface_m2\s*=/i)) throw new Error('ODM-10E must not infer surface');
if ((a+b).match(/ranking_quality_boost\s*=/i)) throw new Error('ODM-10E must not alter ranking');
if (!b.includes('quality_tier=\'D\'')) throw new Error('enrichment must remain Tier-D scoped');
console.log('ODM-10E contract OK');
