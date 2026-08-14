import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P2 transverse design primitives exist", () => {
  const source = fs.readFileSync("components/ui/design-system.ts", "utf8");

  for (const primitive of [
    "pageLight",
    "chrome",
    "searchChrome",
    "surfacePremium",
    "surfaceGlass",
    "fieldPill",
    "primaryActionPill",
    "secondaryActionPill",
    "chip",
    "chipActive",
    "toolbar",
    "emptyState",
  ]) {
    assert.match(source, new RegExp(`${primitive}:`), `missing ${primitive}`);
  }

  assert.match(source, /bg-primary/);
  assert.match(source, /border-slate-200/);
  assert.match(source, /backdrop-blur-\[20px\]/);
  assert.match(source, /shadow-\[0_1px_12px_rgba\(11,37,69,0\.035\)\]/);
  assert.doesNotMatch(source, /bronze/i);
});

test("Compare keeps the Favoris mobile destination active", () => {
  const source = fs.readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  assert.match(source, /activePrefixes: \["\/favorites", "\/compare"\]/);
  assert.match(source, /ui\.surfaceGlass/);
});

test("P3 visual audit keeps the full five-route four-viewport matrix", () => {
  const source = fs.readFileSync("scripts/audits/ui-polish-p3-visual-audit.mjs", "utf8");
  for (const route of ["/favorites", "/map", "/alerts", "/compare", "/mon-projet"]) {
    assert.match(source, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const viewport of ["390x844", "430x932", "768x900", "1280x900"]) {
    assert.match(source, new RegExp(viewport));
  }
  assert.match(source, /AUDIT_ROUTE/);
  assert.match(source, /horizontalOverflow/);
});
