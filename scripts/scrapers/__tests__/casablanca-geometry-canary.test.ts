import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  CASABLANCA_GEOMETRY_CANARY_APPROVAL_ID,
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

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

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

test("Preview auto-activates at one percent without external flags", () => {
  assert.match(CASABLANCA_GEOMETRY_CANARY_APPROVAL_ID, /^casablanca_geometry_preview_canary_v1_approved_/);
  assert.deepEqual(readCasablancaGeometryCanaryConfig({ VERCEL_ENV: "preview" }), enabledPreview);
});

test("explicit Preview rollback and emergency stop remain available", () => {
  assert.equal(readCasablancaGeometryCanaryConfig({
    VERCEL_ENV: "preview",
    NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED: "false",
  }).enabled, false);
  assert.equal(readCasablancaGeometryCanaryConfig({
    VERCEL_ENV: "preview",
    NEIGHBORHOOD_GEOMETRY_CANARY_STOP: "true",
  }).emergencyStop, true);
});

test("production and non-Preview environments never auto-activate", () => {
  for (const deploymentEnvironment of ["production", "development", "test", "unknown"]) {
    const config = readCasablancaGeometryCanaryConfig({ VERCEL_ENV: deploymentEnvironment });
    assert.equal(config.enabled, false);
    assert.equal(config.approved, false);
    assert.equal(config.percent, 0);
  }
});

test("controller, route and dock preserve privacy, rollback and production barriers", () => {
  const controller = source("lib/geo/casablanca-geometry-canary.ts");
  const route = source("app/api/geo/casablanca-arrondissements/route.ts");
  const dock = source("components/search/SearchMapNeighborhoodDock.tsx");

  assert.ok(controller.includes("CASABLANCA_GEOMETRY_CANARY_APPROVAL_ID"));
  assert.ok(controller.includes('deploymentEnvironment === "preview"'));
  assert.ok(controller.includes("NEIGHBORHOOD_GEOMETRY_CANARY_ENABLED !== \"false\""));
  assert.ok(controller.includes("NEIGHBORHOOD_GEOMETRY_CANARY_STOP"));
  assert.ok(controller.includes('deploymentEnvironment === "production"'));
  assert.ok(controller.includes("MAX_GEOMETRY_CANARY_PERCENT = 1"));
  assert.ok(route.includes("readCasablancaGeometryCanaryConfig"));
  assert.ok(route.includes("decideCasablancaGeometryCanary"));
  assert.ok(route.includes("HttpOnly"));
  assert.ok(route.includes("X-AkarFinder-Geometry-Canary"));
  assert.ok(!route.includes("email"));
  assert.ok(!route.includes("userId"));
  assert.ok(dock.includes('city.trim().toLowerCase() === "casablanca"'));
});
