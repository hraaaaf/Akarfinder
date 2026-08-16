import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C5 — rich zone sheet contract", () => {
  const contract = source("docs/CARTE_C5_RICH_ZONE_SHEET_CONTRACT.md");

  it("keeps live metrics authoritative in C3", () => {
    assert.ok(contract.includes("proviennent exclusivement du payload C3"));
    assert.ok(contract.includes("ne pas utiliser `MARKET_DATA`"));
    assert.ok(contract.includes("benchmark statique 2024-2025"));
    assert.ok(contract.includes("ne pas interpoler"));
  });

  it("separates contextual neighborhood enrichment from statistics", () => {
    assert.ok(contract.includes("`lib/map/canonical-neighborhood-data.ts`"));
    assert.ok(contract.includes("Ce contexte reste séparé visuellement et sémantiquement de la métrique C3"));
    assert.ok(contract.includes("`lifestyleTags`"));
  });

  it("locks the four Rabat bindings without inventing Souissi context", () => {
    for (const expected of [
      "`market_zone_rabat_agdal`",
      "`market_zone_rabat_hay_riad`",
      "`market_zone_rabat_centre`",
      "`market_zone_rabat_souissi`",
    ]) assert.ok(contract.includes(expected));
    assert.ok(contract.includes('`getNeighborhoodBySlug("rabat", "souissi")`'));
    assert.ok(contract.includes("aucun contexte de proximité n'est inventé"));
  });

  it("preserves compact UX, Search CTA and fail-closed behavior", () => {
    assert.ok(contract.includes("Rechercher dans cette zone"));
    assert.ok(contract.includes("La fiche ne doit pas masquer la navigation mobile"));
    assert.ok(contract.includes("API C3 indisponible : aucun chiffre de remplacement"));
    assert.ok(contract.includes("aucune nouvelle écriture DB"));
  });
});
