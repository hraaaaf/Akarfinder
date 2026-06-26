import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PROMOTERS, PROJECTS } from "../../../lib/promoters/promoters-data.js";
import {
  getDemoPromoter,
  getDemoPromoterProjects,
  getActivePromoter,
} from "../../../lib/promoters/get-promoter.js";
import {
  getDemoProject,
  getActiveProject,
} from "../../../lib/promoters/get-project.js";

// ── Wording interdit ──────────────────────────────────────────────────────────
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
    assert.ok(
      !text.toLowerCase().includes(term),
      `"${label}" contains forbidden term: "${term}"`
    );
  }
}

// ── Accès demo ────────────────────────────────────────────────────────────────

describe("P17A-2 — Accès demo via getDemoPromoter/getDemoProject", () => {
  test("getDemoPromoter retourne une entrée demo existante", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (!demoPromoter) {
      // Si aucune entrée demo, le test passe (état acceptable)
      return;
    }
    const result = getDemoPromoter(demoPromoter.slug);
    assert.ok(result, "getDemoPromoter doit retourner l'entrée demo");
    assert.equal(result.slug, demoPromoter.slug);
    assert.equal(result.visibility_status, "demo");
  });

  test("getDemoProject retourne un projet demo existant", () => {
    const demoProject = PROJECTS.find((p) => p.visibility_status === "demo");
    if (!demoProject) return;
    const result = getDemoProject(demoProject.slug);
    assert.ok(result, "getDemoProject doit retourner le projet demo");
    assert.equal(result.slug, demoProject.slug);
    assert.equal(result.visibility_status, "demo");
  });

  test("getDemoPromoter retourne null pour un slug inexistant", () => {
    const result = getDemoPromoter("slug-inexistant-xyz");
    assert.equal(result, null);
  });

  test("getDemoProject retourne null pour un slug inexistant", () => {
    const result = getDemoProject("slug-inexistant-xyz");
    assert.equal(result, null);
  });
});

// ── Isolation demo / public ───────────────────────────────────────────────────

describe("P17A-2 — Isolation demo vs public", () => {
  test("getActivePromoter ne retourne PAS les entrées demo", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (!demoPromoter) return;
    const result = getActivePromoter(demoPromoter.slug);
    assert.equal(result, null, "Une entrée demo ne doit pas être accessible publiquement");
  });

  test("getActiveProject ne retourne PAS les projets demo", () => {
    const demoProject = PROJECTS.find((p) => p.visibility_status === "demo");
    if (!demoProject) return;
    const result = getActiveProject(demoProject.slug);
    assert.equal(result, null, "Un projet demo ne doit pas être accessible publiquement");
  });

  test("getDemoPromoter ne retourne PAS les entrées active", () => {
    const activePromoter = PROMOTERS.find((p) => p.visibility_status === "active");
    if (!activePromoter) return;
    // Un promoteur active ne doit pas être accessible via la route demo
    const result = getDemoPromoter(activePromoter.slug);
    assert.equal(result, null, "Un promoteur active ne doit pas être retourné via getDemoPromoter");
  });

  test("getDemoPromoterProjects ne retourne que les projets demo", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (!demoPromoter) return;
    const projects = getDemoPromoterProjects(demoPromoter.id);
    for (const proj of projects) {
      assert.equal(
        proj.visibility_status,
        "demo",
        `Projet non-demo retourné par getDemoPromoterProjects: ${proj.slug}`
      );
    }
  });
});

// ── Données demo ──────────────────────────────────────────────────────────────

describe("P17A-2 — Qualité données demo", () => {
  test("Les entrées demo ont un nom neutre (pas un vrai promoteur commercial)", () => {
    const demoPromoters = PROMOTERS.filter((p) => p.visibility_status === "demo");
    for (const p of demoPromoters) {
      assert.ok(
        p.name.toLowerCase().includes("démo") ||
          p.name.toLowerCase().includes("demo") ||
          p.name.toLowerCase().includes("exemple"),
        `Le nom du promoteur demo doit indiquer son caractère illustratif: ${p.name}`
      );
    }
  });

  test("Les projets demo ont un nom neutre", () => {
    const demoProjects = PROJECTS.filter((p) => p.visibility_status === "demo");
    for (const p of demoProjects) {
      assert.ok(
        p.name.toLowerCase().includes("démo") ||
          p.name.toLowerCase().includes("demo") ||
          p.name.toLowerCase().includes("exemple") ||
          p.name.toLowerCase().includes("résidence démo") ||
          p.name.toLowerCase().includes("residence demo"),
        `Le nom du projet demo doit indiquer son caractère illustratif: ${p.name}`
      );
    }
  });

  test("Les entrées demo n'ont pas de contact_whatsapp/email", () => {
    const demoPromoters = PROMOTERS.filter((p) => p.visibility_status === "demo");
    for (const p of demoPromoters) {
      assert.equal(
        p.contact_whatsapp,
        undefined,
        `Promoteur demo ne doit pas avoir contact_whatsapp: ${p.name}`
      );
      assert.equal(
        p.contact_email,
        undefined,
        `Promoteur demo ne doit pas avoir contact_email: ${p.name}`
      );
    }
  });

  test("Les entrées demo n'ont pas de logo_url", () => {
    const demoPromoters = PROMOTERS.filter((p) => p.visibility_status === "demo");
    for (const p of demoPromoters) {
      assert.equal(
        p.logo_url,
        undefined,
        `Promoteur demo ne doit pas avoir logo_url: ${p.name}`
      );
    }
  });

  test("Wording interdit absent des données demo", () => {
    const demoPromoters = PROMOTERS.filter((p) => p.visibility_status === "demo");
    const demoProjects = PROJECTS.filter((p) => p.visibility_status === "demo");
    for (const p of demoPromoters) {
      checkNoForbiddenTerms(p.name, `DemoPromoter.name (${p.name})`);
      checkNoForbiddenTerms(p.description, `DemoPromoter.description (${p.name})`);
    }
    for (const p of demoProjects) {
      checkNoForbiddenTerms(p.name, `DemoProject.name (${p.name})`);
      checkNoForbiddenTerms(p.disclaimer, `DemoProject.disclaimer (${p.name})`);
    }
  });

  test("Les projets demo ont un price_from > 0", () => {
    const demoProjects = PROJECTS.filter((p) => p.visibility_status === "demo");
    for (const p of demoProjects) {
      assert.ok(p.price_from > 0, `price_from invalide pour projet demo: ${p.name}`);
    }
  });
});
