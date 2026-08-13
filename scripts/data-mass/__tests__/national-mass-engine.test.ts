import test from "node:test";
import assert from "node:assert/strict";
import { evaluateNationalMassEngine } from "../national-mass-engine";

test("MASS-6 blocks at POLICY when discovery/classification pass but policy does not", () => {
  const r = evaluateNationalMassEngine({DISCOVER:true,CLASSIFY:true,POLICY:false,INDEX:false,FRESHNESS:false,DEDUP:false,RANK:false});
  assert.equal(r.blockedAt, "POLICY");
  assert.equal(r.rankEligible, false);
});

test("MASS-6 rejects downstream bypass", () => {
  const r = evaluateNationalMassEngine({DISCOVER:true,CLASSIFY:true,POLICY:false,INDEX:true,FRESHNESS:true,DEDUP:true,RANK:true});
  assert.equal(r.blockedAt, "POLICY");
  assert.equal(r.rankEligible, false);
  assert.equal(r.databaseWrites, 0);
  assert.equal(r.searchActivations, 0);
});

test("MASS-6 reaches rank only when every ordered stage passes", () => {
  const r = evaluateNationalMassEngine({DISCOVER:true,CLASSIFY:true,POLICY:true,INDEX:true,FRESHNESS:true,DEDUP:true,RANK:true});
  assert.equal(r.blockedAt, null);
  assert.equal(r.rankEligible, true);
});
