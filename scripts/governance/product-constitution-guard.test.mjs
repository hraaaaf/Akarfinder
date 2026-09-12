import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectInvariantViolations,
  loadManifest,
  overrideDocumentationIsComplete,
} from "./product-constitution-guard.mjs";

const manifest = {
  constitution_version: "test",
  canonical_file: "docs/AKARFINDER_PRODUCT_CONSTITUTION_CANONICAL.md",
  manifest_file: "config/product-constitution.json",
  standard_owner: "hraaaaf",
  locked_standards: [
    {
      id: "home.hero.positioning",
      status: "LOCKED",
      invariants: [
        {
          type: "contains_exact",
          file: "components/home/GoogleLikeHero.tsx",
          value: "1er moteur de recherche immobilier au Maroc",
        },
        {
          type: "contains_exact",
          file: "components/home/GoogleLikeHero.tsx",
          value: "<SearchEntryOrchestrator />",
        },
      ],
    },
  ],
};

function fixture(content) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "akarfinder-constitution-"));
  const target = path.join(root, "components/home/GoogleLikeHero.tsx");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return root;
}

test("passes when locked HOME invariants are preserved", () => {
  const root = fixture(`
    <h1>1er moteur de recherche immobilier au Maroc</h1>
    <SearchEntryOrchestrator />
  `);
  assert.deepEqual(collectInvariantViolations(manifest, root), []);
});

test("detects a positioning drift", () => {
  const root = fixture(`
    <h1>Le portail immobilier nouvelle generation</h1>
    <SearchEntryOrchestrator />
  `);
  const violations = collectInvariantViolations(manifest, root);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /1er moteur de recherche immobilier au Maroc/);
});

test("detects removal of the hero search orchestrator", () => {
  const root = fixture(`<h1>1er moteur de recherche immobilier au Maroc</h1>`);
  const violations = collectInvariantViolations(manifest, root);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /SearchEntryOrchestrator/);
});

test("rejects a symlink used as a protected candidate file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "akarfinder-constitution-symlink-"));
  const outside = path.join(root, "outside.tsx");
  fs.writeFileSync(outside, "1er moteur de recherche immobilier au Maroc <SearchEntryOrchestrator />", "utf8");
  const target = path.join(root, "components/home/GoogleLikeHero.tsx");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(outside, target);
  const violations = collectInvariantViolations(manifest, root);
  assert.equal(violations.length, 2);
  assert.match(violations[0].reason, /symlink/);
});

test("owner approval contract uses a dedicated GitHub environment", () => {
  const testFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(testFile), "../..");
  const actualManifest = loadManifest(repoRoot);
  assert.equal(actualManifest.standard_owner, "hraaaaf");
  assert.equal(actualManifest.owner_approval?.method, "github_environment");
  assert.equal(actualManifest.owner_approval?.environment, "product-standard-approval");
  assert.equal(actualManifest.owner_approval?.required_reviewer, "hraaaaf");
  assert.equal(actualManifest.owner_approval?.require_canonical_update, true);
  assert.equal(actualManifest.owner_approval?.require_manifest_update, true);
});

test("owner override requires both canonical and manifest updates", () => {
  const both = [
    "docs/AKARFINDER_PRODUCT_CONSTITUTION_CANONICAL.md",
    "config/product-constitution.json",
  ];
  assert.equal(overrideDocumentationIsComplete(both, manifest), true);
  assert.equal(
    overrideDocumentationIsComplete(["docs/AKARFINDER_PRODUCT_CONSTITUTION_CANONICAL.md"], manifest),
    false,
  );
});
