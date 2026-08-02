import fs from 'node:fs';

const path='supabase/migrations/20260802134500_authorized_public_sitemap_acquisition_v1.sql';
const sql=fs.readFileSync(path,'utf8');
const required=[
  "seed_provider='public_sitemap'",
  "resolved_display_policy='canonical_link_only'",
  "'public_sitemap'",
  "'canonical_link_only'",
  "'detail_fetch',false",
  "'content_reuse',false",
  "'shadow_only',true",
  "'public_activation',false",
  'on conflict do nothing',
  'no_content_copied',
  'no_detail_fetch',
  'no_content_reuse',
  'no_duplicates',
  'rollback_sql',
  'service_role'
];
for(const token of required){if(!sql.includes(token)) throw new Error(`Missing contract token: ${token}`);}
if(/insert into public\.thin_index|update public\.thin_index/i.test(sql)) throw new Error('Thin Index mutation forbidden');
if(/title\s*,\s*snippet[\s\S]*observation_title|observation_snippet/i.test(sql)) throw new Error('Content copy forbidden');
console.log('Authorized Public Sitemap Acquisition V1 contract: PASS');
