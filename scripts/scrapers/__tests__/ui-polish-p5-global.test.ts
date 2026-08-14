import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P5 global certification covers the final public surface", () => {
  const audit = fs.readFileSync("scripts/audits/ui-polish-p5-global-audit.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/ui-polish-p5-global-certification.yml", "utf8");

  for (const route of [
    "/search",
    "/favorites",
    "/map",
    "/alerts",
    "/compare",
    "/mon-projet",
    "/a-propos",
    "/accompagnement",
    "/acheter",
    "/comment-ca-marche",
    "/compagnon",
    "/conditions-utilisation",
    "/contact",
    "/credit",
    "/demande-retrait",
    "/faq",
  ]) {
    assert.match(audit, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(audit, /compare-populated/);
  assert.match(audit, /akarfinder:compare:listings/);
  assert.match(audit, /UI_POLISH_P5_GLOBAL_AUDIT_V1/);
  assert.match(workflow, /P5 Chromium 68-shot global certification/);
  assert.match(workflow, /cancel-in-progress: true/);
});
