import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateSellerReadiness } from "../../../lib/seller/readiness";

const shell = readFileSync("components/vendre/VendrePageShell.tsx", "utf8");
const form = readFileSync("components/vendre/SellerSecurePublishForm.tsx", "utf8");
const dossier = readFileSync("app/vendre/dossier/page.tsx", "utf8");

test("seller entry exposes three plain-language intentions", () => {
  assert.match(shell, /Publier mon annonce/);
  assert.match(shell, /Estimer mon bien/);
  assert.match(shell, /Être accompagné/);
  assert.match(shell, /intent=\$\{intent\}/);
});

test("all intentions share one V4 secure dossier and declared-vs-verified truth", () => {
  assert.match(dossier, /SellerSecurePublishForm/);
  assert.match(form, /data-p8-publication-v4/);
  assert.match(form, /Brouillon/);
  assert.match(form, /AkarFinder sépare toujours ce qui est déclaré de ce qui a réellement été vérifié/);
  assert.doesNotMatch(form, /pipeline|score technique/i);
});

test("draft remains fail-closed with explicit consent and publication gates", () => {
  assert.match(form, /consent/);
  assert.match(form, /Rien n’est publié automatiquement/);
  assert.match(form, /AKARFINDER_SELLER_MIN_PHOTOS/);
  assert.match(form, /AKARFINDER_SELLER_SCORE_MIN_PUBLISH/);
  assert.match(form, /if \(!complete\) return/);
});

test("photo checks are local, bounded and understandable", () => {
  assert.match(form, /image\/jpeg/);
  assert.match(form, /15 \* 1024 \* 1024/);
  assert.match(form, /naturalWidth >= 1200/);
  assert.match(form, /naturalHeight >= 800/);
  assert.match(form, /slice\(0, 12\)/);
  assert.match(form, /Galerie signature AkarFinder/);
  assert.match(form, /Ajouter jusqu’à 12 photos/);
  assert.doesNotMatch(form, /dans ce LOT/i);
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

test("mobile, accessibility and submit guards remain explicit", () => {
  assert.match(form, /ariaLabel="Type du bien"/);
  assert.match(form, /aria-label="Monter"/);
  assert.match(form, /aria-label="Descendre"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /disabled={!canAdvance \|\| busy}/);
  assert.match(form, /if \(!complete\) return/);
});
