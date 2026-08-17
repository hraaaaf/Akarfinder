import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const referencePath = path.join(process.cwd(), "docs", "Refonte carte.md");
const reference = fs.readFileSync(referencePath, "utf8");

test("Refonte carte keeps the existing AkarFinder visual DNA", () => {
  for (const token of ["Plus Jakarta Sans", "#F7F8FA", "#111827", "#7C3AED", "#8B5CF6", "#F97316", "#166534"]) {
    assert.ok(reference.includes(token), `missing canonical visual token: ${token}`);
  }
});

test("Refonte carte defines the map product layers and keeps exact GeoTruth separate", () => {
  for (const marker of ["Référentiel zones", "Référentiel prix", "Référentiel tendances", "GeoTruth exacte — séparée"]) {
    assert.ok(reference.includes(marker), `missing map architecture marker: ${marker}`);
  }
});

test("Refonte carte locks page-level premium references", () => {
  for (const page of [
    "Accueil `/`",
    "Acheter / louer / pages d'intention",
    "Recherche — Liste",
    "Recherche — Carte",
    "Fiche annonce",
    "Comparateur `/compare`",
    "Alertes `/alerts`",
    "Compagnon `/compagnon`",
    "Accompagnement `/accompagnement`",
    "Crédit `/credit`",
    "Comment ça marche `/comment-ca-marche`",
    "À propos `/a-propos`",
    "Contact `/contact`",
    "Conditions / retrait / pages légales",
  ]) {
    assert.ok(reference.includes(page), `missing page reference: ${page}`);
  }
});

test("Refonte carte requires before/reference/after proof and the existing certification viewports", () => {
  for (const viewport of ["390 px", "430 px", "768 px", "1280 px"]) {
    assert.ok(reference.includes(viewport), `missing certification viewport: ${viewport}`);
  }
  assert.ok(reference.includes("capture **avant**"));
  assert.ok(reference.includes("capture **après**"));
  assert.ok(reference.includes("score de conformité"));
});

test("Refonte carte locks the six-lot roadmap and deployment guardrail", () => {
  for (let lot = 1; lot <= 6; lot += 1) assert.ok(reference.includes(`P${lot} —`), `missing P${lot}`);
  assert.ok(reference.includes("aucun déploiement Vercel n'est effectué sans autorisation explicite"));
});
