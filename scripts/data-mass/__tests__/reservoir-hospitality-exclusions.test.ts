import assert from "node:assert/strict";
import test from "node:test";
import { classifyDomainRole, summarizeDomainReservoir, type ReservoirCandidate } from "../reservoir-qualification";

function rowsFor(domain: string): ReservoirCandidate[] {
  return Array.from({ length: 80 }, (_, i) => ({
    sourceDomain: domain,
    url: `https://${domain}/marrakech/property-${100000 + i}`,
    title: "Appartement Marrakech location 120 m2",
    snippet: "Property Marrakech Morocco 120 m2 location",
    discoveryQuery: "location appartement Marrakech",
    contentFingerprint: `${domain}-${i}`,
  }));
}

test("hospitality/travel discovery surfaces never enter Source Factory", () => {
  for (const domain of [
    "booking.com",
    "agoda.com",
    "allhotelsmorocco.com",
    "airbnb.fr",
    "tripadvisor.fr",
    "vrbo.com",
    "abritel.fr",
    "villanovo.fr",
    "cozycozy.com",
  ]) {
    assert.equal(classifyDomainRole(domain), "DISCOVERY_TRANSPORT", domain);
    const summary = summarizeDomainReservoir(domain, rowsFor(domain), null);
    assert.equal(summary.massQueue, "HOLD", domain);
    assert.equal(summary.massPotentialScore, 0, domain);
    assert.equal(summary.publicActivableNow, false, domain);
  }
});
