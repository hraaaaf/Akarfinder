import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";

test("V4 enrichment merge preserves gates and upgrades lifecycle only on HTTP 200", () => {
  const root=mkdtempSync(join(tmpdir(),"akarfinder-v4-"));
  const deep=join(root,"deep"); mkdirSync(deep);
  const base=join(root,"base.jsonl.gz");
  const out=join(root,"out.jsonl.gz");
  const rows=[
    {
      canonical_url:"https://example.com/listing/1",
      source_domain:"example.com",
      classification:"KEEP",
      lifecycle_confidence:"medium",
      approved_for_import:false,
      price_mad:1000000,
      city:null,
      contradiction_flags:[],
      classification_reasons:[],
      field_sources:{}
    },
    {
      canonical_url:"https://example.com/listing/2",
      source_domain:"example.com",
      classification:"KEEP",
      lifecycle_confidence:"low",
      approved_for_import:false,
      price_mad:null,
      city:null,
      contradiction_flags:[],
      classification_reasons:[],
      field_sources:{}
    }
  ];
  writeFileSync(base,gzipSync(Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n")));
  writeFileSync(join(deep,"deep-batch-example-0-2.json"),JSON.stringify([
    {
      url:"https://example.com/listing/1",
      domain:"example.com",
      http_status:200,
      robots_decision:"allow",
      city:"Rabat",
      price_mad:1200000,
      title:"Appartement test"
    },
    {
      url:"https://example.com/listing/2",
      domain:"example.com",
      http_status:503,
      robots_decision:"allow"
    }
  ]));
  const run=spawnSync(process.execPath,["--import","tsx","scripts/recovery/merge-clean-corpus-v4-enrichment.ts"],{
    cwd:process.cwd(),
    env:{...process.env,BASE_V4_JSONL_GZ:base,DEEP_RESULTS_DIR:deep,OUT_V4_JSONL_GZ:out},
    encoding:"utf8"
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  const merged=gunzipSync(readFileSync(out)).toString("utf8").trim().split("\n").map(JSON.parse);
  assert.equal(merged.length,2);
  assert.equal(merged[0].classification,"KEEP");
  assert.equal(merged[0].approved_for_import,false);
  assert.equal(merged[0].lifecycle_confidence,"high");
  assert.ok(merged[0].classification_reasons.includes("deep_public_http_200"));
  assert.equal(merged[0].city,"Rabat");
  assert.equal(merged[0].title,"Appartement test");
  assert.equal(merged[0].price_mad,1000000);
  assert.ok(merged[0].contradiction_flags.includes("enrichment_conflict:price_mad"));
  assert.deepEqual(merged[0].field_sources.city,["deep_public:example.com"]);
  assert.equal(merged[1].classification,"KEEP");
  assert.equal(merged[1].lifecycle_confidence,"low");
  assert.equal(merged[1].approved_for_import,false);
  const manifest=JSON.parse(readFileSync(out.replace(/\.jsonl\.gz$/,"-manifest.json"),"utf8"));
  assert.equal(manifest.rows,2);
  assert.equal(manifest.approved_for_import_rows,0);
  assert.equal(manifest.classifications.KEEP,2);
  assert.equal(manifest.contradictions,1);
  assert.equal(manifest.lifecycle_upgrades_to_high,1);
  assert.equal(manifest.lifecycle_conflicts,0);
});
