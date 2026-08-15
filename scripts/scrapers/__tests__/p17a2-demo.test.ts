import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { PROMOTERS, PROJECTS } from "../../../lib/promoters/promoters-data.js";
import {
  getDemoPromoter,
  getDemoPromoterProjects,
} from "../../../lib/promoters/get-promoter.js";
import {
  getDemoProject,
  getActiveProject,
} from "../../../lib/promoters/get-project.js";

const promoterRepositorySource = readFileSync("lib/promoters/get-promoter.ts", "utf8");
const promoterRouteSource = readFileSync("app/promoteurs/[slug]/page.tsx", "utf8");

const FORBIDDEN_TERMS = [
  "projet vérifié",
  "promoteur vérifié",
  "prix officiel",
  "garanti",
  "certifié",
  "livraison garantie",
  "programme officiel",
  "promoteur validé",
  "leads garantis",
];

function checkNoForbiddenTerms(text: string, label: string) {
  for (const term of FORBIDDEN_TERMS) {
    assert.ok(!text.toLowerCase().includes(term), `"${label}" contains forbidden term: "${term}"`);
  }
}

describe("P17A-2 — Accès demo via getDemoPromoter/getDemoProject", () => {
  test("getDemoPromoter retourne une entrée demo existante", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (!demoPromoter) return;
    const result = getDemoPromoter(demoPromoter.slug);
    assert.ok(result);
    assert.equal(result.slug, demoPromoter.slug);
    assert.equal(result.visibility_status, "demo");
  });

  test("getDemoProject retourne un projet demo existant", () => {
    const demoProject = PROJECTS.find((p) => p.visibility_status === "demo");
    if (!demoProject) return;
    const result = getDemoProject(demoProject.slug);
    assert.ok(result);
    assert.equal(result.slug, demoProject.slug);
    assert.equal(result.visibility_status, "demo");
  });

  test("getDemoPromoter retourne null pour un slug inexistant", () => {
    assert.equal(getDemoPromoter("slug-inexistant-xyz"), null);
  });

  test("getDemoProject retourne null pour un slug inexistant", () => {
    assert.equal(getDemoProject("slug-inexistant-xyz"), null);
  });
});

describe("P17A-2 — Isolation demo vs public", () => {
  test("le repository promoteur legacy est strictement demo-only", () => {
    assert.match(promoterRepositorySource, /visibility_status === "demo"/);
    assert.doesNotMatch(promoterRepositorySource, /visibility_status === "active"/);
    assert.doesNotMatch(
      promoterRepositorySource,
      /getActivePromoter|getActivePromoterProjects|getAllActivePromoterSlugs/
    );
  });

  test("la route legacy ne publie les fixtures que sous preview=demo", () => {
    assert.match(promoterRouteSource, /preview === "demo"/);
    assert.match(promoterRouteSource, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(promoterRouteSource, /redirect\(`\/professionnels\/\$\{slug\}`\)/);
  });

  test("getActiveProject ne retourne PAS les projets demo", () => {
    const demoProject = PROJECTS.find((p) => p.visibility_status === "demo");
    if (!demoProject) return;
    assert.equal(getActiveProject(demoProject.slug), null);
  });

  test("getDemoPromoter ne retourne PAS les entrées active", () => {
    const activePromoter = PROMOTERS.find((p) => p.visibility_status === "active");
    if (!activePromoter) return;
    assert.equal(getDemoPromoter(activePromoter.slug), null);
  });

  test("getDemoPromoterProjects ne retourne que les projets demo", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (!demoPromoter) return;
    const projects = getDemoPromoterProjects(demoPromoter.id);
    for (const proj of projects) {
      assert.equal(proj.visibility_status, "demo");
    }
  });
});

describe("P17A-2 — Qualité données demo", () => {
  test("Les entrées demo ont un nom neutre (pas un vrai promoteur commercial)", () => {
    for (const p of PROMOTERS.filter((item) => item.visibility_status === "demo")) {
      assert.ok(
        p.name.toLowerCase().includes("démo") ||
          p.name.toLowerCase().includes("demo") ||
          p.name.toLowerCase().includes("exemple")
      );
    }
  });

  test("Les projets demo ont un nom neutre", () => {
    for (const p of PROJECTS.filter((item) => item.visibility_status === "demo")) {
      assert.ok(
        p.name.toLowerCase().includes("démo") ||
          p.name.toLowerCase().includes("demo") ||
          p.name.toLowerCase().includes("exemple") ||
          p.name.toLowerCase().includes("résidence démo") ||
          p.name.toLowerCase().includes("residence demo")
      );
    }
  });

  test("Les entrées demo n'ont pas de contact_whatsapp/email", () => {
    for (const p of PROMOTERS.filter((item) => item.visibility_status === "demo")) {
      assert.equal(p.contact_whatsapp, undefined);
      assert.equal(p.contact_email, undefined);
    }
  });

  test("Les entrées demo n'ont pas de logo_url", () => {
    for (const p of PROMOTERS.filter((item) => item.visibility_status === "demo")) {
      assert.equal(p.logo_url, undefined);
    }
  });

  test("Wording interdit absent des données demo", () => {
    for (const p of PROMOTERS.filter((item) => item.visibility_status === "demo")) {
      checkNoForbiddenTerms(p.name, `DemoPromoter.name (${p.name})`);
      checkNoForbiddenTerms(p.description, `DemoPromoter.description (${p.name})`);
    }
    for (const p of PROJECTS.filter((item) => item.visibility_status === "demo")) {
      checkNoForbiddenTerms(p.name, `DemoProject.name (${p.name})`);
      checkNoForbiddenTerms(p.disclaimer, `DemoProject.disclaimer (${p.name})`);
    }
  });

  test("Les projets demo ont un price_from > 0", () => {
    for (const p of PROJECTS.filter((item) => item.visibility_status === "demo")) {
      assert.ok(p.price_from > 0);
    }
  });
});
