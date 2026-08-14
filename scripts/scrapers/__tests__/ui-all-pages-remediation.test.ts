import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sellerPage = readFileSync("app/vendre/dossier/page.tsx", "utf8");
const inventory = readFileSync("scripts/audits/ui-all-pages-inventory.mjs", "utf8");
const baseline = readFileSync("scripts/audits/ui-all-pages-baseline.mjs", "utf8");
const workflow = readFileSync(".github/workflows/ui-all-pages-baseline.yml", "utf8");

test("seller dossier constrains its visual selector inside the viewport", () => {
  assert.match(
    sellerPage,
    /className="min-w-0 \[&>div\]:min-w-0 \[&>div>section\]:min-w-0"/,
    "the seller dossier must let the inner grid and main section shrink so the horizontal property selector scrolls inside the card instead of widening the page",
  );
});

test("all-pages inventory models data-backed and redirect contracts explicitly", () => {
  assert.match(inventory, /\/listings\/\[id\][\s\S]*data-fixture-required/);
  assert.match(inventory, /\/professionnels\/\[slug\][\s\S]*data-fixture-required/);
  assert.match(inventory, /\/compagnon[\s\S]*expectedFinalPath: "\/mon-projet"/);
  assert.match(inventory, /\/pro\/leads[\s\S]*expectedFinalPath: "\/pro"/);
  assert.match(inventory, /\/quartiers[\s\S]*expectedFinalPath: "\/immobilier"/);
  assert.match(inventory, /\/api\/me\/continuity[\s\S]*status: 401/);
});

test("all-pages audit separates expected resource failures from real findings", () => {
  assert.match(baseline, /unexpectedFailedResponses/);
  assert.match(baseline, /unexpectedConsoleErrors/);
  assert.match(baseline, /UNEXPECTED_FINAL_PATH/);
  assert.match(baseline, /UI_ALL_PAGES_BASELINE_V2/);
});

test("all-pages workflow enables the canonical neighborhood visual QA lane", () => {
  assert.match(workflow, /NEIGHBORHOOD_VISUAL_QA: "1"/);
});
