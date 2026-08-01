import fs from 'node:fs';
const path='supabase/migrations/20260801011500_odm_avito_detail_precision_v1.sql';
const sql=fs.readFileSync(path,'utf8');
const required=['avito.ma','document_kind = \'LISTING\'','vertical_classification = \'real_estate_likely\'','normalized_city is not null','normalized_property_type is not null','normalized_intent is not null','appartements|terrains_et_fermes|villas_et_riads','service_role'];
for(const token of required){if(!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);}
for(const forbidden of ["set display_eligibility = 'eligible_primary'",'delete from','http_get(','net.http_']){if(sql.toLowerCase().includes(forbidden)) throw new Error(`Forbidden contract token: ${forbidden}`);}
if(sql.includes('/chambre/')||sql.includes('/colocations/')) throw new Error('Unsafe Avito categories included');
console.log('ODM Avito detail precision V1 contract passed');
