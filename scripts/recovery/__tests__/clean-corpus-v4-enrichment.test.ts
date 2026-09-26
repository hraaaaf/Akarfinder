import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";

test("V4 enrichment merge preserves classification/import gate and flags conflicts", () => {
  const root=mkdtempSync(join(tmpdir(),"akarfinder-v4-"));
  const deep=join(root,"deep"); mkdirSync(deep);
  const base=join(root,"base.jsonl.gz");
  const out=join(root,"out.jsonl.gz");
  const row={
    canonical_url:"https://example.com/listing/1",
    source_domain:"example.com",
    classification:"KEEP",
    approved_for_import:false,
    price_mad:1000000,
    city:null,
    contradiction_flags:[],
    field_sources:{}
  };
  writeFileSync(base,gzipSync(Buffer.from(JSON.stringify(row)+"\n")));
  writeFileSync(join(deep,"deep-batch-example-0-1.json"),JSON.stringify([{
    url:"https://example.com/listing/1",
    domain:"example.com",
    http_status:200,
    robots_decision:"allow",
    city:"Rabat",
    price_mad:1200000,
    title:"Appartement test"
  }]));
  const run=spawnSync(process.execPath,["--import","tsx","scripts/recovery/merge-clean-corpus-v4-enrichment.ts"],{
    cwd:process.cwd(),
    env:{...process.env,BASE_V4_JSONL_GZ:base,DEEP_RESULTS_DIR:deep,OUT_V4_JSONL_GZ:out},
    encoding:"utf8"
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  const merged=JSON.parse(gunzipSync(readFileSync(out)).toString("utf8").trim());
  assert.equal(merged.classification,"KEEP");
  assert.equal(merged.approved_for_import,false);
  assert.equal(merged.city,"Rabat");
  assert.equal(merged.title,"Appartement test");
  assert.equal(merged.price_mad,1000000);
  assert.ok(merged.contradiction_flags.includes("enrichment_conflict:price_mad"));
  assert.deepEqual(merged.field_sources.city,["deep_public:example.com"]);
  const manifest=JSON.parse(readFileSync(out.replace(/\.jsonl\.gz$/,"-manifest.json"),"utf8"));
  assert.equal(manifest.rows,1);
  assert.equal(manifest.approved_for_import_rows,0);
  assert.equal(manifest.classifications.KEEP,1);
  assert.equal(manifest.contradictions,1);
});
