import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

const target = readFileSync("docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md", "utf8");
const referencePath = "docs/assets/carte-intelligence-marche-reference.webp";
const previewSha256 = "ca973a84f74badfcb10ba6dd9297fb659a19cc3467c55e4b16264bd80bf76cb4";
const sourceJpegSha256 = "4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7";

describe("Carte intelligence marché target", () => {
  it("locks the canonical visual source identity and repo preview", () => {
    assert.equal(existsSync(referencePath), true, `missing ${referencePath}`);
    const digest = createHash("sha256").update(readFileSync(referencePath)).digest("hex");
    assert.equal(digest, previewSha256);
    assert.match(target, /référence visuelle exacte/i);
    assert.match(target, /1448 × 1086 px/);
    assert.match(target, /362 × 272 px/);
    assert.ok(target.includes(previewSha256));
    assert.ok(target.includes(sourceJpegSha256));
    assert.match(target, /ne remplace pas la source canonique/i);
  });

  it("locks the eight execution lots", () => {
    for (const lot of ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7"]) {
      assert.match(target, new RegExp(`### ${lot} —`));
    }
    assert.match(target, /lots `C0→C7` CLOSED \/ 8/);
  });

  it("locks the three real map modes and their canonical visual language", () => {
    assert.match(target, /Prix \/ Densité \/ Annonces/);
    assert.match(target, /price_median_mad_m2/);
    assert.match(target, /listing_density_km2/);
    assert.match(target, /listing_count/);
    assert.match(target, /palette Densité = dégradé bleu/);
    assert.match(target, /palette Annonces = dégradé vert/);
    assert.match(target, /fiche compacte basse conforme/);
  });

  it("locks the canonical neighborhood detail composition", () => {
    for (const marker of [
      "mini-carte avec polygone sélectionné",
      "prix médian/m²",
      "densité",
      "nombre d’annonces",
      "confiance des données",
      "catégories dominantes",
      "Voir la page quartier",
      "Rechercher cette zone",
    ]) {
      assert.ok(target.toLowerCase().includes(marker.toLowerCase()), `missing canonical detail marker: ${marker}`);
    }
  });

  it("keeps geometry and metrics truth-safe", () => {
    assert.match(target, /arrondissement administratif ≠ quartier/);
    assert.match(target, /aucune géométrie dessinée à la main/i);
    assert.match(target, /zones insuffisantes = neutres/);
    assert.match(target, /aucun KPI inventé/);
    assert.match(target, /jamais hardcodées/);
  });

  it("records the verified C1 blocker", () => {
    assert.match(target, /0 binding de polygone quartier/);
    assert.match(target, /points\/repères, pas les polygones/);
    assert.match(target, /Souissi reste `map_eligible=false`/);
  });

  it("locks the final 10-of-10 certification contract", () => {
    const numbered = target.match(/^\d+\. /gm) ?? [];
    assert.ok(numbered.length >= 10);
    assert.ok(target.includes("`10/10` exige 10 preuves"));
    assert.match(target, /390 \/ 430 \/ 768 \/ 1280/);
    assert.match(target, /comparaison côte à côte/);
    assert.match(target, /divergence structurelle visible non justifiée empêche le 10\/10/);
  });

  it("records the recovered historical foundations", () => {
    for (const pr of ["#371", "#376", "#382/#381", "#462", "#463", "#464/#465", "#466+"]) {
      assert.ok(target.includes(pr), `missing recovered foundation ${pr}`);
    }
  });
});
