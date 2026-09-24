import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecoverySerperQueries,
  RECOVERY_SERPER_QUERY_BUDGET,
  RECOVERY_SERPER_SOURCE_ALLOCATION,
} from "../recovery-serper-plan";

test("recovery Serper plan is exactly 1900 unique approved-source-focused queries", () => {
  const rows=buildRecoverySerperQueries();
  assert.equal(rows.length,RECOVERY_SERPER_QUERY_BUDGET);
  assert.equal(new Set(rows.map(r=>r.query)).size,rows.length);
  assert.equal(RECOVERY_SERPER_SOURCE_ALLOCATION.reduce((n,r)=>n+r.count,0),1900);
  assert.ok(rows.some(r=>r.query.includes("site:mubawab.ma")));
  assert.ok(rows.some(r=>r.query.includes("site:avito.ma")));
  assert.ok(rows.some(r=>r.query.includes("site:sarout.ma") && r.query.includes("inurl:/annonce/")));
  assert.ok(rows.some(r=>r.query.includes("site:marocannonces.com") && r.query.includes("inurl:/annonce/")));
  assert.equal(rows.some(r=>/site:(sakane|dabaannonce|afribaba|darkom)\b/.test(r.query)),false);
});
