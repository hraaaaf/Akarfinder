import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Product Experience P11 — final global QA", () => {
  it("reuses the exhaustive all-pages inventory/baseline/certification instead of duplicating it", () => {
    const workflow = source(".github/workflows/product-experience-p11-global.yml");
    for (const script of [
      "ui-all-pages-inventory.mjs",
      "ui-all-pages-baseline.mjs",
      "ui-all-pages-certify.mjs",
      "product-experience-p11-global.mjs",
    ]) assert.ok(workflow.includes(script), `missing ${script}`);
  });

  it("certifies all Product Experience P3-P10 representative surfaces", () => {
    const audit = source("scripts/audits/product-experience-p11-global.mjs");
    for (const route of [
      'url: "/"',
      'url: "/search"',
      'url: "/map?city=rabat&layer=explore"',
      'url: "/visual-qa/announcement-page-pro-conversion"',
      'url: "/immobilier/rabat"',
      'url: "/immobilier/rabat/agdal"',
      'url: "/mon-projet"',
      'url: "/vendre/dossier"',
      'url: "/pro"',
      'url: "/a-propos"',
      'url: "/comment-ca-marche"',
      'url: "/faq"',
      'url: "/contact"',
      'url: "/demande-retrait"',
      'url: "/conditions-utilisation"',
      'url: "/politique-confidentialite"',
    ]) assert.ok(audit.includes(route), `missing ${route}`);
    assert.ok(audit.includes('expectedScreenshotCount: surfaces.length * viewports.length'));
    assert.ok(audit.includes('report.findingCount !== 0'));
  });

  it("uses the four canonical viewports and checks core responsive/runtime invariants", () => {
    const audit = source("scripts/audits/product-experience-p11-global.mjs");
    for (const viewport of ["390x844", "430x932", "768x900", "1280x900"]) assert.ok(audit.includes(viewport));
    for (const invariant of ["HORIZONTAL_OVERFLOW", "CANONICAL_LOGO_MISSING", "RESOURCE_HTTP_ERRORS", "CONSOLE_ERRORS", "MOBILE_NAV_VISIBLE_DESKTOP"]) assert.ok(audit.includes(invariant));
  });

  it("does not invent a performance threshold that the repository does not govern", () => {
    const workflow = source(".github/workflows/product-experience-p11-global.yml");
    const doc = source("docs/AKARFINDER_PRODUCT_EXPERIENCE_P11.md");
    assert.equal(/lighthouse|pagespeed|performance[_ -]?score/i.test(workflow), false);
    assert.ok(doc.includes("aucun budget Lighthouse ou bundle-size canonique"));
  });
});
