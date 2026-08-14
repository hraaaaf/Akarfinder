import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const canonicalDocs = ["README.md", "docs/ROADMAP.md", "docs/SESSION.md"];
const visualRoadmap = read("docs/NEIGHBORHOOD_VISUAL_LIBRARY_ROADMAP.md");
const p07Function = read("supabase/functions/neighborhood-visual-p0-7-ingest/index.ts");
const p07Closeout = read("supabase/migrations/20260811213000_neighborhood_visual_p0_7_security_closeout.sql");

describe("NEIGHBORHOOD-VISUAL-P0.8 — Souissi production closeout", () => {
  it("keeps canonical docs compatible with the closed Souissi pilot or a newer Rabat closeout", () => {
    for (const path of canonicalDocs) {
      const text = read(path);
      assert.match(text, /NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START/);

      const hasNewerRabatCloseout =
        /Bibliothèque visuelle quartiers — Rabat P0 → P2 ✅ CLOSED/.test(text) ||
        /Rabat P0 → P2 Visual Resolver integration ✅ CLOSED/.test(text);

      if (hasNewerRabatCloseout) {
        assert.match(text, /Souissi[^\n]*✅ CLOSED/);
        assert.match(text, /Agdal[^\n]*✅ CLOSED/);
        assert.match(text, /P2[^\n]*Visual Resolver[^\n]*✅ CLOSED/);
      } else {
        assert.match(text, /Souissi Pilot ✅ CLOSED/);
        assert.match(text, /P1\.1 — Agdal/);
        assert.match(text, /transformed_asset_url = NULL/);
        assert.match(text, /CSS\/UI/);
        assert.match(text, /Aucune activation implicite du Visual Resolver V2/);
      }
    }
  });

  it("marks P0.1 through P0.8 closed in the dedicated visual roadmap", () => {
    assert.match(visualRoadmap, /P0 SOUISSI PILOT CLOSED ✅ — P1\.1 AGDAL NEXT/);
    for (const lot of ["P0.1", "P0.2", "P0.3", "P0.4", "P0.5", "P0.6", "P0.7", "P0.8"]) {
      assert.match(visualRoadmap, new RegExp(`${lot.replace(".", "\\.")}[^\\n]*✅ CLOSED`));
    }
    assert.match(visualRoadmap, /SOUISSI PILOT CLOSED ✅/);
    assert.match(visualRoadmap, /Pilote Souissi final : \*\*9,2\/10 PASS\*\*/);
  });

  it("documents the non-destructive master-first doctrine without inventing a derived bitmap", () => {
    assert.match(visualRoadmap, /master intact/);
    assert.match(visualRoadmap, /traitement CSS\/UI non destructif/);
    assert.match(visualRoadmap, /transformed_asset_url` reste `NULL/);
    assert.match(visualRoadmap, /bitmap transformé n’est jamais fabriqué/);
    assert.doesNotMatch(visualRoadmap, /Avenue Mohamed VI Souissi Rabat -1\.jpg/);
    assert.match(visualRoadmap, /Avenue Mohamed VI Souissi Rabat\.jpg/);
  });

  it("keeps the exact three production Storage paths and real licensing evidence", () => {
    for (const path of [
      "rabat/souissi/signature/master.jpg",
      "rabat/souissi/immobilier/master.jpg",
      "rabat/souissi/lifestyle/master.jpg",
    ]) assert.ok(visualRoadmap.includes(path));
    assert.match(visualRoadmap, /CC BY-SA 4\.0/);
    assert.match(visualRoadmap, /CC BY-SA 3\.0/);
    assert.match(visualRoadmap, /Wikimedia Commons/);
  });

  it("keeps the completed one-shot ingestion surface fail-closed", () => {
    assert.match(p07Function, /const INGESTION_ENABLED = false/);
    assert.match(p07Function, /status: 410/);
    assert.match(p07Closeout, /drop extension if exists pg_net/);
  });

  it("does not activate generalized Search resolver behavior in P0.8", () => {
    assert.match(visualRoadmap, /P2 reste la frontière d’activation du resolver bibliothèque quartier/);
    assert.match(visualRoadmap, /# P2 — SEARCH INTEGRATION V2/);
  });
});
