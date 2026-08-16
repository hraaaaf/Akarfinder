import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RABAT_PRODUCT_LOCALITY_CANDIDATES } from "../../../lib/geo/rabat-locality-registry";

const ROOT = process.cwd();
const proposal = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/geo/rabat-db-authority-proposal-v1.json"), "utf8"),
) as any;

test("C8D DB authority proposal is mutation-disabled and contains no executable SQL", () => {
  assert.equal(proposal.mode, "proposal_only");
  assert.equal(proposal.productionMutationAllowed, false);
  assert.equal(proposal.sqlIncluded, false);
  assert.equal(proposal.aggregateImpact.productionWrites, 0);
});

test("C8D DB authority proposal maps only existing C8 candidate localities", () => {
  const candidateIds = new Set(RABAT_PRODUCT_LOCALITY_CANDIDATES.map((entry) => entry.id));
  assert.equal(proposal.entities.length, 4);
  for (const entry of proposal.entities) assert.ok(candidateIds.has(entry.candidateId), entry.candidateId);
});

test("C8D proposed entities are initially fail-closed", () => {
  for (const entry of proposal.entities) {
    const db = entry.proposedDbEntity;
    assert.equal(db.entity_type, "neighborhood");
    assert.equal(db.parent_id, "city_rabat");
    assert.equal(db.validation_status, "pending_review");
    assert.equal(db.seo_eligible, false);
    assert.equal(db.map_eligible, false);
    assert.match(db.id, /^district_rabat_/);
  }
});

test("C8D proposed IDs/slugs and per-entity normalized aliases are unique", () => {
  const ids = proposal.entities.map((entry: any) => entry.proposedDbEntity.id);
  const slugs = proposal.entities.map((entry: any) => entry.proposedDbEntity.slug);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const entry of proposal.entities) {
    const normalized = entry.proposedAliases.map((alias: any) => alias.normalized_alias);
    assert.equal(new Set(normalized).size, normalized.length);
  }
});

test("C8D Medina proposal suppresses the normalized duplicate accented alias", () => {
  const medina = proposal.entities.find((entry: any) => entry.proposedDbEntity.slug === "medina");
  assert.ok(medina);
  assert.deepEqual(medina.proposedAliases.map((alias: any) => alias.normalized_alias), ["medina"]);
  assert.equal(medina.suppressedAliasVariants[0].alias, "Médina");
});

test("C8D authority impact accounting stays bounded", () => {
  const totals = proposal.entities.reduce((acc: any, entry: any) => ({
    structured: acc.structured + entry.evidence.structuredPropertyListings,
    bridged: acc.bridged + entry.evidence.bridgedSeeds,
    noEvent: acc.noEvent + entry.evidence.bridgedNoEvent,
    resolved: acc.resolved + entry.evidence.bridgedResolved,
    shadow: acc.shadow + entry.evidence.shadowUniqueMatches,
  }), { structured: 0, bridged: 0, noEvent: 0, resolved: 0, shadow: 0 });
  assert.deepEqual(totals, { structured: 59, bridged: 4, noEvent: 4, resolved: 0, shadow: 20 });
  assert.equal(proposal.aggregateImpact.structuredPropertyListings, 59);
  assert.equal(proposal.aggregateImpact.shadowUniqueMatches, 20);
});

test("C8D authority proposal keeps Aviation free-text ambiguity explicit", () => {
  const aviation = proposal.entities.find((entry: any) => entry.proposedDbEntity.slug === "aviation");
  assert.ok(aviation);
  assert.equal(aviation.evidence.shadowAmbiguousRows, 4);
  assert.deepEqual(aviation.evidence.shadowAmbiguityWith, ["mabella"]);
});
