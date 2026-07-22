import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  git?: { deploymentEnabled?: boolean | Record<string, boolean> };
};

test("Vercel automatic Git deployments stay disabled during active phases", () => {
  assert.equal(
    config.git?.deploymentEnabled,
    false,
    "vercel.json must keep git.deploymentEnabled=false; Production deploys are phase-completion actions only",
  );
});

test("phase deployment policy remains documented", () => {
  const policy = readFileSync("docs/VERCEL_PHASE_DEPLOYMENT_POLICY.md", "utf8");
  assert.match(policy, /Vercel is a phase-completion gate/i);
  assert.match(policy, /one deliberate Vercel Production deployment/i);
  assert.match(policy, /GitHub Actions/i);
});
