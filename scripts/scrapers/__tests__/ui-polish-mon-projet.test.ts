import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Mon Projet keeps the canonical shell without flattening the current wizard", () => {
  const page = fs.readFileSync("app/mon-projet/page.tsx", "utf8");
  const wizard = fs.readFileSync("components/companion/MonProjetWizardP2.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(page, /ui\.pageLight/);
  assert.match(page, /<MonProjetWizardP2 \/>/);
  assert.doesNotMatch(page, /MonProjetWizardP1A/);
  assert.doesNotMatch(page, /ui\.secondaryActionPill/);

  assert.match(wizard, /const STEP_LABELS = \["Mon besoin", "Mon quotidien", "Mes priorités"\]/);
  assert.match(wizard, /\/api\/me\/continuity/);
  assert.match(wizard, /companionProfileToSearchParams/);
  assert.match(wizard, /data-finder-project-wizard/);
});
