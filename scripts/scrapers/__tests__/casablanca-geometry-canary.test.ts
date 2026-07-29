import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  MAX_GEOMETRY_CANARY_PERCENT,
  decideCasablancaGeometryCanary,
  geometryCanaryBucket,
  readCasablancaGeometryCanaryConfig,
} from "../../../lib/geo/casablanca-geometry-canary";

const enabledPreview = {
  enabled: true,
  approved: true,
  emergencyStop: false,
  percent: 1,
  deploymentEnvironment: "preview",
};

test("canary is capped at one percent and deterministic per session", () => {
  assert.equal(MAX_GEOMETRY_CANARY_PERCENT, 1);
  assert.equal(geometryCanaryBucket("session-a"), geometryCanaryBucket("session-a"));
  const decisions = Array.from({ length: 10_000 }, (_, index) =>
    decideCasablancaGeometryCanary(enabledPreview, `session-${index}`),
  );
  const eligible = decisions.filter((decision) => decision.eligible).length;
  assert.ok(eligible > 50 && eligible < 150, `expected approximately 1%, received ${eligible / 100}%`);
});

test("production, emergency stop, missing approval and invalid percentages fail closed", () => {
  assert.equal(decideCasablancaGeometryCanary({ ...enabledPreview, deploymentEnvironment: "production" }, "x").reason, "production_blocked");
  assert.equal(decideCasablancaGeometryCanary({ ...enabledPreview, emergencyStop: true }, "x").reason, "emergency_stop");
  assert.equal(decideCasablancaGeometryCanary({ ...enabledPreview, approved: false }, "x").reason, "not_approved");
  assert.equal(decideCasablancaGeometryCanary({ ...enabledPreview, percent: 1.01 }, "x").reason, "invalid_percent");
  assert.equal(decideCasablancaGeometryCanary({ ...enabledPreview, percent: 0 }, "x").reason, "invalid_percent");
});

test("environment configuration requires explicit enabled and approved flags", () => {
  assert.deepEqual(readCasablancaGeometryCanaryConfig({
    NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED: "true",
    NEIGHBORHOOD_GEOMETRY_CANARY_APPROVED: "true",
    NEIGHBORHOOD_GEOMETRY_CANARY_PERCENT: "1",
    NEIGHBORHOOD_GEOMETRY_CANARY_STOP: "false",
    VERCEL_ENV: "preview",
  }), enabledPreview);
});

test("route and dock preserve privacy, rollback and production barriers", () => {
  const route = readFileSync(resolve(process.cwd(), "app/api/geo/casablanca-arrondissements/route.ts"), "utf8");
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchMapNeighborhoodDock.tsx"), "utf8");
  assert.ok(route.includes("NEIGHBORHOOD_GEOMETRY_CANARY_APPROVED"));
  assert.ok(route.includes("NEIGHBORHOOD_GEOMETRY_CANARY_STOP"));
  assert.ok(route.includes('HttpOnly'));
  assert.ok(route.includes('X-AkarFinder-Geometry-Canary'));
  assert.ok(!route.includes("email"));
  assert.ok(!route.includes("userId"));
  assert.ok(dock.includes('city.trim().toLowerCase() === "casablanca"'));
});
