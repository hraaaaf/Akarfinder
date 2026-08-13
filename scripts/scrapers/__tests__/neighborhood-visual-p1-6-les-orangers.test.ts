import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LES_ORANGERS_IMMOBILIER_VISUAL, LES_ORANGERS_LIFESTYLE_VISUAL, LES_ORANGERS_NEIGHBORHOOD_VISUALS, LES_ORANGERS_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/les-orangers-neighborhood-visuals";

const fixture=readFileSync("components/search/LesOrangersNeighborhoodVisualQAFixture.tsx","utf8");
const route=readFileSync("app/visual-qa/les-orangers/page.tsx","utf8");
const audit=readFileSync("scripts/audits/neighborhood-visual-p1-6-les-orangers-visual-qa.mjs","utf8");
const ingest=readFileSync("supabase/functions/neighborhood-visual-p1-6-les-orangers-ingest/index.ts","utf8");
const migration=readFileSync("supabase/migrations/20260813125500_neighborhood_visual_p1_6_les_orangers_metadata.sql","utf8");

describe("NEIGHBORHOOD-VISUAL-P1.6 — Les Orangers",()=>{
  it("locks three distinct real reusable sources",()=>{assert.deepEqual(LES_ORANGERS_NEIGHBORHOOD_VISUALS.map(v=>v.sceneRole),["signature","immobilier","lifestyle"]);assert.equal(new Set(LES_ORANGERS_NEIGHBORHOOD_VISUALS.map(v=>v.source.sha1)).size,3);for(const v of LES_ORANGERS_NEIGHBORHOOD_VISUALS){assert.equal(v.city,"Rabat");assert.equal(v.neighborhood,"Les Orangers");assert.equal(v.source.sourceKind,"open_license");assert.match(v.source.license,/^CC BY/);assert.match(v.source.sha1,/^[0-9a-f]{40}$/);assert.ok(v.source.bytes>100000);assert.equal(v.source.locationVerified,true);assert.equal(v.activation.searchEnabled,false);assert.equal(v.truthBoundary.claimPropertyForSale,false)}});
  it("pins exact source identities",()=>{assert.equal(LES_ORANGERS_SIGNATURE_VISUAL.source.sha1,"0770e25288f7ecd3841cd246587f1ad4f1cde18c");assert.match(LES_ORANGERS_SIGNATURE_VISUAL.source.locationEvidence,/34\.016912/);assert.equal(LES_ORANGERS_IMMOBILIER_VISUAL.source.sha1,"cb978ea2874cb2e171aee6363175c38cd08305aa");assert.match(LES_ORANGERS_IMMOBILIER_VISUAL.source.locationEvidence,/260179395/);assert.equal(LES_ORANGERS_LIFESTYLE_VISUAL.source.sha1,"f24100d91a8ccd20724ce9bb0a11e03c902d4adf");assert.match(LES_ORANGERS_LIFESTYLE_VISUAL.source.locationEvidence,/276946287/)});
  it("uses real Search cards behind QA gate",()=>{assert.match(fixture,/SearchListingCardDark/);assert.match(fixture,/NeighborhoodVisualIdentityOverlay/);for(const role of ["signature","immobilier","lifestyle"])assert.ok(fixture.includes(`/__qa/les-orangers-${role}.jpg`));assert.match(route,/NEIGHBORHOOD_VISUAL_QA/);assert.match(route,/notFound\(\)/)});
  it("locks six-view responsive certification",()=>{for(const viewport of ["360x800","390x844","768x900","1024x800","1280x900","1440x900"])assert.ok(audit.includes(viewport));assert.match(audit,/target_score:9/);assert.match(audit,/machine_quality_score:10/);assert.match(audit,/Photo d’ambiance/)});
  it("bounds ingestion and reconciliation",()=>{for(const sha of ["0770e25288f7ecd3841cd246587f1ad4f1cde18c","cb978ea2874cb2e171aee6363175c38cd08305aa","f24100d91a8ccd20724ce9bb0a11e03c902d4adf"])assert.ok(ingest.includes(sha));assert.match(ingest,/P1\.6-LES-ORANGERS/);assert.match(migration,/expected exactly 3 ingested Les Orangers visual objects/);assert.match(migration,/neighborhood_slug = 'les-orangers'/)});
});
