import assert from "node:assert/strict";
import test from "node:test";
import { auditStructuredCohortHtml, type CohortRow } from "../price-extraction-v5-structured-cohort-audit";

const base: CohortRow = {
  seed_id: "00000000-0000-0000-0000-000000000001",
  canonical_url: "https://www.mubawab.ma/fr/a/8322921/ancien-slug",
  source_domain: "mubawab.ma",
  normalized_intent: "rent",
};

function page(canonical: string, body: string) {
  return `<!doctype html><html><head><link rel="canonical" href="${canonical}"></head><body><main>${body}</main></body></html>`;
}

test("Mubawab identity uses stable listing id across slug changes", () => {
  const html = page("https://mubawab.ma/fr/a/8322921/nouveau-slug", '<div class="price">8 500 DH</div>');
  const result = auditStructuredCohortHtml(html, base, "https://mubawab.ma/fr/a/8322921/nouveau-slug");
  assert.equal(result.identity, true);
  assert.equal(result.amount, 8500);
});

test("different Mubawab listing id is rejected", () => {
  const html = page("https://mubawab.ma/fr/a/9999999/autre", '<div class="price">8 500 DH</div>');
  const result = auditStructuredCohortHtml(html, base, "https://mubawab.ma/fr/a/9999999/autre");
  assert.equal(result.identity, false);
  assert.equal(result.amount, null);
});

test("structured price requires explicit MAD/DH currency", () => {
  const html = page("https://mubawab.ma/fr/a/8322921/nouveau-slug", '<div class="price">8 500</div>');
  assert.equal(auditStructuredCohortHtml(html, base).amount, null);
});

test("per-m2 price is rejected", () => {
  const html = page("https://mubawab.ma/fr/a/8322921/nouveau-slug", '<div class="price">8 500 DH / m²</div>');
  assert.equal(auditStructuredCohortHtml(html, base).amount, null);
});

test("structured price ignores unrelated leading digits instead of concatenating them", () => {
  const html = page(
    "https://mubawab.ma/fr/a/8322921/nouveau-slug",
    '<div class="price">2 chambres · 6 000 DH</div>',
  );
  assert.equal(auditStructuredCohortHtml(html, base).amount, 6000);
});

test("structured price fails closed when one price block contains multiple distinct MAD amounts", () => {
  const html = page(
    "https://mubawab.ma/fr/a/8322921/nouveau-slug",
    '<div class="price">Loyer 6 000 DH · caution 12 000 DH</div>',
  );
  assert.equal(auditStructuredCohortHtml(html, base).amount, null);
});

test("structured price accepts compact and dashed currency forms without digit concatenation", () => {
  const compact = page(
    "https://mubawab.ma/fr/a/8322921/nouveau-slug",
    '<div class="price">Loyer 1450000 Dhs</div>',
  );
  assert.equal(auditStructuredCohortHtml(compact, { ...base, normalized_intent: "sale" }).amount, 1_450_000);

  const dashed = page(
    "https://mubawab.ma/fr/a/8322921/nouveau-slug",
    '<div class="price">Prix 3 050 000 - DH</div>',
  );
  assert.equal(auditStructuredCohortHtml(dashed, { ...base, normalized_intent: "sale" }).amount, 3_050_000);
});
