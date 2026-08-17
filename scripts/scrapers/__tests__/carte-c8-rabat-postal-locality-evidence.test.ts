import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-postal-locality-evidence-v1.json"), "utf8"),
) as {
  authority: { provider: string; evidenceClass: string };
  productionWriteCount: number;
  publicActivation: boolean;
  bindings: Array<{ localityId: string; postalLabel: string; postalCode: string; matchKind: string }>;
  unboundSignals: Array<{ candidate: string; postalLabel: string; reason: string }>;
};

test("C8 postal evidence is explicitly Poste Maroc and corroboration-only", () => {
  assert.equal(manifest.authority.provider, "Poste Maroc / Barid Al-Maghrib");
  assert.equal(manifest.authority.evidenceClass, "postal_locality_name");
  assert.equal(manifest.productionWriteCount, 0);
  assert.equal(manifest.publicActivation, false);
});

test("C8 postal evidence binds only seven defensible candidate labels", () => {
  assert.deepEqual(
    manifest.bindings.map((entry) => entry.localityId).sort(),
    [
      "candidate_rabat_diour_jamaa",
      "candidate_rabat_hay_nahda",
      "candidate_rabat_kbibat",
      "candidate_rabat_les_orangers",
      "candidate_rabat_mabella",
      "candidate_rabat_medina",
      "candidate_rabat_mellah",
    ].sort(),
  );
  assert.ok(manifest.bindings.every((entry) => /^\d{5}$/.test(entry.postalCode)));
  assert.ok(manifest.bindings.every((entry) => entry.postalLabel.startsWith("RABAT QUARTIER ")));
});

test("C8 postal evidence keeps weaker cite/project/sub-area signals unbound", () => {
  assert.deepEqual(
    manifest.unboundSignals.map((entry) => entry.candidate).sort(),
    [
      "candidate_rabat_aviation",
      "candidate_rabat_el_kora",
      "candidate_rabat_oudayas",
      "candidate_rabat_touarga",
      "candidate_rabat_youssoufia",
    ].sort(),
  );
  assert.ok(manifest.unboundSignals.every((entry) => entry.reason.length > 40));
});
