import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AGDAL_IMMOBILIER_VISUAL,
  AGDAL_LIFESTYLE_VISUAL,
  AGDAL_NEIGHBORHOOD_VISUALS,
  AGDAL_SIGNATURE_VISUAL,
} from "../../../lib/contextual-illustrations/agdal-neighborhood-visuals";

const fixtureSource = readFileSync("components/search/AgdalNeighborhoodVisualQAFixture.tsx", "utf8");
const routeSource = readFileSync("app/visual-qa/agdal/page.tsx", "utf8");
const auditSource = readFileSync("scripts/audits/neighborhood-visual-p1-1-agdal-visual-qa.mjs", "utf8");
const ingestSource = readFileSync("supabase/functions/neighborhood-visual-p1-1-agdal-ingest/index.ts", "utf8");
const metadataMigration = readFileSync("supabase/migrations/20260811235500_neighborhood_visual_p1_1_agdal_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.1 — Agdal", () => {
  it("locks exactly three distinct real sources with truthful rights provenance", () => {
    assert.deepEqual(AGDAL_NEIGHBORHOOD_VISUALS.map((visual) => visual.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(AGDAL_NEIGHBORHOOD_VISUALS.map((visual) => visual.source.fileName)).size, 3);
    for (const visual of AGDAL_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat");
      assert.equal(visual.neighborhood, "Agdal");
      assert.equal(visual.source.locationVerified, true);
      assert.match(visual.source.sha1, /^[0-9a-f]{40}$/);
      assert.ok(visual.source.bytes > 100_000);
      assert.equal(visual.presentation.treatment, "css_only");
      assert.equal(visual.presentation.preserveSourcePixels, true);
      assert.equal(visual.presentation.bakedText, false);
      assert.equal(visual.activation.searchEnabled, false);
      assert.ok(visual.descriptors.length <= 3);
    }

    for (const visual of [AGDAL_SIGNATURE_VISUAL, AGDAL_LIFESTYLE_VISUAL]) {
      assert.equal(visual.source.sourceName, "Wikimedia Commons");
      assert.equal(visual.source.sourceKind, "open_license");
      assert.equal(visual.source.license, "CC BY-SA 4.0");
      assert.equal(visual.source.rightsBasis, "cc_by_sa_4_0");
    }

    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.sourceName, "AkarFinder project-supplied source");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.sourceKind, "project_supplied");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.rightsBasis, "direct_project_authorization");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.author, "Photographer not asserted");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.archive.visibility, "private_project_archive");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.archive.publicUrl, null);
    assert.doesNotMatch(AGDAL_IMMOBILIER_VISUAL.source.license, /Creative Commons|CC BY/i);
  });

  it("keeps the exact Fal source proof while shipping only a deterministic Search derivative", () => {
    assert.equal(AGDAL_SIGNATURE_VISUAL.source.fileName, "Al Boraq Railway station Rabat Agdal.jpg");
    assert.equal(AGDAL_SIGNATURE_VISUAL.source.width, 4160);
    assert.equal(AGDAL_SIGNATURE_VISUAL.source.height, 2340);
    assert.ok(AGDAL_SIGNATURE_VISUAL.source.width > AGDAL_SIGNATURE_VISUAL.source.height);

    assert.equal(AGDAL_IMMOBILIER_VISUAL.id, "rabat-agdal-immobilier-v2");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.semanticRole, "morphologie_batie");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.width, 1024);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.height, 1024);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.bytes, 330_658);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.source.sha1, "6adb3fffe36a6ace60ef9aee4907920e031abbd7");
    assert.match(AGDAL_IMMOBILIER_VISUAL.source.location, /Fal Ould Oumeir, Agdal, Rabat/);
    assert.match(AGDAL_IMMOBILIER_VISUAL.source.locationEvidence, /Visit Rabat/i);

    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.transform, "deterministic_crop_resize");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.generativeEdit, false);
    assert.deepEqual(AGDAL_IMMOBILIER_VISUAL.productAsset.crop, { left: 0, top: 224, width: 1024, height: 576 });
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.width, 320);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.height, 180);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.bytes, 11_487);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.sha1, "dd4eaab40b68090dcba6f85c58f1365213e0177f");
    assert.equal(AGDAL_IMMOBILIER_VISUAL.productAsset.sourceMasterSha1, AGDAL_IMMOBILIER_VISUAL.source.sha1);

    assert.equal(AGDAL_IMMOBILIER_VISUAL.truthBoundary.depictsSpecificProperty, false);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.truthBoundary.claimApartment, false);
    assert.equal(AGDAL_IMMOBILIER_VISUAL.truthBoundary.claimPropertyForSale, false);
    assert.equal(AGDAL_LIFESTYLE_VISUAL.truthBoundary.claimPrivateGarden, false);
    assert.match(AGDAL_LIFESTYLE_VISUAL.source.locationEvidence, /34\.007681,-6\.845169/);
  });

  it("uses real Search cards only behind the QA environment gate", () => {
    assert.match(fixtureSource, /SearchListingCardDark/);
    assert.match(fixtureSource, /NeighborhoodVisualIdentityOverlay/);
    assert.match(fixtureSource, /data-agdal-visual-qa-grid/);
    assert.match(fixtureSource, /\/__qa\/agdal-signature\.jpg/);
    assert.match(fixtureSource, /\/__qa\/agdal-immobilier\.jpg/);
    assert.match(fixtureSource, /\/__qa\/agdal-lifestyle\.jpg/);
    assert.match(routeSource, /NEIGHBORHOOD_VISUAL_QA/);
    assert.match(routeSource, /notFound\(\)/);
  });

  it("renders source-aware public credit without falsely attributing project-supplied imagery to Commons", () => {
    assert.match(fixtureSource, /visual\.source\.sourceName/);
    assert.match(fixtureSource, /visual\.source\.author/);
    assert.match(fixtureSource, /visual\.source\.license/);
    assert.doesNotMatch(fixtureSource, /\{visual\.source\.author\} · \{visual\.source\.license\} · Wikimedia Commons/);
  });

  it("locks responsive visual certification and public disclosure", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) {
      assert.ok(auditSource.includes(viewport));
    }
    assert.match(auditSource, /target_score: 9/);
    assert.match(auditSource, /Photo d’ambiance/);
    assert.match(auditSource, /horizontal overflow/);
    assert.match(auditSource, /machine_quality_score: 10/);
  });

  it("bounds production ingestion to two Commons masters plus the exact certified Fal Search derivative", () => {
    assert.equal((ingestSource.match(/Special:Redirect\/file\//g) ?? []).length, 2);
    assert.match(ingestSource, /public\/neighborhood-visuals\/rabat\/agdal\/immobilier\/fal-ould-oumeir-search\.jpg/);
    assert.match(ingestSource, /dd4eaab40b68090dcba6f85c58f1365213e0177f/);
    assert.doesNotMatch(ingestSource, /fal-ould-oumeir-source\.jpeg/);
    for (const path of [
      "rabat/agdal/signature/master.jpg",
      "rabat/agdal/immobilier/search.jpg",
      "rabat/agdal/lifestyle/master.jpg",
    ]) assert.ok(ingestSource.includes(path));
    assert.match(ingestSource, /P1\.1-AGDAL/);
    assert.doesNotMatch(ingestSource, /mubawab/i);
    assert.doesNotMatch(ingestSource, /visitrabat/i);
  });

  it("reconciles existing Agdal rows only after all three Storage objects exist", () => {
    assert.match(metadataMigration, /expected exactly 3 ingested Agdal visual objects/);
    assert.match(metadataMigration, /neighborhood_slug = 'agdal'/);
    assert.match(metadataMigration, /Al Boraq Railway station Rabat Agdal\.jpg/);
    assert.match(metadataMigration, /Fal Ould Oumeir/);
    assert.match(metadataMigration, /direct_project_authorization/);
    assert.match(metadataMigration, /6adb3fffe36a6ace60ef9aee4907920e031abbd7/);
    assert.match(metadataMigration, /dd4eaab40b68090dcba6f85c58f1365213e0177f/);
    assert.match(metadataMigration, /rabat\/agdal\/immobilier\/search\.jpg/);
    assert.match(metadataMigration, /Jardin d''essai botanique, Rabat\.jpg/);
    assert.match(metadataMigration, /transformed_asset_url = null/);
    assert.doesNotMatch(metadataMigration, /mubawab\.ma/i);
    assert.doesNotMatch(metadataMigration, /visitrabat\.com\/.*image/i);
  });
});
