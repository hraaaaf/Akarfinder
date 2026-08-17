import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const matrix = fs.readFileSync(path.join(process.cwd(), "docs", "refonte-carte-pages.md"), "utf8");

const publicTopLevelRoutes = [
  "/", "/a-propos", "/accompagnement", "/acheter", "/alerts", "/comment-ca-marche", "/compagnon",
  "/compare", "/conditions-utilisation", "/contact", "/credit", "/demande-retrait", "/demo", "/faq",
  "/favorites", "/immobilier", "/investir", "/listings", "/louer", "/map", "/mon-projet", "/mre", "/neuf",
  "/onboarding", "/politique-confidentialite", "/pro", "/professionnels", "/profil-recherche", "/projets",
  "/promoteurs", "/quartiers", "/search", "/vendre", "/visual-qa",
];

test("every audited top-level UI route has an explicit premium reference", () => {
  for (const route of publicTopLevelRoutes) {
    assert.ok(matrix.includes(`\`${route}\``), `missing route reference: ${route}`);
  }
});

test("dynamic page families and visual proof are locked", () => {
  for (const marker of ["Fiche annonce dynamique", "Fiche quartier dynamique", "Fiche promoteur / projet dynamique", "Definition of Done par page"]) {
    assert.ok(matrix.includes(marker), `missing page-family marker: ${marker}`);
  }
  assert.ok(matrix.includes("capture avant"));
  assert.ok(matrix.includes("capture après"));
  assert.ok(matrix.includes("aucun déploiement Vercel sans autorisation explicite"));
});
