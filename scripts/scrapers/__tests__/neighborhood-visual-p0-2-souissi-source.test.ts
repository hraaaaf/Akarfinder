import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const proof = JSON.parse(
  readFileSync(resolve(ROOT, "data/audits/neighborhood-visual-p0-2/souissi-signature-source.json"), "utf8"),
) as Record<string, unknown>;
const migration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260811172000_neighborhood_visual_p0_2_souissi_signature_source.sql"),
  "utf8",
);

describe("NEIGHBORHOOD-VISUAL-P0.2", () => {
  it("locks a real, geo-verified, remixable Souissi signature master", () => {
    assert.equal(proof.status, "SOURCE_MASTER_VERIFIED");
    assert.equal(proof.city, "Rabat");
    assert.equal(proof.neighborhood, "Souissi");
    assert.equal(proof.scene_role, "signature");
    assert.equal(proof.source_name, "Wikimedia Commons");
    assert.equal(proof.license, "CC BY-SA 4.0");
    assert.equal(proof.modification_allowed, true);
    assert.equal(proof.share_alike_required, true);
    assert.equal(proof.geo_verified, true);
    assert.equal(proof.width, 3072);
    assert.equal(proof.height, 1728);
    assert.equal(proof.aspect_ratio, "16:9");
    assert.equal(proof.byte_size, 1600029);
    assert.equal(proof.sha1, "c801e690e27a571c38d68de199824b34b925b6e4");
  });

  it("does not claim a transformed visual exists", () => {
    assert.equal(proof.transformed_asset_url, null);
    assert.match(String(proof.truth_boundary), /source only/i);
    assert.match(String(proof.truth_boundary), /does not certify any transformed/i);
  });

  it("reconciles only the canonical Rabat/Souissi/signature v1 slot", () => {
    assert.match(migration, /city_slug = 'rabat'/);
    assert.match(migration, /neighborhood_slug = 'souissi'/);
    assert.match(migration, /scene_role = 'signature'/);
    assert.match(migration, /variant_index = 1/);
    assert.match(migration, /target_count <> 1/);
    assert.match(migration, /CC BY-SA 4\.0/);
    assert.match(migration, /c801e690e27a571c38d68de199824b34b925b6e4/);
    assert.doesNotMatch(migration, /transformed_asset_url\s*=/);
    assert.doesNotMatch(migration, /image_storage_path\s*=/);
  });
});
