import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PROMOTERS, PROJECTS } from "../../../lib/promoters/promoters-data.js";
import {
  getActivePromoter,
  getActivePromoterProjects,
  getAllActivePromoterSlugs,
} from "../../../lib/promoters/get-promoter.js";
import {
  getActiveProject,
  getProjectPromoter,
  getAllActiveProjectSlugs,
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

// ── Données ───────────────────────────────────────────────────────────────────

describe("P17A-1 — Données promoteurs", () => {
  test("PROMOTERS est un tableau", () => {
    assert.ok(Array.isArray(PROMOTERS));
  });

  test("PROJECTS est un tableau", () => {
    assert.ok(Array.isArray(PROJECTS));
  });

  test("Chaque promoteur a les champs obligatoires", () => {
    for (const p of PROMOTERS) {
      assert.ok(p.id, `Promoteur sans id`);
      assert.ok(p.slug, `Promoteur sans slug`);
      assert.ok(p.name, `Promoteur sans name`);
      assert.ok(p.city, `Promoteur sans city`);
      assert.ok(p.description, `Promoteur sans description`);
      assert.ok(
        ["none", "partner", "featured"].includes(p.partner_status),
        `partner_status invalide: ${p.partner_status}`
      );
      assert.ok(
        ["draft", "demo", "active"].includes(p.visibility_status),
        `visibility_status invalide: ${p.visibility_status}`
      );
      assert.equal(
        p.source_note,
        "Données fournies par le promoteur",
        `source_note incorrect pour ${p.name}`
      );
    }
  });

  test("Chaque projet a les champs obligatoires", () => {
    for (const p of PROJECTS) {
      assert.ok(p.id, `Projet sans id`);
      assert.ok(p.slug, `Projet sans slug`);
      assert.ok(p.promoter_id, `Projet sans promoter_id`);
      assert.ok(p.name, `Projet sans name`);
      assert.ok(p.city, `Projet sans city`);
      assert.ok(p.price_from > 0, `price_from invalide pour ${p.name}`);
      assert.equal(p.currency, "MAD", `currency invalide pour ${p.name}`);
      assert.ok(Array.isArray(p.property_types), `property_types non-array`);
      assert.ok(Array.isArray(p.typologies), `typologies non-array`);
      assert.ok(
        ["none", "partner_full"].includes(p.source_access_level) ||
          p.source_access_level === "public",
        `source_access_level invalide: ${p.source_access_level}`
      );
      assert.ok(
        ["draft", "demo", "active"].includes(p.visibility_status),
        `visibility_status invalide: ${p.visibility_status}`
      );
    }
  });

  test("Les slugs promoteurs sont uniques", () => {
    const slugs = PROMOTERS.map((p) => p.slug);
    const unique = new Set(slugs);
    assert.equal(unique.size, slugs.length, "Slugs promoteurs non-uniques");
  });

  test("Les slugs projets sont uniques", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    const unique = new Set(slugs);
    assert.equal(unique.size, slugs.length, "Slugs projets non-uniques");
  });

  test("Chaque projet référence un promoteur existant", () => {
    const promoterIds = new Set(PROMOTERS.map((p) => p.id));
    for (const proj of PROJECTS) {
      assert.ok(
        promoterIds.has(proj.promoter_id),
        `Projet "${proj.name}" référence un promoter_id inexistant: ${proj.promoter_id}`
      );
    }
  });
});

// ── Visibilité ─────────────────────────────────────────────────────────────────

describe("P17A-1 — Visibilité active/demo/draft", () => {
  test("getActivePromoter retourne null pour un slug demo", () => {
    const demoPromoter = PROMOTERS.find((p) => p.visibility_status === "demo");
    if (demoPromoter) {
      const result = getActivePromoter(demoPromoter.slug);
      assert.equal(result, null, "Une entrée demo ne doit pas être accessible publiquement");
    }
  });

  test("getActiveProject retourne null pour un slug demo", () => {
    const demoProject = PROJECTS.find((p) => p.visibility_status === "demo");
    if (demoProject) {
      const result = getActiveProject(demoProject.slug);
      assert.equal(result, null, "Un projet demo ne doit pas être accessible publiquement");
    }
  });

  test("getActivePromoter retourne null pour un slug inexistant", () => {
    const result = getActivePromoter("slug-inexistant-xyz");
    assert.equal(result, null);
  });

  test("getActiveProject retourne null pour un slug inexistant", () => {
    const result = getActiveProject("slug-inexistant-xyz");
    assert.equal(result, null);
  });

  test("getAllActivePromoterSlugs exclut demo/draft", () => {
    const slugs = getAllActivePromoterSlugs();
    for (const slug of slugs) {
      const p = PROMOTERS.find((x) => x.slug === slug);
      assert.equal(p?.visibility_status, "active", `Slug non-active dans la liste: ${slug}`);
    }
  });

  test("getAllActiveProjectSlugs exclut demo/draft", () => {
    const slugs = getAllActiveProjectSlugs();
    for (const slug of slugs) {
      const p = PROJECTS.find((x) => x.slug === slug);
      assert.equal(p?.visibility_status, "active", `Slug non-active dans la liste: ${slug}`);
    }
  });

  test("getActivePromoterProjects exclut les projets demo/draft", () => {
    for (const promoter of PROMOTERS) {
      const projects = getActivePromoterProjects(promoter.id);
      for (const proj of projects) {
        assert.equal(
          proj.visibility_status,
          "active",
          `Projet non-active retourné pour promoteur ${promoter.name}: ${proj.slug}`
        );
      }
    }
  });

  test("getProjectPromoter résout le promoteur depuis un projet", () => {
    for (const proj of PROJECTS) {
      const promoter = getProjectPromoter(proj.promoter_id);
      assert.ok(promoter, `Promoteur non résolu pour projet ${proj.name}`);
      assert.equal(
        promoter.id,
        proj.promoter_id,
        `Mauvais promoteur retourné pour projet ${proj.name}`
      );
    }
  });
});

// ── Wording ────────────────────────────────────────────────────────────────────

describe("P17A-1 — Wording interdit", () => {
  test("Descriptions promoteurs sans wording interdit", () => {
    for (const p of PROMOTERS) {
      checkNoForbiddenTerms(p.description, `Promoteur.description (${p.name})`);
      checkNoForbiddenTerms(p.name, `Promoteur.name (${p.name})`);
    }
  });

  test("Descriptions projets sans wording interdit", () => {
    for (const p of PROJECTS) {
      checkNoForbiddenTerms(p.name, `Projet.name (${p.name})`);
      checkNoForbiddenTerms(p.disclaimer, `Projet.disclaimer (${p.name})`);
      if (p.delivery_date_label) {
        checkNoForbiddenTerms(
          p.delivery_date_label,
          `Projet.delivery_date_label (${p.name})`
        );
      }
    }
  });

  test("partner_badge n'utilise pas de wording interdit", () => {
    for (const p of PROJECTS) {
      checkNoForbiddenTerms(p.partner_badge, `Projet.partner_badge (${p.name})`);
    }
  });
});

// ── Pas de PII scrappées ───────────────────────────────────────────────────────

describe("P17A-1 — Contrôle PII", () => {
  test("Les contacts WhatsApp/email ne sont jamais dans des entrées public/none", () => {
    for (const p of PROMOTERS) {
      if (p.partner_status === "none") {
        assert.equal(
          p.contact_whatsapp,
          undefined,
          `Promoteur partner_status=none ne doit pas avoir contact_whatsapp: ${p.name}`
        );
        assert.equal(
          p.contact_email,
          undefined,
          `Promoteur partner_status=none ne doit pas avoir contact_email: ${p.name}`
        );
      }
    }
  });
});
