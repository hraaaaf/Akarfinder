import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RABAT_PRODUCT_LOCALITY_CANDIDATES } from "../../../lib/geo/rabat-locality-registry";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-authority-proposal-v1.json"), "utf8"),
) as {
  mode: string;
  productionWriteCount: number;
  parentEntityId: string;
  defaults: {
    entity_type: string;
    validation_status: string;
    seo_eligible: boolean;
    map_eligible: boolean;
  };
  proposedEntities: Array<{
    id: string;
    slug: string;
    canonical_name: string;
    normalized_name: string;
    registry_id: string;
    aliases: Array<{ alias: string; normalized_alias: string }>;
  }>;
  collisionAudit: {
    existingGeoAliasNormalizedCollisions: number;
    internalNormalizedAliasesDeduplicated: unknown[];
  };
  productionDryRun: {
    entityRowsProposed: number;
    entityRowsNew: number;
    entityIdConflicts: number;
    entitySlugConflicts: number;
    aliasRowsProposed: number;
    aliasRowsNew: number;
    aliasRowsExisting: number;
    writesExecuted: number;
  };
};

test("C8D authority proposal remains proposal-only and fail-closed", () => {
  assert.equal(manifest.mode, "proposal_only");
  assert.equal(manifest.productionWriteCount, 0);
  assert.equal(manifest.parentEntityId, "city_rabat");
  assert.equal(manifest.defaults.entity_type, "neighborhood");
  assert.equal(manifest.defaults.validation_status, "pending_review");
  assert.equal(manifest.defaults.seo_eligible, false);
  assert.equal(manifest.defaults.map_eligible, false);
});

test("C8D authority proposal still covers every provisional C8B registry entry exactly once", () => {
  assert.equal(manifest.proposedEntities.length, RABAT_PRODUCT_LOCALITY_CANDIDATES.length);
  const proposedRegistryIds = manifest.proposedEntities.map((entity) => entity.registry_id).sort();
  const registryIds = RABAT_PRODUCT_LOCALITY_CANDIDATES.map((entity) => entity.id).sort();
  assert.deepEqual(proposedRegistryIds, registryIds);
});

test("C8D proposed ids and slugs are unique and use the production namespace", () => {
  const ids = manifest.proposedEntities.map((entity) => entity.id);
  const slugs = manifest.proposedEntities.map((entity) => entity.slug);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(ids.every((id) => id.startsWith("district_rabat_")));
});

test("C8D aliases are normalized-unique within each proposed entity", () => {
  for (const entity of manifest.proposedEntities) {
    assert.ok(entity.aliases.length >= 1, `${entity.id} must have at least one alias`);
    const normalized = entity.aliases.map((alias) => alias.normalized_alias);
    assert.equal(new Set(normalized).size, normalized.length, `${entity.id} has duplicate normalized aliases`);
  }
  assert.equal(manifest.collisionAudit.existingGeoAliasNormalizedCollisions, 0);
  assert.equal(manifest.collisionAudit.internalNormalizedAliasesDeduplicated.length, 2);
});

test("C8D production dry-run reports only new non-conflicting rows and zero writes", () => {
  const dryRun = manifest.productionDryRun;
  assert.equal(dryRun.entityRowsProposed, 18);
  assert.equal(dryRun.entityRowsNew, 18);
  assert.equal(dryRun.entityIdConflicts, 0);
  assert.equal(dryRun.entitySlugConflicts, 0);
  assert.equal(dryRun.aliasRowsProposed, 26);
  assert.equal(dryRun.aliasRowsNew, 26);
  assert.equal(dryRun.aliasRowsExisting, 0);
  assert.equal(dryRun.writesExecuted, 0);
});

test("taxonomy certification does not imply DB validation or activation", () => {
  const promoted = RABAT_PRODUCT_LOCALITY_CANDIDATES.filter((entry) => entry.taxonomy_status === "certified");
  assert.deepEqual(
    promoted.map((entry) => entry.id).sort(),
    ["candidate_rabat_akkari", "candidate_rabat_al_boustane", "candidate_rabat_yacoub_el_mansour"].sort(),
  );
  for (const entry of RABAT_PRODUCT_LOCALITY_CANDIDATES) {
    assert.equal(entry.activation_status, "blocked");
    assert.equal(entry.market_map_eligible, false);
  }
  assert.equal(manifest.defaults.validation_status, "pending_review");
  assert.equal(manifest.defaults.map_eligible, false);
  assert.equal(manifest.productionWriteCount, 0);
});
