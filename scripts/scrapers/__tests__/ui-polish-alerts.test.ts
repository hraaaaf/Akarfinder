import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Alertes stays truthful while converging visually", () => {
  const source = fs.readFileSync("app/alerts/page.tsx", "utf8");

  assert.match(source, /SiteHeader searchMode fluid/);
  assert.match(source, /ui\.pageLight/);
  assert.match(source, /ui\.surfacePremium/);
  assert.match(source, /ui\.primaryActionPill/);
  assert.match(source, /ui\.secondaryActionPill/);
  assert.match(source, /notifications automatiques ne sont pas encore activées/i);
  assert.match(source, /Aucune notification n’est promise/);
  assert.match(source, /href="\/profil-recherche"/);
  assert.match(source, /href="\/search"/);
});
