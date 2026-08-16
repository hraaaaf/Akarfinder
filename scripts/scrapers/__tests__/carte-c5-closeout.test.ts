import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C5 — canonical closeout", () => {
  const closeout = source("docs/CARTE_C5_CLOSEOUT.md");
  const status = source("docs/CARTE_INTELLIGENCE_MARCHE_STATUS.md");

  it("records exact runtime and browser proof", () => {
    for (const expected of [
      "43f402031155873ff48abb2c279f341c53a5819b",
      "5b36197304bcb3c8c8cd94c5432ce6d3111c476c",
      "31923996230",
      "31923996206",
      "9257273391",
      "809b78c251096551c5e9e456807069ece2988685ea05e2556fd5fb2ca2d1add7",
    ]) assert.ok(closeout.includes(expected));
  });

  it("keeps Souissi fail-closed and records measured mobile fix", () => {
    assert.ok(closeout.includes("Souissi n'a ni contexte pseudo-factuel ni lien quartier inventé"));
    assert.ok(closeout.includes("bas de fiche : 772 px"));
    assert.ok(closeout.includes("haut de bottom-nav : 768 px"));
    assert.ok(closeout.includes("bottom-[90px]"));
  });

  it("keeps the historical C5 closeout valid after later roadmap progress", () => {
    assert.ok(closeout.includes("## Handoff C6"));
    assert.ok(status.includes("C5 — Fiche quartier riche : ✅ CLOSED"));
    assert.ok(status.includes("Closeout C5 : `docs/CARTE_C5_CLOSEOUT.md`"));
  });
});
