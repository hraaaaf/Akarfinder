import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const status = read("docs/CARTE_INTELLIGENCE_MARCHE_STATUS.md");
const contract = read("docs/CARTE_C8A_RABAT_TAXONOMY_CONTRACT.md");
const registry = read("lib/geo/geo-entity-registry.ts");

test("C8A preserves the closed C0-C7 historical baseline", () => {
  assert.match(status, /Statut global\s*:\s*\*\*CLOSED\*\*/);
  assert.match(status, /Lots CLOSED \/ 8\s*:\s*\*\*8 \/ 8 = 100 %\*\*/);
  assert.match(status, /C7 — Certification finale \+ closeout\s*:\s*✅ CLOSED/);
  assert.match(contract, /C0–C7 restent le baseline historique immuable/);
  assert.match(contract, /8 \/ 8 = 100 %/);
});

test("C8A preserves all five existing Rabat product entities and eligibility", () => {
  const expected = [
    ['district_rabat_agdal', 'Agdal', true],
    ['district_rabat_hay_riad', 'Hay Riad', true],
    ['district_rabat_hassan', 'Hassan', true],
    ['district_rabat_souissi', 'Souissi', false],
    ['district_rabat_ocean', 'Océan', false],
  ] as const;

  for (const [id, name, mapEligible] of expected) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const row = new RegExp(
      `\\{[^\\n]*id: "${id}"[^\\n]*canonical_name: "${escapedName}"[^\\n]*city_slug: "rabat"[^\\n]*map_eligible: ${mapEligible}[^\\n]*\\}`,
    );
    assert.match(registry, row, `${id} must remain lossless with map_eligible=${mapEligible}`);
  }
});

test("C8A separates product, administrative, postal, and geometry authority", () => {
  for (const token of [
    "product_locality",
    "admin_parent",
    "postal_names",
    "geometry_status",
    "market_map_eligible",
  ]) {
    assert.ok(contract.includes(token), `missing authority/model token: ${token}`);
  }

  assert.match(contract, /fail-closed/i);
  assert.match(contract, /Aucun polygone n’est inféré à partir d’un nom seul/);
  assert.match(contract, /HCP/);
  assert.match(contract, /AURS/);
  assert.match(contract, /Poste Maroc/);
});

test("C8A defines staged C8 execution without public runtime activation", () => {
  for (const lot of ["C8A", "C8B", "C8C", "C8D"]) {
    assert.ok(contract.includes(lot), `missing roadmap lot: ${lot}`);
  }

  assert.match(contract, /n’active aucune nouvelle zone runtime ou publique/i);
  assert.match(contract, /C8B précède toute ingestion\/certification polygonale C8C/);
});
