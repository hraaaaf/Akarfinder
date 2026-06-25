import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeLeadTemperature } from "../../../lib/onboarding/lead-temperature";
import type { BuyerProfile } from "../../../lib/onboarding/types";

function hotProfile(): BuyerProfile {
  return {
    project: "acheter",
    city: "Casablanca",
    budgetTotal: 1_500_000,
    timing: "urgent",
    phone: "+212600000000",
    consentContact: true,
    consentIndicatif: true,
  };
}

describe("P12A — Lead temperature", () => {
  it("returns chaud for urgent timing + budget + phone + consent", () => {
    const result = computeLeadTemperature(hotProfile());
    assert.equal(result.temperature, "chaud");
  });

  it("returns chaud for 1-3mois timing + budget + phone + consent", () => {
    const result = computeLeadTemperature({ ...hotProfile(), timing: "1-3mois" });
    assert.equal(result.temperature, "chaud");
  });

  it("returns tiède for 3-6mois timing + budget", () => {
    const result = computeLeadTemperature({
      project: "acheter",
      city: "Rabat",
      budgetTotal: 800_000,
      timing: "3-6mois",
      consentIndicatif: true,
    });
    assert.equal(result.temperature, "tiède");
  });

  it("returns tiède for 3-6mois timing + city only (no budget)", () => {
    const result = computeLeadTemperature({
      city: "Marrakech",
      timing: "3-6mois",
    });
    assert.equal(result.temperature, "tiède");
  });

  it("returns froid for simple veille", () => {
    const result = computeLeadTemperature({
      project: "acheter",
      timing: "veille",
    });
    assert.equal(result.temperature, "froid");
  });

  it("returns froid for empty profile", () => {
    const result = computeLeadTemperature({});
    assert.equal(result.temperature, "froid");
  });

  it("missing phone prevents chaud even with urgent timing + budget", () => {
    const profile = { ...hotProfile(), phone: undefined };
    const result = computeLeadTemperature(profile);
    assert.notEqual(result.temperature, "chaud");
  });

  it("missing consent prevents chaud even with all other signals", () => {
    const profile = { ...hotProfile(), consentContact: false };
    const result = computeLeadTemperature(profile);
    assert.notEqual(result.temperature, "chaud");
  });

  it("MRE project with EUR currency returns valid result", () => {
    const result = computeLeadTemperature({
      project: "mre",
      city: "Casablanca",
      budgetTotal: 150_000,
      currency: "EUR",
      timing: "1-3mois",
      phone: "+33600000000",
      consentContact: true,
      consentIndicatif: true,
    });
    assert.equal(result.temperature, "chaud");
  });

  it("result always has label and reason strings", () => {
    const result = computeLeadTemperature(hotProfile());
    assert.equal(typeof result.label, "string");
    assert.equal(typeof result.reason, "string");
    assert.ok(result.label.length > 0);
    assert.ok(result.reason.length > 0);
  });
});

describe("P12A — Forbidden wording in lead-temperature output", () => {
  const FORBIDDEN = [
    "préqualifié",
    "préqualification bancaire",
    "crédit accepté",
    "crédit garanti",
    "taux officiel",
    "accord bancaire assuré",
    "capacité d'achat certifiée",
    "vous pouvez acheter",
    "banque partenaire validée",
  ];

  it("no forbidden wording in any result field", () => {
    const profiles: BuyerProfile[] = [
      hotProfile(),
      { ...hotProfile(), timing: "3-6mois" },
      {},
    ];
    for (const p of profiles) {
      const result = computeLeadTemperature(p);
      const allText = [result.label, result.reason].join(" ").toLowerCase();
      for (const word of FORBIDDEN) {
        assert.ok(
          !allText.includes(word.toLowerCase()),
          `Forbidden wording "${word}" found in: "${allText}"`
        );
      }
    }
  });
});
