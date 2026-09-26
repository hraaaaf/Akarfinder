import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const gz=(path,rows)=>writeFileSync(path,gzipSync(Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n")));

test("clean corpus v4 classifier is conservative and fail-safe",()=>{
  const root=mkdtempSync(join(tmpdir(),"akarfinder-v4-classifier-"));
  const input=join(root,"in.jsonl.gz"), output=join(root,"out.jsonl.gz"), manifest=join(root,"manifest.json");
  gz(input,[
    {canonical_url:"https://mubawab.ma/fr/a/9999999/example",candidate_kind:"unverified_listing_candidate",classification_confidence:"low",classification_reasons:[]},
    {canonical_url:"https://example.test/category",candidate_kind:"category_or_index",classification_confidence:"low",classification_reasons:[]},
    {canonical_url:"https://avito.ma/fr/x/local/example_54965575.htm",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:[]},
    {canonical_url:"https://example.test/p/503",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:[],deep_http_status:503},
    {canonical_url:"https://example.test/p/200",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:[],deep_http_status:200},
    {canonical_url:"https://agenz.ma/en/annonces/immo-rabat/vente-appartements/agdal/123456",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:["thin_document_kind:AMBIGUOUS","recovery_source_specific_listing_route"]},
    {canonical_url:"https://sarout.ma/fr/annonce/123456/exemple",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:["recovery_source_specific_listing_route"]},
    {canonical_url:"https://avito.ma/fr/agdal/locations_de_vacances/Appartement_12345678.htm",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:["recovery_source_specific_listing_route"]},
    {canonical_url:"https://atlasimmobilier.com/en/p/apartment-sold-quickly-in-essaouira",candidate_kind:"detail_likely",classification_confidence:"medium",classification_reasons:["recovery_source_specific_listing_route"]},
    {canonical_url:"https://mubawab.ma/fr/a/9999998/appartement-vendu-meuble",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:["recovery_source_specific_listing_route"]}
  ]);
  const run=spawnSync(process.execPath,["scripts/recovery/classify-clean-corpus-v4.mjs","--input",input,"--output",output,"--manifest",manifest],{cwd:process.cwd(),encoding:"utf8"});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const rows=gunzipSync(readFileSync(output)).toString("utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rows.length,10);
  assert.equal(rows[0].classification,"KEEP");
  assert.equal(rows[0].candidate_kind,"detail_likely");
  assert.equal(rows[0].approved_for_import,false);
  assert.equal(rows[0].identity_confidence,"medium");
  assert.equal(rows[0].lifecycle_confidence,"low");
  assert.equal(rows[1].classification,"NON_REAL_ESTATE");
  assert.equal(rows[2].classification,"EXPIRED");
  assert.equal(rows[3].classification,"KEEP");
  assert.equal(rows[4].classification,"KEEP");
  assert.equal(rows[4].classification_confidence,"high");
  assert.equal(rows[4].identity_confidence,"high");
  assert.equal(rows[4].lifecycle_confidence,"high");
  assert.equal(rows[5].classification,"KEEP");
  assert.equal(rows[5].classification_confidence,"medium");
  assert.ok(rows[5].classification_reasons.includes("source_specific_individual_route_resolves_thin_ambiguity"));
  assert.equal(rows[6].classification,"KEEP");
  assert.equal(rows[6].lifecycle_confidence,"medium");
  assert.ok(rows[6].classification_reasons.includes("public_sitemap_snapshot_2026-09-25_full_low_cohort_coverage"));
  assert.equal(rows[7].classification,"KEEP");
  assert.equal(rows[7].scope_eligible,false);
  assert.ok(rows[7].scope_exclusion_reasons.includes("short_stay_route"));
  assert.equal(rows[8].classification,"EXPIRED");
  assert.equal(rows[8].scope_eligible,false);
  assert.ok(rows[8].classification_reasons.includes("source_specific_terminal_sold_route"));
  assert.equal(rows[9].classification,"KEEP");
  assert.equal(rows[9].scope_eligible,true);
  const m=JSON.parse(readFileSync(manifest,"utf8"));
  assert.deepEqual(m.classification_counts,{KEEP:7,EXPIRED:2,NON_REAL_ESTATE:1});
  assert.equal(m.identity_confidence_counts.medium,6);
  assert.equal(m.lifecycle_confidence_counts.high,4);\n  assert.equal(m.scope_counts.short_stay,1);\n  assert.equal(m.scope_counts.ineligible,3);
  assert.equal(m.approved_for_import_rows,0);
  assert.equal(m.database_access,0);
  assert.equal(m.database_writes,0);
});
\n// V4.8 scope/lifecycle regression gate.\n