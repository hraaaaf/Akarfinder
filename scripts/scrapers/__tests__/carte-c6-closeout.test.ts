import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C6 — canonical closeout", () => {
  const closeout = source("docs/CARTE_C6_CLOSEOUT.md");
  const status = source("docs/CARTE_INTELLIGENCE_MARCHE_STATUS.md");

  it("records exact runtime proof", () => {
    for (const expected of [
      "f810c0be6d111262da5a37bdc9816925823f58cf",
      "ee8adf999e2f82590f834c1f80d125d441de34cc",
      "31925367009",
      "20260722003000_partner_commercial_activation_v1.sql",
    ]) assert.ok(closeout.includes(expected));
  });

  it("keeps inventory and provenance fail-closed", () => {
    assert.ok(closeout.includes("ownership absent, `claimed`, `revoked` ou non vérifié"));
    assert.ok(closeout.includes("Souissi reste volontairement non projeté"));
    assert.ok(closeout.includes("0 write DB"));
    assert.ok(closeout.includes("activation_status"));
    assert.ok(closeout.includes("source_authorization_status"));
  });

  it("advances strict roadmap to C7", () => {
    assert.ok(status.includes("7 / 8 = 87,5 %"));
    assert.ok(status.includes("C6 — Fondation « nos annonces » : ✅ CLOSED"));
    assert.ok(status.includes("C7 — Certification 10/10 + closeout : 🟠 CURRENT"));
    assert.ok(status.includes("Closeout C6 : `docs/CARTE_C6_CLOSEOUT.md`"));
  });
});
