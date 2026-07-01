// REAL-PROXIMITY-ENGINE-1 — Tests for computeRealProximityProfile

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRealProximityProfile, inferProximityInput } from "@/lib/proximity/proximity-engine";
import type { ProximityEngineInput } from "@/lib/proximity/proximity-types";
import { haversineMeters, findNearestCentroid, distanceToConfidence } from "@/lib/proximity/proximity-confidence";
import { minutesToQualitative, formatWalkingLabel } from "@/lib/proximity/proximity-format";

// ─────────────────────────────────────────────────────────────────
// 1. City only → no exact minutes, confidence low
// ─────────────────────────────────────────────────────────────────

describe("computeRealProximityProfile — city only", () => {
  it("city only → confidence low, basis city_only", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      location_precision: "city",
    });
    assert.equal(profile.confidence, "low");
    assert.equal(profile.basis, "city_only");
  });

  it("city only → no walking_minutes on any item", () => {
    const profile = computeRealProximityProfile({
      city: "Rabat",
      location_precision: "city",
    });
    for (const item of profile.items) {
      assert.equal(item.walking_minutes, undefined, `Expected no walking_minutes on city item: ${item.label}`);
    }
  });

  it("city only → all display_labels are qualitative (no '5 min' strings)", () => {
    const profile = computeRealProximityProfile({
      city: "Marrakech",
      location_precision: "city",
    });
    const QUALITATIVE = new Set(["à proximité", "dans le secteur", "accessible", "à vérifier"]);
    for (const item of profile.items) {
      assert.ok(
        QUALITATIVE.has(item.display_label),
        `Expected qualitative label, got "${item.display_label}" for ${item.label}`
      );
    }
  });

  it("disclaimer always present on city profile", () => {
    const profile = computeRealProximityProfile({
      city: "Agadir",
      location_precision: "city",
    });
    assert.ok(profile.disclaimer.length > 0, "Disclaimer must not be empty");
    assert.ok(
      profile.disclaimer.includes("confirmer"),
      `Disclaimer must contain 'confirmer': "${profile.disclaimer}"`
    );
  });

  it("unknown city → empty items, confidence low", () => {
    const profile = computeRealProximityProfile({
      city: "Ouarzazate",
      location_precision: "city",
    });
    assert.equal(profile.items.length, 0);
    assert.equal(profile.confidence, "low");
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. District / neighborhood → confidence medium
// ─────────────────────────────────────────────────────────────────

describe("computeRealProximityProfile — district", () => {
  it("known district → confidence medium, basis district_centroid", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      district: "Maârif",
      location_precision: "district",
    });
    assert.equal(profile.confidence, "medium");
    assert.equal(profile.basis, "district_centroid");
  });

  it("known district → items present", () => {
    const profile = computeRealProximityProfile({
      city: "Rabat",
      district: "Agdal",
      location_precision: "district",
    });
    assert.ok(profile.items.length >= 5, `Expected >= 5 items, got ${profile.items.length}`);
  });

  it("known district → no exact minutes (qualitative only)", () => {
    const profile = computeRealProximityProfile({
      city: "Marrakech",
      district: "Guéliz",
      location_precision: "district",
    });
    for (const item of profile.items) {
      assert.equal(
        item.walking_minutes, undefined,
        `Expected no walking_minutes on district item: ${item.label}`
      );
    }
  });

  it("unknown district → falls back to city profile (city_only basis)", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      district: "XyzUnknownQuartier",
      location_precision: "district",
    });
    assert.equal(profile.basis, "city_only");
    assert.equal(profile.confidence, "low");
  });

  it("unknown district, unknown city → unknown basis, empty items", () => {
    const profile = computeRealProximityProfile({
      district: "XyzUnknown",
      location_precision: "district",
    });
    assert.equal(profile.basis, "unknown");
    assert.equal(profile.items.length, 0);
  });

  it("disclaimer present on district profile", () => {
    const profile = computeRealProximityProfile({
      city: "Tanger",
      district: "Malabata",
      location_precision: "district",
    });
    assert.ok(profile.disclaimer.length > 0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Exact GPS → matched to nearest centroid
// ─────────────────────────────────────────────────────────────────

describe("computeRealProximityProfile — exact GPS", () => {
  // Maârif centroid: lat 33.5898, lng -7.6440
  const MAARIF_GPS = { latitude: 33.5910, longitude: -7.6435 }; // ~150m from centroid

  it("GPS close to known centroid → basis exact_gps", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      latitude: MAARIF_GPS.latitude,
      longitude: MAARIF_GPS.longitude,
      location_precision: "exact_gps",
    });
    assert.equal(profile.basis, "exact_gps");
  });

  it("GPS very close to centroid (<500m) → confidence high", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      latitude: MAARIF_GPS.latitude,
      longitude: MAARIF_GPS.longitude,
      location_precision: "exact_gps",
    });
    assert.equal(profile.confidence, "high");
  });

  it("GPS high confidence → walking_minutes set on items", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      latitude: MAARIF_GPS.latitude,
      longitude: MAARIF_GPS.longitude,
      location_precision: "exact_gps",
    });
    assert.equal(profile.confidence, "high");
    const withMinutes = profile.items.filter((i) => i.walking_minutes != null);
    assert.ok(
      withMinutes.length > 0,
      "Expected at least one item with walking_minutes when GPS confidence is high"
    );
  });

  it("GPS high confidence → display_label contains '~' and 'min'", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      latitude: MAARIF_GPS.latitude,
      longitude: MAARIF_GPS.longitude,
      location_precision: "exact_gps",
    });
    assert.equal(profile.confidence, "high");
    for (const item of profile.items) {
      assert.ok(
        item.display_label.includes("~") && item.display_label.includes("min"),
        `Expected timed display_label for high-GPS item, got "${item.display_label}"`
      );
    }
  });

  it("GPS source is 'gps_computed'", () => {
    const profile = computeRealProximityProfile({
      latitude: MAARIF_GPS.latitude,
      longitude: MAARIF_GPS.longitude,
      location_precision: "exact_gps",
    });
    for (const item of profile.items) {
      assert.equal(item.source, "gps_computed");
    }
  });

  it("GPS far from all centroids (>5km) → degrades to city fallback", () => {
    // Middle of Sahara — far from all Moroccan neighborhoods
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      latitude: 25.0,
      longitude: -5.0,
      location_precision: "exact_gps",
    });
    assert.equal(profile.basis, "city_only");
    assert.equal(profile.confidence, "low");
  });

  it("GPS without city, far from centroids → unknown basis", () => {
    const profile = computeRealProximityProfile({
      latitude: 25.0,
      longitude: -5.0,
      location_precision: "exact_gps",
    });
    assert.equal(profile.basis, "unknown");
    assert.equal(profile.items.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Unknown precision → graceful degradation
// ─────────────────────────────────────────────────────────────────

describe("computeRealProximityProfile — unknown precision", () => {
  it("unknown precision with city → city_only fallback", () => {
    const profile = computeRealProximityProfile({
      city: "Fès",
      location_precision: "unknown",
    });
    assert.equal(profile.basis, "city_only");
    assert.equal(profile.confidence, "low");
  });

  it("unknown precision, no city → empty profile", () => {
    const profile = computeRealProximityProfile({
      location_precision: "unknown",
    });
    assert.equal(profile.basis, "unknown");
    assert.equal(profile.items.length, 0);
  });

  it("no data at all → disclaimer still present", () => {
    const profile = computeRealProximityProfile({
      location_precision: "unknown",
    });
    assert.ok(profile.disclaimer.length > 0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. OSM static source preserved
// ─────────────────────────────────────────────────────────────────

describe("computeRealProximityProfile — OSM source labeling", () => {
  it("city/district items have source 'osm_static'", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      district: "Bouskoura",
      location_precision: "district",
    });
    for (const item of profile.items) {
      assert.equal(item.source, "osm_static", `Expected osm_static source, got "${item.source}"`);
    }
  });

  it("GPS items have source 'gps_computed'", () => {
    const profile = computeRealProximityProfile({
      latitude: 33.5910,
      longitude: -7.6435,
      location_precision: "exact_gps",
    });
    for (const item of profile.items) {
      assert.equal(item.source, "gps_computed");
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. inferProximityInput from listing fields
// ─────────────────────────────────────────────────────────────────

describe("inferProximityInput", () => {
  it("geo_precision=exact → location_precision=exact_gps", () => {
    const input = inferProximityInput({
      city: "Casablanca",
      neighborhood: "Maârif",
      latitude: 33.59,
      longitude: -7.64,
      geo_precision: "exact",
    });
    assert.equal(input.location_precision, "exact_gps");
    assert.equal(input.latitude, 33.59);
  });

  it("geo_precision=neighborhood_centroid → district", () => {
    const input = inferProximityInput({
      city: "Rabat",
      neighborhood: "Agdal",
      geo_precision: "neighborhood_centroid",
    });
    assert.equal(input.location_precision, "district");
  });

  it("geo_precision=city_centroid → city", () => {
    const input = inferProximityInput({ city: "Fès", geo_precision: "city_centroid" });
    assert.equal(input.location_precision, "city");
  });

  it("no geo_precision → unknown", () => {
    const input = inferProximityInput({ city: "Agadir" });
    assert.equal(input.location_precision, "unknown");
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. Haversine + confidence utilities
// ─────────────────────────────────────────────────────────────────

describe("proximity-confidence utilities", () => {
  it("haversineMeters: same point → 0", () => {
    const d = haversineMeters(33.59, -7.64, 33.59, -7.64);
    assert.ok(d < 1, `Expected <1m for same point, got ${d}`);
  });

  it("haversineMeters: Casablanca to Rabat ≈ 85km", () => {
    const d = haversineMeters(33.5731, -7.5898, 34.0208, -6.8416);
    assert.ok(d > 80_000 && d < 100_000, `Expected ~85km, got ${d}m`);
  });

  it("distanceToConfidence: <500m → high", () => {
    assert.equal(distanceToConfidence(300), "high");
  });

  it("distanceToConfidence: 500-2000m → medium", () => {
    assert.equal(distanceToConfidence(1200), "medium");
  });

  it("distanceToConfidence: ≥2000m → low", () => {
    assert.equal(distanceToConfidence(3000), "low");
  });

  it("findNearestCentroid: close to Maârif centroid", () => {
    // Maârif centroid is at lat 33.5898, lng -7.6440
    const nearest = findNearestCentroid(33.5900, -7.6438);
    assert.ok(nearest !== null);
    assert.equal(nearest!.neighborhood, "maarif");
    assert.ok(nearest!.distanceMeters < 500);
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. Format utilities
// ─────────────────────────────────────────────────────────────────

describe("proximity-format utilities", () => {
  it("minutesToQualitative: ≤5 → 'à proximité'", () => {
    assert.equal(minutesToQualitative(3), "à proximité");
    assert.equal(minutesToQualitative(5), "à proximité");
  });

  it("minutesToQualitative: 6-10 → 'dans le secteur'", () => {
    assert.equal(minutesToQualitative(6), "dans le secteur");
    assert.equal(minutesToQualitative(10), "dans le secteur");
  });

  it("minutesToQualitative: 11-15 → 'accessible'", () => {
    assert.equal(minutesToQualitative(11), "accessible");
    assert.equal(minutesToQualitative(15), "accessible");
  });

  it("minutesToQualitative: >15 → 'à vérifier'", () => {
    assert.equal(minutesToQualitative(16), "à vérifier");
    assert.equal(minutesToQualitative(25), "à vérifier");
  });

  it("formatWalkingLabel: GPS+high+minutes → timed label", () => {
    const label = formatWalkingLabel(8, "high", "exact_gps");
    assert.ok(label.includes("~8"), `Expected '~8' in label, got "${label}"`);
    assert.ok(label.includes("min"), `Expected 'min' in label, got "${label}"`);
  });

  it("formatWalkingLabel: district+medium+minutes → qualitative", () => {
    const label = formatWalkingLabel(8, "medium", "district_centroid");
    assert.equal(label, "dans le secteur");
  });

  it("formatWalkingLabel: city+low+minutes → qualitative", () => {
    const label = formatWalkingLabel(4, "low", "city_only");
    assert.equal(label, "à proximité");
  });

  it("formatWalkingLabel: no minutes → 'à confirmer'", () => {
    const label = formatWalkingLabel(undefined, "low", "unknown");
    assert.equal(label, "à confirmer");
  });
});

// ─────────────────────────────────────────────────────────────────
// 9. Invariants: no invented data
// ─────────────────────────────────────────────────────────────────

describe("invariants — no invented minutes without source", () => {
  it("city profile: no item has walking_minutes", () => {
    for (const city of ["Casablanca", "Rabat", "Tanger", "Marrakech", "Agadir", "Fès"]) {
      const profile = computeRealProximityProfile({ city, location_precision: "city" });
      for (const item of profile.items) {
        assert.equal(item.walking_minutes, undefined,
          `City profile must not have walking_minutes: ${city} / ${item.label}`);
      }
    }
  });

  it("district profile: no item has walking_minutes", () => {
    const profile = computeRealProximityProfile({
      city: "Casablanca",
      district: "Maârif",
      location_precision: "district",
    });
    for (const item of profile.items) {
      assert.equal(item.walking_minutes, undefined,
        `District profile must not have walking_minutes: ${item.label}`);
    }
  });

  it("every profile always has disclaimer", () => {
    const inputs: ProximityEngineInput[] = [
      { city: "Casablanca", location_precision: "city" },
      { city: "Rabat", district: "Agdal", location_precision: "district" },
      { latitude: 33.59, longitude: -7.64, location_precision: "exact_gps" },
      { location_precision: "unknown" },
    ];
    for (const input of inputs) {
      const profile = computeRealProximityProfile(input);
      assert.ok(profile.disclaimer.length > 0, `Disclaimer missing for ${JSON.stringify(input)}`);
    }
  });

  it("display_labels never contain 'vérifié', 'certifié', 'exact', 'garanti'", () => {
    const forbidden = ["vérifié", "certifié", "exact", "garanti", "officiel"];
    const profiles = [
      computeRealProximityProfile({ city: "Casablanca", location_precision: "city" }),
      computeRealProximityProfile({ city: "Rabat", district: "Agdal", location_precision: "district" }),
      computeRealProximityProfile({ latitude: 33.59, longitude: -7.64, location_precision: "exact_gps" }),
    ];
    for (const profile of profiles) {
      for (const item of profile.items) {
        for (const word of forbidden) {
          assert.ok(
            !item.display_label.toLowerCase().includes(word),
            `Forbidden word "${word}" found in display_label: "${item.display_label}"`
          );
        }
      }
    }
  });
});
