import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20260728130000_odm_typed_surfaces_freshness_source_policy_v1.sql';
const migration = readFileSync(migrationPath,'utf8');

const required = [
  'odm_audit_canonical_domain_v1','odm_audit_source_policy_resolution_v1',
  'odm_audit_surface_candidates_v1','odm_audit_freshness_assessment_v2',
  'odm_audit_typed_surface_freshness_v1','odm_audit_surface_freshness_source_report_v1',
  'living_surface_m2','built_surface_m2','plot_surface_m2','terrace_surface_m2',
  'garden_surface_m2','commercial_surface_m2','usable_surface_m2','unknown_surface_m2',
  'missing_policy','ambiguous_policy_alias','resolved_policy','freshness_status_v2',
  'freshness_confidence','no_unknown_surface_publication','no_rejected_surface_publication',
  'no_ambiguous_policy_publication','no_missing_policy_publication',
  'no_untrusted_freshness_publication','all_surface_candidates_are_provenanced',
];
for (const token of required) assert.ok(migration.includes(token),`missing token: ${token}`);

const forbidden = [
  /update\s+public\.thin_index_search_documents/i,/insert\s+into\s+public\.thin_index_search_documents/i,
  /delete\s+from\s+public\.thin_index_search_documents/i,/update\s+public\.property_listings/i,
  /insert\s+into\s+public\.property_listings/i,/delete\s+from\s+public\.property_listings/i,
  /display_eligibility\s*=/i,/ranking_quality_boost\s*=/i,/fetch\s*\(/i,
  /axios/i,/playwright/i,/captcha/i,/proxy/i,
];
for (const pattern of forbidden) assert.equal(pattern.test(migration),false,`forbidden behavior: ${pattern}`);

function canonicalDomain(input) {
  return input.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'');
}
assert.equal(canonicalDomain('https://www.Example.ma'),'example.ma');
assert.equal(canonicalDomain('WWW.EXAMPLE.MA'),'example.ma');
assert.notEqual(canonicalDomain('annonces.example.ma'),'example.ma','subdomains must not silently collapse to parent domains');

const surfacePattern = /((?:surface\s+(?:habitable|construite|bâtie|batisse|utile|commerciale)|terrain|parcelle|lot|terrasse|jardin|local\s+commercial)?[^0-9]{0,24}([0-9]{1,6}(?:[.,][0-9]+)?)\s*(?:m2|m²))/giu;
function parseSurfaces(text) {
  const out=[];
  for (const match of text.matchAll(surfacePattern)) {
    const raw=match[1]; const value=Number(match[2].replace(',','.')); const fragment=raw.toLowerCase();
    if (value<9||value>100000) continue;
    let type='unknown_surface_m2';
    if (/(surface\s+habitable|habitable)/u.test(fragment)) type='living_surface_m2';
    else if (/(surface\s+(construite|bâtie|batisse)|construite|bâtie)/u.test(fragment)) type='built_surface_m2';
    else if (/(terrain|parcelle|lot)/u.test(fragment)) type='plot_surface_m2';
    else if (/terrasse/u.test(fragment)) type='terrace_surface_m2';
    else if (/jardin/u.test(fragment)) type='garden_surface_m2';
    else if (/(surface\s+commerciale|local\s+commercial)/u.test(fragment)) type='commercial_surface_m2';
    else if (/(surface\s+utile|utile)/u.test(fragment)) type='usable_surface_m2';
    out.push({value,type,rejected:type==='unknown_surface_m2'});
  }
  return out;
}
const fixtures=[
  ['Surface habitable 120 m²',120,'living_surface_m2',false],
  ['Surface construite 145 m2',145,'built_surface_m2',false],
  ['Terrain 2 000 m²',2000,'plot_surface_m2',false],
  ['Terrasse 35 m²',35,'terrace_surface_m2',false],
  ['Jardin 80 m²',80,'garden_surface_m2',false],
  ['Local commercial 300 m²',300,'commercial_surface_m2',false],
  ['Surface utile 95,5 m²',95.5,'usable_surface_m2',false],
  ['Appartement 120 m²',120,'unknown_surface_m2',true],
];
for (const [text,value,type,rejected] of fixtures) {
  const result=parseSurfaces(text); assert.equal(result.length,1,text);
  assert.equal(result[0].value,value,text); assert.equal(result[0].type,type,text); assert.equal(result[0].rejected,rejected,text);
}
for (const text of ['Téléphone 06 12 34 56 78','Prix 1 650 000 DH','3 chambres et 2 salles de bain']) assert.deepEqual(parseSurfaces(text),[],text);

function freshness(ageDays,expectedDays,{archive=false,confirmed=true,timestamp=true}={}) {
  if (!timestamp) return ['unconfirmed_timestamp',0];
  if (archive&&!confirmed) return ['archive_unconfirmed',0.1];
  if (ageDays<=expectedDays) return ['fresh',Math.max(0.70,1-(ageDays/expectedDays)*0.30)];
  if (ageDays<=expectedDays*2) return ['aging',Math.max(0.30,0.70-((ageDays-expectedDays)/expectedDays)*0.40)];
  return ['stale',0.10];
}
assert.equal(freshness(5,21)[0],'fresh');
assert.equal(freshness(30,21)[0],'aging');
assert.equal(freshness(50,21)[0],'stale');
assert.equal(freshness(1,45,{archive:true,confirmed:false})[0],'archive_unconfirmed');
assert.equal(freshness(0,21,{timestamp:false})[0],'unconfirmed_timestamp');

console.log('ODM-SURFACE-FRESHNESS-SOURCE-01 contract OK');
