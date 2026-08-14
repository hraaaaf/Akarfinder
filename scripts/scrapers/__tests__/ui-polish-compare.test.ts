import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Compare preserves engine while converging visually", () => {
  const page = fs.readFileSync("app/compare/page.tsx", "utf8");
  const shell = fs.readFileSync("components/compare/ComparePageShell.tsx", "utf8");
  const summary = fs.readFileSync("components/compare/CompareSummary.tsx", "utf8");
  const table = fs.readFileSync("components/compare/CompareTable.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(page, /ui\.pageLight/);
  assert.match(shell, /ui\.surfacePremium/);
  assert.match(shell, /ui\.emptyState/);
  assert.match(shell, /removeCompareId/);
  assert.match(shell, /clearCompareIds/);
  assert.match(shell, /buildCompareSummary/);

  assert.match(summary, /ui\.surfacePremium/);
  assert.match(table, /data-compare-mobile-identity/);
  assert.match(table, /sticky top-\[71px\]/);
  assert.match(table, /#visite/);
  assert.match(table, /Prix observé/);
  assert.match(table, /Proximité utile/);

  for (const source of [shell, summary, table]) {
    assert.doesNotMatch(source, /bronze/i);
    assert.doesNotMatch(source, /deepblue/i);
  }
});
