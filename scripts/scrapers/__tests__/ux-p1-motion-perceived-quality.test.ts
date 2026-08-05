import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const motionCss = fs.readFileSync("components/ui/perceived-quality.module.css", "utf8");
const mobileDock = fs.readFileSync("components/listings/MobilePropertyDecisionBar.tsx", "utf8");
const favorite = fs.readFileSync("components/favorites/FavoriteToggleButton.tsx", "utf8");
const compare = fs.readFileSync("components/compare/CompareToggleButton.tsx", "utf8");

test("P1 LOT 4 motion and perceived quality", async (t) => {
  await t.test("defines purposeful short motion primitives", () => {
    assert.match(motionCss, /pq-sheet-up/);
    assert.match(motionCss, /pq-dock-up/);
    assert.match(motionCss, /pq-feedback-in/);
    assert.match(motionCss, /pq-shimmer/);
  });

  await t.test("honors reduced motion globally for new primitives", () => {
    assert.match(motionCss, /prefers-reduced-motion:\s*reduce/);
    assert.match(motionCss, /animation:\s*none\s*!important/);
  });

  await t.test("keeps the mobile decision dock calm and non-blocking", () => {
    assert.match(mobileDock, /motion\.dockEnter/);
    assert.match(mobileDock, /motion-reduce:transition-none/);
    assert.doesNotMatch(mobileDock, /infinite/);
  });

  await t.test("announces favorite and compare feedback accessibly", () => {
    assert.match(favorite, /aria-live="polite"/);
    assert.match(compare, /aria-live="polite"/);
    assert.match(favorite, /motion\.feedbackEnter/);
    assert.match(compare, /motion\.feedbackEnter/);
  });
});
