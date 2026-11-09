import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function fixture() {
  return {
    schema:"NEIGHBORHOOD_CONTEXT_L3_READ_MODEL_REPORT_V1",
    ok:true,
    network_in_render_path:false,
    source_is_expired:true,
    live_coverage_ready:false,
    findings:[],
    summary:{model_count:6,total_anchors:0},
    historical_fixture:{
      ok:true,as_of:"2026-08-24T20:50:00.000Z",
      summary:{model_count:6,total_anchors:11},
      findings:[],
    },
    models:["agdal","maarif","gueliz","malabata","founty","ville_nouvelle"].map(id=>({
      canonical_neighborhood_id:id,anchor_count:0,anchors:[],
    })),
  };
}
function validate(report) {
  const dir=mkdtempSync(join(tmpdir(),"akarfinder-l3-qa-"));
  try {
    writeFileSync(join(dir,"report.json"),JSON.stringify(report),"utf8");
    return spawnSync(process.execPath,[resolve("scripts/neighborhood-context/l3-validate-report.mjs")],{
      cwd:process.cwd(),env:{...process.env,NCI_L3_OUTPUT_DIR:dir},
      encoding:"utf8",timeout:15000,
    });
  }finally {rmSync(dir,{recursive:true,force:true});}
}

test("correct stale-source L3 technical report passes but stays live-coverage unavailable",()=>{
  const r=validate(fixture());
  assert.equal(r.status,0, r.stderr);
  assert.match(r.stdout,/live_coverage_ready=false/);
});
test("rejects false claim of live coverage",()=>{
  const data=fixture();data.live_coverage_ready=true;
  const r=validate(data);assert.notEqual(r.status,0);
  assert.match(r.stderr,/live coverage readiness misrepresented/);
});
test("rejects resurrected expired seed anchors",()=>{
  const data=fixture();data.summary.total_anchors=1;
  data.models[0].anchors=[{poi_id:"osm:node:1",source_id:"openstreetmap",freshness_status:"fresh",attribution:"© OSM",observed_at:"2026-08-16T11:08:32Z"}];
  data.models[0].anchor_count=1;
  const r=validate(data);assert.notEqual(r.status,0);
  assert.match(r.stderr,/expired seed must not publish/);
});
test("rejects missing model payload despite claimed model_count",()=>{
  const data=fixture();delete data.models;
  const r=validate(data);assert.notEqual(r.status,0);
  assert.match(r.stderr,/six actual models/);
});
test("rejects historical fixture without its proven August 2026 anchors",()=>{
  const data=fixture();data.historical_fixture.summary.total_anchors=0;
  const r=validate(data);assert.notEqual(r.status,0);
  assert.match(r.stderr,/historical regression fixture failed/);
});
