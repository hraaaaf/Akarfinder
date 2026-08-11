import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const proof = JSON.parse(
  readFileSync(resolve(ROOT, "data/audits/neighborhood-visual-p0-2/souissi-signature-source.json"), "utf8"),
) as Record<string, any>;
const correctionMigration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260811203500_neighborhood_visual_p0_2r_souissi_signature_source_correction.sql"),
  "utf8",
);

describe("NEIGHBORHOOD-VISUAL-P0.2R — corrected Souissi signature source", () => {
  it("locks the real landscape, geo-verified, remixable Souissi signature master", () => {
    assert.equal(proof.status, "SOURCE_MASTER_VERIFIED");
    assert.equal(proof.city, "Rabat");
    assert.equal(proof.neighborhood, "Souissi");
    assert.equal(proof.scene_role, "signature");
    assert.equal(proof.file_name, "Avenue Mohamed VI Souissi Rabat.jpg");
    assert.equal(proof.source_name, "Wikimedia Commons");
    assert.equal(proof.author, "YousraElkh9");
    assert.equal(proof.license, "CC BY-SA 4.0");
    assert.equal(proof.modification_allowed, true);
    assert.equal(proof.share_alike_required, true);
    assert.equal(proof.geo_verified, true);
    assert.equal(proof.width, 3072);
    assert.equal(proof.height, 1728);
    assert.equal(proof.aspect_ratio, "16:9");
    assert.equal(proof.byte_size, 1338653);
    assert.equal(proof.sha1, "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6");
  });

  it("records why the portrait source was superseded without claiming a transformed visual", () => {
    assert.equal(proof.supersedes.file_name, "Avenue Mohamed VI Souissi Rabat -1.jpg");
    assert.match(String(proof.supersedes.reason), /portrait/i);
    assert.equal(proof.transformed_asset_url, null);
    assert.match(String(proof.truth_boundary), /source only/i);
    assert.match(String(proof.truth_boundary), /does not certify any transformed/i);
  });

  it("reconciles only the canonical Rabat/Souissi/signature v1 slot", () => {
    assert.match(correctionMigration, /city_slug = 'rabat'/);
    assert.match(correctionMigration, /neighborhood_slug = 'souissi'/);
    assert.match(correctionMigration, /scene_role = 'signature'/);
    assert.match(correctionMigration, /variant_index = 1/);
    assert.match(correctionMigration, /target_count <> 1/);
    assert.match(correctionMigration, /Avenue Mohamed VI Souissi Rabat\.jpg/);
    assert.match(correctionMigration, /d8e09bfdbad2fdef60f28840b90b79b45f77b8c6/);
    assert.doesNotMatch(correctionMigration, /transformed_asset_url\s*=/);
    assert.doesNotMatch(correctionMigration, /image_storage_path\s*=/);
  });
});
