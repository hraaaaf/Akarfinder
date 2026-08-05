import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateSellerReadiness } from "../../../lib/seller/readiness";

const shell = readFileSync("components/vendre/VendrePageShell.tsx", "utf8");
const form = readFileSync("components/vendre/SellerPropertyDraftForm.tsx", "utf8");
const dossier = readFileSync("app/vendre/dossier/page.tsx", "utf8");

test("seller entry exposes three plain-language intentions", () => {
  assert.match(shell, /Publier mon annonce/);
  assert.match(shell, /Estimer mon bien/);
  assert.match(shell, /Être accompagné/);
  assert.match(shell, /intent=\$\{intent\}/);
});

test("all intentions share one dossier and one human readiness label", () => {
  assert.match(dossier, /SellerPropertyDraftForm/);
  assert.match(form, /Annonce prête/);
  assert.match(form, /Plus votre dossier est clair/);
  assert.doesNotMatch(form, /JSON|pipeline|score technique|complétude des données/i);
});

test("draft is saved locally without consent and nothing auto-publishes", () => {
  assert.match(form, /window\.localStorage\.setItem/);
  assert.match(form, /consent: false/);
  assert.match(form, /rien n’est publié automatiquement/i);
});

test("photo checks are local, bounded and understandable", () => {
  assert.match(form, /image\/jpeg/);
  assert.match(form, /15 \* 1024 \* 1024/);
  assert.match(form, /width < 1200 \|\| height < 800/);
  assert.match(form, /Les photos sont vérifiées sur votre appareil/);
  assert.match(form, /slice\(0, 12\)/);
});

test("readiness rewards useful information without inventing value", () => {
  const empty = calculateSellerReadiness({});
  const useful = calculateSellerReadiness({
    propertyType: "Appartement",
    city: "Rabat",
    neighborhood: "Agdal",
    surface: 110,
    bedrooms: 3,
    condition: "Bon état",
    price: 1800000,
    description: "Appartement lumineux avec deux façades, séjour spacieux, cuisine rénovée et proximité des écoles.",
    phone: "0612345678",
    photoCount: 6,
    acceptedPhotoCount: 6,
  });
  assert.equal(empty.score, 0);
  assert.ok(useful.score >= 85);
  assert.equal(useful.label, "Très complète");
  assert.equal(useful.essentialsComplete, true);
});

test("mobile and accessibility contracts remain explicit", () => {
  assert.match(form, /aria-label="Étapes du dossier"/);
  assert.match(form, /aria-current=\{active \? "step"/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /motion-reduce:transition-none/);
});
