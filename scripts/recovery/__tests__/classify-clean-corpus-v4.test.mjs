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
    {canonical_url:"https://example.test/p/200",candidate_kind:"detail_likely",classification_confidence:"low",classification_reasons:[],deep_http_status:200}
  ]);
  const run=spawnSync(process.execPath,["scripts/recovery/classify-clean-corpus-v4.mjs","--input",input,"--output",output,"--manifest",manifest],{cwd:process.cwd(),encoding:"utf8"});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const rows=gunzipSync(readFileSync(output)).toString("utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rows.length,5);
  assert.equal(rows[0].classification,"KEEP");
  assert.equal(rows[0].candidate_kind,"detail_likely");
  assert.equal(rows[0].approved_for_import,false);
  assert.equal(rows[1].classification,"NON_REAL_ESTATE");
  assert.equal(rows[2].classification,"EXPIRED");
  assert.equal(rows[3].classification,"KEEP");
  assert.equal(rows[4].classification,"KEEP");
  assert.equal(rows[4].classification_confidence,"high");
  const m=JSON.parse(readFileSync(manifest,"utf8"));
  assert.deepEqual(m.classification_counts,{KEEP:3,EXPIRED:1,NON_REAL_ESTATE:1});
  assert.equal(m.approved_for_import_rows,0);
  assert.equal(m.database_access,0);
  assert.equal(m.database_writes,0);
});
