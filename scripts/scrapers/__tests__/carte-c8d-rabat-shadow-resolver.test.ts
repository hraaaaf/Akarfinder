import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeRabatShadowText, resolveRabatLocalityShadow } from "../../../lib/geo/rabat-locality-shadow-resolver";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const SAME_RECORD = "same_record_structured" as const;

test("C8D shadow normalization is accent/punctuation/case deterministic", () => {
  assert.equal(normalizeRabatShadowText("  MÉDINA — Rabat  "), "medina rabat");
  assert.equal(normalizeRabatShadowText("Diour Jamaâ"), "diour jamaa");
  assert.equal(normalizeRabatShadowText("au cœur d'Agdal"), "au c ur d agdal");
});

test("C8D shadow resolves exact same-record structured candidate districts without activating them", () => {
  for (const [district, expectedId] of [
    ["Aviation", "candidate_rabat_aviation"],
    ["Médina", "candidate_rabat_medina"],
    ["Hay Nahda I", "candidate_rabat_hay_nahda"],
    ["Kébibat", "candidate_rabat_kbibat"],
    ["Kebibat", "candidate_rabat_kbibat"],
  ] as const) {
    const result = resolveRabatLocalityShadow({ district, districtProvenance: SAME_RECORD });
    assert.equal(result.status, "matched");
    if (result.status !== "matched") continue;
    assert.equal(result.localityId, expectedId);
    assert.equal(result.taxonomyStatus, "candidate");
    assert.equal(result.marketMapEligible, false);
    assert.equal(result.activationStatus, "blocked");
    assert.equal(result.publicationBlocked, true);
    assert.equal(result.evidence[0]?.signal, "structured_exact");
  }
});

test("C8D shadow resolves taxonomy-certified but unpublished Yacoub El Mansour", () => {
  for (const district of ["Yacoub El Mansour", "Yaacoub El Mansour"]) {
    const result = resolveRabatLocalityShadow({ district, districtProvenance: SAME_RECORD });
    assert.equal(result.status, "matched");
    if (result.status !== "matched") continue;
    assert.equal(result.localityId, "candidate_rabat_yacoub_el_mansour");
    assert.equal(result.taxonomyStatus, "certified");
    assert.equal(result.marketMapEligible, false);
    assert.equal(result.activationStatus, "blocked");
    assert.equal(result.publicationBlocked, true);
  }
});

test("C8D shadow resolves certified Ocean from trusted same-record structured district", () => {
  for (const district of ["Océan", "Ocean"]) {
    const result = resolveRabatLocalityShadow({ district, districtProvenance: SAME_RECORD });
    assert.equal(result.status, "matched");
    if (result.status !== "matched") continue;
    assert.equal(result.localityId, "district_rabat_ocean");
    assert.equal(result.taxonomyStatus, "certified");
    assert.equal(result.publicationBlocked, true);
  }
});

test("C8D shadow ignores an unproven district value", () => {
  assert.deepEqual(
    resolveRabatLocalityShadow({ district: "Aviation" }),
    { status: "unresolved", reason: "no_exact_locality_signal" },
  );
});

test("C8D shadow can recover a candidate from exact phrase text when structured district is absent", () => {
  const result = resolveRabatLocalityShadow({ title: "Appartement lumineux à Aviation, Rabat" });
  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.localityId, "candidate_rabat_aviation");
  assert.equal(result.evidence[0]?.field, "title");
  assert.equal(result.evidence[0]?.signal, "text_phrase");
});

test("C8D shadow resolves the observed Kebibat listing alias without activating it", () => {
  const result = resolveRabatLocalityShadow({ title: "Appartement à vendre à Kébibat - Rabat" });
  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.localityId, "candidate_rabat_kbibat");
  assert.equal(result.publicationBlocked, true);
});

test("C8D shadow prefers a trusted same-record district over incidental text", () => {
  const result = resolveRabatLocalityShadow({
    district: "Aviation",
    districtProvenance: SAME_RECORD,
    title: "À quelques minutes d'Agdal",
  });
  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.localityId, "candidate_rabat_aviation");
  assert.ok(result.evidence.every((item) => item.field === "district"));
});

test("C8D shadow never promotes a coverage bridge district over the source document", () => {
  const result = resolveRabatLocalityShadow({
    district: "Hay Riad",
    districtProvenance: "coverage_bridge_shadow",
    title: "Duplex à vendre Rabat",
    snippet: "Superbe duplex situé dans le quartier prisé d'Agdal à Rabat.",
  });
  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.localityId, "district_rabat_agdal");
  assert.ok(result.evidence.every((item) => item.field === "snippet"));
});

test("C8D shadow keeps mixed-listing source text ambiguous even when a shadow bridge suggests one district", () => {
  const result = resolveRabatLocalityShadow({
    district: "Agdal",
    districtProvenance: "coverage_bridge_shadow",
    title: "Immobilier à louer à Rabat",
    snippet: "Situé au cœur d'Agdal. Autre appartement à Rabat quartier Hassan.",
  });
  assert.equal(result.status, "ambiguous");
  if (result.status !== "ambiguous") return;
  assert.deepEqual(result.candidateLocalityIds, ["district_rabat_agdal", "district_rabat_hassan"]);
});

test("C8D shadow uses title before lower-authority proximity text", () => {
  const result = resolveRabatLocalityShadow({
    title: "Appartement à louer Hassan Centre Ville",
    snippet: "Proche de la Médina et des Oudayas",
  });
  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.localityId, "district_rabat_hassan");
  assert.ok(result.evidence.every((item) => item.field === "title"));
});

test("C8D shadow fails closed on conflicting signals inside the first matching field", () => {
  const result = resolveRabatLocalityShadow({ title: "Entre Aviation et Agdal à Rabat" });
  assert.equal(result.status, "ambiguous");
  if (result.status !== "ambiguous") return;
  assert.deepEqual(result.candidateLocalityIds, ["candidate_rabat_aviation", "district_rabat_agdal"]);
});

test("C8D shadow catches apostrophe-separated mixed-listing snippets as ambiguous", () => {
  const result = resolveRabatLocalityShadow({
    title: "Immobilier à louer à Rabat",
    snippet: "Situé au cœur d'Agdal. Autre appartement à Rabat quartier Hassan.",
  });
  assert.equal(result.status, "ambiguous");
  if (result.status !== "ambiguous") return;
  assert.deepEqual(result.candidateLocalityIds, ["district_rabat_agdal", "district_rabat_hassan"]);
});

test("C8D shadow does not fuzzy-resolve generic Rabat or partial words", () => {
  assert.deepEqual(
    resolveRabatLocalityShadow({ district: "Rabat", districtProvenance: SAME_RECORD }),
    { status: "unresolved", reason: "no_exact_locality_signal" },
  );
  assert.deepEqual(resolveRabatLocalityShadow({ title: "Appartement à Rabat" }), { status: "unresolved", reason: "no_exact_locality_signal" });
  assert.deepEqual(resolveRabatLocalityShadow({ title: "Résidence moderne" }), { status: "unresolved", reason: "no_exact_locality_signal" });
});

test("C8D shadow keeps short alias Riad out of free-text matching but accepts trusted structured exact", () => {
  assert.equal(resolveRabatLocalityShadow({ title: "Belle résidence Riad avec jardin" }).status, "unresolved");
  const structured = resolveRabatLocalityShadow({ district: "Riad", districtProvenance: SAME_RECORD });
  assert.equal(structured.status, "matched");
  if (structured.status === "matched") assert.equal(structured.localityId, "district_rabat_hay_riad");
});

test("C8D shadow is not imported by runtime resolver or public market API", () => {
  const runtimeResolver = read("lib/geo/resolve-listing-geo.ts");
  const marketApi = read("app/api/geo/rabat-market-intelligence/route.ts");
  assert.ok(!runtimeResolver.includes("rabat-locality-shadow-resolver"));
  assert.ok(!marketApi.includes("rabat-locality-shadow-resolver"));
});
