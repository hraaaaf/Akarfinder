import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectInvariantViolations,
  hasExactHeadOwnerApproval,
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

test("owner approval is valid only for the exact PR HEAD", () => {
  const reviews = [
    { user: { login: "hraaaaf" }, state: "APPROVED", commit_id: "abc123" },
  ];
  assert.equal(hasExactHeadOwnerApproval(reviews, "hraaaaf", "abc123"), true);
  assert.equal(hasExactHeadOwnerApproval(reviews, "hraaaaf", "new456"), false);
  assert.equal(hasExactHeadOwnerApproval(reviews, "someone-else", "abc123"), false);
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
