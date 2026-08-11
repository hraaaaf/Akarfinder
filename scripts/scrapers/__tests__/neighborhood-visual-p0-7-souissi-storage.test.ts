import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const bucketMigration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260811211500_neighborhood_visual_p0_7_storage_bucket.sql"),
  "utf8",
);
const metadataMigration = readFileSync(
  resolve(ROOT, "supabase/migrations/20260811211600_neighborhood_visual_p0_7_souissi_metadata.sql"),
  "utf8",
);
const ingestFunction = readFileSync(
  resolve(ROOT, "supabase/functions/neighborhood-visual-p0-7-ingest/index.ts"),
  "utf8",
);

describe("NEIGHBORHOOD-VISUAL-P0.7 — Souissi Storage + metadata", () => {
  it("creates a dedicated public JPEG bucket without granting anonymous writes", () => {
    assert.match(bucketMigration, /'neighborhood-visuals'/);
    assert.match(bucketMigration, /true,/);
    assert.match(bucketMigration, /15728640/);
    assert.match(bucketMigration, /image\/jpeg/);
    assert.match(bucketMigration, /create extension if not exists pg_net/);
    assert.doesNotMatch(bucketMigration, /create policy/i);
  });

  it("ingests only the three hard-coded certified sources into deterministic paths", () => {
    const sourceUrls = ingestFunction.match(/https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//g) ?? [];
    assert.equal(sourceUrls.length, 3);
    for (const path of [
      "rabat/souissi/signature/master.jpg",
      "rabat/souissi/immobilier/master.jpg",
      "rabat/souissi/lifestyle/master.jpg",
    ]) {
      assert.ok(ingestFunction.includes(path), `missing bounded storage path ${path}`);
    }
    assert.match(ingestFunction, /body\?\.lot !== "P0\.7-SOUISSI"/);
    assert.match(ingestFunction, /confirmExactSources !== true/);
    assert.doesNotMatch(ingestFunction, /body\?\.sourceUrl/);
    assert.doesNotMatch(ingestFunction, /body\?\.storagePath/);
  });

  it("physically validates source geometry and the exact Signature hash before upload", () => {
    assert.match(ingestFunction, /jpegDimensions/);
    assert.match(ingestFunction, /3072/);
    assert.match(ingestFunction, /1728/);
    assert.match(ingestFunction, /1440/);
    assert.match(ingestFunction, /964/);
    assert.match(ingestFunction, /4032/);
    assert.match(ingestFunction, /3024/);
    assert.match(ingestFunction, /d8e09bfdbad2fdef60f28840b90b79b45f77b8c6/);
    assert.match(ingestFunction, /crypto\.subtle\.digest\("SHA-1"/);
  });

  it("uses server-side Supabase secrets only and never hard-codes an admin key", () => {
    assert.match(ingestFunction, /SUPABASE_SECRET_KEYS/);
    assert.match(ingestFunction, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(ingestFunction, /sb_secret_/);
    assert.doesNotMatch(ingestFunction, /service_role.*eyJ/i);
  });

  it("reconciles exactly three Souissi rows only after all three Storage objects exist", () => {
    assert.match(metadataMigration, /object_count <> 3/);
    assert.match(metadataMigration, /row_count <> 3/);
    assert.match(metadataMigration, /city_slug = 'rabat'/g);
    assert.match(metadataMigration, /neighborhood_slug = 'souissi'/g);
    assert.match(metadataMigration, /scene_role = 'signature'/);
    assert.match(metadataMigration, /scene_role = 'immobilier'/);
    assert.match(metadataMigration, /scene_role = 'lifestyle'/);
    assert.match(metadataMigration, /neighborhood-visuals\/rabat\/souissi\/signature\/master\.jpg/);
    assert.match(metadataMigration, /neighborhood-visuals\/rabat\/souissi\/immobilier\/master\.jpg/);
    assert.match(metadataMigration, /neighborhood-visuals\/rabat\/souissi\/lifestyle\/master\.jpg/);
  });

  it("replaces old reference-only sources and keeps transformed bitmap URLs null", () => {
    assert.match(metadataMigration, /Rabat,Souissi1\.jpg/);
    assert.match(metadataMigration, /Hassan_II_Park_-_Rabat_-_November_2024_-_1\.jpg/);
    assert.match(metadataMigration, /CC BY-SA 3\.0/);
    assert.match(metadataMigration, /CC BY-SA 4\.0/);
    const nullAssignments = metadataMigration.match(/transformed_asset_url = null/g) ?? [];
    assert.equal(nullAssignments.length, 3);
    assert.doesNotMatch(metadataMigration, /sothebysrealty/i);
    assert.doesNotMatch(metadataMigration, /visitrabat/i);
  });
});
