import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";

/**
 * Technical CI remains network-free. These are direct tests of the ORIGINAL
 * strict source-availability gates, which are executed separately on main.
 * All records below are synthetic and must NEVER be published as POIs.
 */
function runGate(level,report){
  const tmp=mkdtempSync(join(tmpdir(),`akarfinder-${level}-strict-`));
  try {
    writeFileSync(join(tmp,"report.json"),JSON.stringify(report),"utf8");
    return spawnSync(process.execPath,[resolve(`scripts/neighborhood-context/${level}-validate-report.mjs`)],{
      cwd:process.cwd(),
      env:{...process.env,[level==="l1"?"NCI_L1_OUTPUT_DIR":"NCI_L2_OUTPUT_DIR"]:tmp},
      encoding:"utf8",timeout:10000,
    });
  }finally {rmSync(tmp,{recursive:true,force:true});}
}
function l1Zero(){
  return {
    ok:false,truth_findings:[],minimum_available_pilots:4,
    summary:{available_pilots:0,pilot_count:6,total_pois:0,certified_seed_pilots:0,live_pilots:0},
    pilots:[]
  };
}
function l2Zero(){
  return {
    ok:false,truth_findings:[],
    summary:{pilot_count:6,total_anchors:0,inside_relations:0,ready_pilots:0,partial_pilots:0},
    pilots:[],
  };
}
test("STRICT L1: six degraded pilots and zero POIs never pass the live gate",()=>{
  const r=runGate("l1",l1Zero());
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Neighborhood Context L1 gate failed/);
});
test("STRICT L1: even a falsified report.ok cannot bypass the unchanged 4\/6 pilot threshold",()=>{
  const r=runGate("l1",{...l1Zero(),ok:true});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Available pilot threshold not met/);
});
test("STRICT L1: an invented available pilot without run provenance does not pass",()=>{
  const sample=l1Zero();
  sample.ok=true;sample.summary.available_pilots=4;
  sample.summary.certified_seed_pilots=1;
  sample.certified_seed={};
  const r=runGate("l1",sample);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/requires explicit source run provenance/);
});
test("STRICT L2: zero anchors never pass the live gate",()=>{
  const r=runGate("l2",l2Zero());
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Neighborhood Context L2 gate failed/);
});
test("STRICT L2: report.ok cannot bypass the five-anchor truth gate",()=>{
  const r=runGate("l2",{...l2Zero(),ok:true});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/At least five truth-safe anchors/);
});
test("STRICT L2: no uncertified inside-boundary relations allowed",()=>{
  const sample=l2Zero();
  sample.ok=true;sample.summary.total_anchors=5;sample.summary.inside_relations=1;
  const r=runGate("l2",sample);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/unexpectedly published inside-boundary relations/);
});
test("STRICT L2: any unresolved or falsely inside anchor is rejected",()=>{
  for(const anchor of [
    {poi_id:"synthetic:1",category:"education",relation:"unresolved",territorial_wording:"À proximité"},
    {poi_id:"synthetic:2",category:"health",relation:"near_certified_reference",territorial_wording:"Dans le quartier"},
  ]){
    const sample=l2Zero();
    sample.ok=true;
    sample.summary.total_anchors=5;
    sample.pilots=[{canonical_neighborhood_id:"synthetic-qa",anchors:[anchor]}];
    const r=runGate("l2",sample);
    assert.notEqual(r.status,0);
    assert.match(r.stderr,/Unresolved anchor published|False inside wording/);
  }
});
