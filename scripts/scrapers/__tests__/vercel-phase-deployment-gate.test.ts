import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const configSource = readFileSync("vercel.mjs", "utf8");

test("Vercel automatic Git deployments stay disabled during active phases", () => {
  assert.equal(existsSync("vercel.json"), false, "vercel.json must remain absent to preserve the historical no-Vercel-crons invariant");
  assert.match(configSource, /deploymentEnabled\s*:\s*false/);
  assert.doesNotMatch(configSource, /\bcrons\b\s*:/);
});

test("phase deployment policy remains documented", () => {
  const policy = readFileSync("docs/VERCEL_PHASE_DEPLOYMENT_POLICY.md", "utf8");
  assert.match(policy, /Vercel is a phase-completion gate/i);
  assert.match(policy, /one deliberate Vercel Production deployment/i);
  assert.match(policy, /GitHub Actions/i);
});
