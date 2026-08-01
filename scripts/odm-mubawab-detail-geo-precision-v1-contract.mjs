import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260801014500_odm_mubawab_detail_geo_precision_v1.sql','utf8');
const required=['mubawab.ma','english_sale_token_false_city','canonical_url_token_match','normalized_city = null','document_kind = \'LISTING\'','^https://mubawab\\.ma/(fr|en)/a/[0-9]+/','normalized_city is not null','normalized_property_type is not null','normalized_intent is not null','service_role'];
for(const token of required){if(!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);}
for(const forbidden of ["set display_eligibility = 'eligible_primary'",'delete from','http_get(','net.http_']){if(sql.toLowerCase().includes(forbidden)) throw new Error(`Forbidden contract token: ${forbidden}`);}
if(sql.includes('/is/')) throw new Error('Mubawab category pages must not be promoted');
console.log('ODM Mubawab detail geo precision V1 contract passed');
