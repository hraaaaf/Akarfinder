import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Product Experience P9 — Professionnels", () => {
  it("matches the canonical professional hero and three pillars without fake KPI", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    assert.ok(pro.includes("Vos annonces, votre identité, notre intelligence territoriale."));
    assert.ok(pro.includes("Identité pro"));
    assert.ok(pro.includes("Publication structurée"));
    assert.ok(pro.includes("Intelligence marché"));
    assert.ok(pro.includes("Aucun KPI fictif"));
    assert.equal(pro.includes('[["42"'), false);
    assert.equal(pro.includes('[["18"'), false);
    assert.equal(pro.includes('[["91%"'), false);
  });

  it("preserves professional journeys and the activation boundary", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    const activation = source("components/pro/ProActivationForm.tsx");
    assert.ok(pro.includes('href="/pro/agences"'));
    assert.ok(pro.includes('href="/promoteurs"'));
    assert.ok(pro.includes('href="#contact"'));
    assert.ok(activation.includes('id="contact"'));
    assert.ok(activation.includes('fetch("/api/leads"'));
    assert.ok(activation.includes('source_channel: "promoter"'));
    assert.ok(activation.includes("professional_request"));
  });

  it("preserves the data-for-value and trust contracts", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    for (const label of [
      "Contrat data-for-value",
      "Déclaré par le professionnel",
      "Calculé par AkarFinder",
      "Déduit avec prudence",
      "Non renseigné",
      "Socle Pro pilote",
      "Sponsoring labellisé",
      "Le paiement n’achète pas la pertinence organique",
      "Toute visibilité sponsorisée est séparée et clairement labellisée",
    ]) assert.ok(pro.includes(label), `missing ${label}`);
  });

  it("contains explicit P9 audit hooks and brand-blue activation styling", () => {
    const pro = source("components/pro/ProPageV2.tsx");
    const activation = source("components/pro/ProActivationForm.tsx");
    for (const hook of ["data-p9-professionnels", "data-p9-hero", "data-p9-dashboard-preview", "data-p9-pillars", "data-p9-standards"]) assert.ok(pro.includes(hook));
    assert.ok(activation.includes("data-p9-activation"));
    assert.ok(activation.includes("bg-[#0B63CE]"));
  });
});
