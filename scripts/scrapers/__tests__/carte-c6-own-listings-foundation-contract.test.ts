import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C6 — own-listings foundation contract", () => {
  const contract = source("docs/CARTE_C6_OWN_LISTINGS_FOUNDATION_CONTRACT.md");

  it("reuses the existing professional ownership authority", () => {
    assert.ok(contract.includes("ownership/listings/route.ts"));
    assert.ok(contract.includes("lib/professional/repository.ts"));
    assert.ok(contract.includes("`claimed` → `verified`"));
    assert.ok(contract.includes("aucun nouveau statut d'ownership parallèle"));
  });

  it("exposes only explicitly verified ownership", () => {
    assert.ok(contract.includes("uniquement si son ownership professionnel est explicitement `verified`"));
    assert.ok(contract.includes("`claimed`, absent, rejeté ou inconnu reste exclu fail-closed"));
    assert.ok(contract.includes("aucune inférence d'ownership"));
  });

  it("requires a bounded read-only inventory reader", () => {
    assert.ok(contract.includes("lecture bornée et read-only"));
    assert.ok(contract.includes("limite explicite et déterministe"));
    assert.ok(contract.includes("ne produire aucune écriture DB"));
  });

  it("keeps own inventory separate from market metrics", () => {
    assert.ok(contract.includes("ils ne remplacent pas `listing_count` marché"));
    assert.ok(contract.includes("ils ne modifient pas `listing_density_km2`"));
    assert.ok(contract.includes("ils ne servent pas à combler une donnée Prix insuffisante"));
    assert.ok(contract.includes("inventaire AkarFinder/partenaire"));
  });
});
