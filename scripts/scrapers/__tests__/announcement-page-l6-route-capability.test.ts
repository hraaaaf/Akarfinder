import assert from "node:assert/strict";
import { it } from "node:test";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import { buildLivingHereModel } from "@/lib/geo/living-here";
import type { GeoProviderEvidence, NearbyProviderResult } from "@/lib/geo/provider-contracts";

const NOW = new Date("2026-08-16T12:00:00.000Z");

const evidence: GeoProviderEvidence = {
  providerId: "poi-provider",
  attribution: "© Provider vérifié",
  fetchedAt: "2026-08-16T11:30:00.000Z",
  expiresAt: "2026-08-16T13:30:00.000Z",
};

const nearby: NearbyProviderResult = {
  status: "available",
  evidence,
  pois: [
    {
      id: "school-1",
      name: "École Agdal",
      category: "school",
      coordinate: { latitude: 33.991, longitude: -6.847 },
    },
  ],
};

it("does not expose precise-route capability from exact geo alone", () => {
  const geo = buildGeoTruth({
    id: "listing-l6-capability",
    city: "Rabat",
    neighborhood: "Agdal",
    latitude: 33.9908,
    longitude: -6.8481,
    geo_precision: "exact",
    geo_source: "scraped_coordinates",
    geo_label: "Coordonnées source",
  });

  const model = buildLivingHereModel({ geo, nearby, routes: [], now: NOW });

  assert.equal(model.visibility, "full");
  assert.equal(model.pois.length, 1);
  assert.equal(model.pois[0]?.routes.length, 0);
  assert.equal(model.canShowPreciseRouteTimes, false);
});
