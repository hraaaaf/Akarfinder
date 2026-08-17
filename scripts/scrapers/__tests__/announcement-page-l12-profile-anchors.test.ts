import assert from "node:assert/strict";
import test from "node:test";

import { applySearchProfileEvent } from "../../../lib/search-profile-v2/profile-engine";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types";

test("ANN-L12 stores explicit project anchors deterministically", () => {
  const profile = createEmptyDynamicSearchProfileV2("2026-08-17T00:00:00.000Z");
  const next = applySearchProfileEvent(profile, {
    type: "anchors",
    values: [
      { label: "Travail", city: "Rabat", latitude: 33.9911, longitude: -6.8498, max_minutes: 25 },
      { label: "École", city: "Rabat" },
    ],
  }, "2026-08-17T01:00:00.000Z");

  assert.deepEqual(next.location.anchors, [
    { label: "Travail", city: "Rabat", latitude: 33.9911, longitude: -6.8498, max_minutes: 25 },
    { label: "École", city: "Rabat" },
  ]);
});

test("ANN-L12 replacement semantics support edit and delete without hidden history", () => {
  let profile = createEmptyDynamicSearchProfileV2();
  profile = applySearchProfileEvent(profile, {
    type: "anchors",
    values: [{ label: "Travail", latitude: 33.99, longitude: -6.84, max_minutes: 30 }],
  });
  profile = applySearchProfileEvent(profile, {
    type: "anchors",
    values: [{ label: "Bureau", latitude: 33.99, longitude: -6.84, max_minutes: 20 }],
  });
  assert.deepEqual(profile.location.anchors, [{ label: "Bureau", latitude: 33.99, longitude: -6.84, max_minutes: 20 }]);

  profile = applySearchProfileEvent(profile, { type: "anchors", values: [] });
  assert.deepEqual(profile.location.anchors, []);
});

test("ANN-L12 rejects incomplete or invalid destination coordinates", () => {
  const profile = createEmptyDynamicSearchProfileV2();
  assert.throws(() => applySearchProfileEvent(profile, { type: "anchors", values: [{ label: "Travail", latitude: 33.99 }] }), /PROFILE_ANCHOR_COORDINATES_INCOMPLETE/);
  assert.throws(() => applySearchProfileEvent(profile, { type: "anchors", values: [{ label: "Travail", latitude: 91, longitude: -6.84 }] }), /PROFILE_ANCHOR_COORDINATES_INVALID/);
  assert.throws(() => applySearchProfileEvent(profile, { type: "anchors", values: [{ label: "Travail", latitude: 33.99, longitude: -181 }] }), /PROFILE_ANCHOR_COORDINATES_INVALID/);
});

test("ANN-L12 rejects invalid time constraints and excessive destination counts", () => {
  const profile = createEmptyDynamicSearchProfileV2();
  assert.throws(() => applySearchProfileEvent(profile, { type: "anchors", values: [{ label: "Travail", max_minutes: 0 }] }), /PROFILE_ANCHOR_MAX_MINUTES_INVALID/);
  assert.throws(() => applySearchProfileEvent(profile, { type: "anchors", values: Array.from({ length: 11 }, (_, index) => ({ label: `Point ${index + 1}` })) }), /PROFILE_ANCHOR_LIMIT_EXCEEDED/);
});

test("ANN-L12 deduplicates identical explicit anchors", () => {
  const profile = createEmptyDynamicSearchProfileV2();
  const next = applySearchProfileEvent(profile, {
    type: "anchors",
    values: [
      { label: "Travail", latitude: 33.99, longitude: -6.84 },
      { label: "Travail", latitude: 33.99, longitude: -6.84 },
    ],
  });
  assert.equal(next.location.anchors.length, 1);
});
