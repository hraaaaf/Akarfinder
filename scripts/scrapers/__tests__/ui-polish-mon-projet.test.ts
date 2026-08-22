import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Mon Projet keeps the canonical shell without flattening the wizard", () => {
  const page = fs.readFileSync("app/mon-projet/page.tsx", "utf8");
  const wizard = fs.readFileSync("components/companion/MonProjetWizardP1A.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(page, /ui\.pageLight/);
  assert.match(page, /<MonProjetWizardP1A \/>/);
  assert.doesNotMatch(page, /ui\.secondaryActionPill/);

  assert.match(wizard, /const TOTAL_STEPS = 8/);
  assert.match(wizard, /\/api\/me\/continuity/);
  assert.match(wizard, /companionProfileToSearchParams/);
});
