import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C4 — canonical closeout", () => {
  const status = source("docs/CARTE_INTELLIGENCE_MARCHE_STATUS.md");
  const closeout = source("docs/CARTE_C4_CLOSEOUT.md");

  it("advances strict roadmap to 5/8 with C5 current", () => {
    assert.ok(status.includes("**5 / 8 = 62,5 %**"));
    assert.ok(status.includes("C4 — Heat map interactive conforme au mockup : ✅ CLOSED"));
    assert.ok(status.includes("C5 — Fiche quartier riche : 🟠 CURRENT"));
  });

  it("records exact C4 merge and browser evidence", () => {
    for (const expected of [
      "17a027bef93239355cb614251668e63fff05e71e",
      "31922357603",
      "31922357579",
      "31922357533",
      "31922357584",
      "9256782867",
      "f9fba92e71d1a75aa261f612f9cc0cda1421d330b5e06e465558416cbc5d827a",
      "97d1b070d4a8cd7eb9cce18de76d12b35b167b05",
    ]) {
      assert.ok(closeout.includes(expected) || status.includes(expected));
    }
  });

  it("keeps C5 handoff truth-safe", () => {
    assert.ok(closeout.includes("métriques live exclusivement C3"));
    assert.ok(closeout.includes("Souissi"));
    assert.ok(closeout.includes("aucun contexte inventé"));
    assert.ok(status.includes("PR de préparation empilée : #706"));
  });
});
