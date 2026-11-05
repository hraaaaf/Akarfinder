import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const specs = [
  { workflow: ".github/workflows/p1b11-tier-a-registry-production-write.yml",
    marker: "p1b10-tier-a-registry-write-design.test.ts",
    local: "scripts/scrapers/__tests__/p1b10-tier-a-registry-write-design.test.ts" },
  { workflow: ".github/workflows/p1b13c-oasis-registry-production-write.yml",
    marker: "p1b13b-oasis-registry-write-design-rehearsal.ts",
    local: "scripts/audits/p1b13b-oasis-registry-write-design-rehearsal.ts" },
];

for (const spec of specs) {
  test(`${spec.workflow}: PR CI never contacts hosted Supabase`, () => {
    const yaml = readFileSync(spec.workflow, "utf8");
    const local = readFileSync(spec.local, "utf8");
    assert.match(yaml, /^name: .*Offline Design Gate/m);
    assert.match(yaml, /pull_request:/);
    assert.match(yaml, /Assert hosted DB credentials absent/);
    assert.match(yaml, /npm ci --ignore-scripts/);
    assert.match(yaml, /node --test scripts\/audits\/tests\/registry-offline-ci-boundary\.test\.mjs/);
    assert.match(yaml, /\.\/node_modules\/\.bin\/tsc --noEmit/);
    assert.match(yaml, new RegExp(spec.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(local, /new PGlite\(/);
    assert.doesNotMatch(yaml, /\$\{\{\s*secrets\.(?:SUPABASE|NEON|DATABASE)/i);
    assert.doesNotMatch(yaml, /(?:Replay .*live|Live .*predecessor|p1b9-tier-a-registry-candidate-review\.ts|p1b13a-oasis-registry-candidate-review\.ts)/i);
    assert.doesNotMatch(yaml, /npx (?:tsx|tsc)/);
  });
}
