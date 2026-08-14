import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P5 discovers and audits every App Router page", () => {
  const audit = fs.readFileSync("scripts/audits/ui-polish-p5-global-audit.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/ui-polish-p5-global-certification.yml", "utf8");

  assert.match(audit, /collectPageFiles/);
  assert.match(audit, /entry\.name === "page\.tsx"/);
  assert.match(audit, /relative\(appDir, full\).*=== "api"/s);
  assert.match(audit, /fetchSitemapPaths/);
  assert.match(audit, /unresolvedDynamicTemplates/);
  assert.match(audit, /390x844/);
  assert.match(audit, /430x932/);
  assert.match(audit, /768x900/);
  assert.match(audit, /1280x900/);
  assert.match(audit, /horizontalOverflow/);
  assert.match(audit, /missing H1/);
  assert.match(audit, /consoleErrorCount/);
  assert.match(audit, /compare-populated/);
  assert.match(audit, /akarfinder:compare:listings/);
  assert.match(audit, /UI_POLISH_ALL_PAGES_AUDIT_V1/);

  assert.match(workflow, /P5 exhaustive all-pages Chromium certification/);
  assert.match(workflow, /Exhaustive all-pages visual matrix/);
  assert.match(workflow, /cancel-in-progress: true/);
});
