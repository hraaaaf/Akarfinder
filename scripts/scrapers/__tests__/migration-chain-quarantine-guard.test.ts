import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd());
const MIGRATIONS_DIR = resolve(ROOT, "supabase/migrations");
const ARCHIVE_PATH = resolve(
  ROOT,
  "docs/archive/public-index-poc/20260709193000_create_public_property_index_poc.sql",
);
const MANIFEST_PATH = resolve(ROOT, "data/audits/public-index-poc-migration-quarantine.json");

const APPROVED_MARKET_INDEX_MIGRATIONS = [
  "20260716140000_create_discovery_candidates.sql",
  "20260716140100_create_property_clusters.sql",
  "20260716140200_create_property_cluster_members.sql",
  "20260716140300_create_source_offer_observations.sql",
  "20260716140400_add_source_offer_columns_to_listing_sources.sql",
];

// Hashed after normalizing CRLF -> LF: different worktrees of this repo check
// these git-tracked files out with different line endings depending on
// core.autocrlf and checkout history (confirmed harmless via `git diff HEAD`
// returning zero changes across worktrees), so a raw-byte hash would produce
// a false failure here that has nothing to do with actual content drift.
function sha256(path: string): string {
  const normalized = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

test("no lab-only POC migration file sits in the active supabase/migrations chain", () => {
  const files = readdirSync(MIGRATIONS_DIR);
  const pocFiles = files.filter((f) => /poc/i.test(f));
  assert.deepEqual(pocFiles, [], `found unexpected POC file(s) in supabase/migrations/: ${pocFiles.join(", ")}`);
});

test("the 5 approved Market Index migrations remain present and unchanged in the active chain", () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const files = readdirSync(MIGRATIONS_DIR);
  for (const filename of APPROVED_MARKET_INDEX_MIGRATIONS) {
    assert.ok(files.includes(filename), `missing approved migration: ${filename}`);
    const expected = manifest.active_migrations_after.find((m: { filename: string }) => m.filename === filename);
    assert.ok(expected, `manifest has no record for ${filename}`);
    const actualHash = sha256(resolve(MIGRATIONS_DIR, filename));
    assert.equal(actualHash, expected.sha256, `${filename} hash changed unexpectedly`);
  }
});

test("the quarantined POC migration exists in the archive with its original, unmodified content", () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const actualHash = sha256(ARCHIVE_PATH);
  assert.equal(actualHash, manifest.sha256_before, "archived POC file content does not match the pre-quarantine hash");
  assert.equal(actualHash, manifest.sha256_after, "archived POC file content does not match the post-quarantine hash");
});

test("no active product code path references the public_property_index table outside its own gated POC module", () => {
  const activeDirs = ["app/api/search", "app/search", "components", "lib/market-index", "lib/db"];
  const offenders: string[] = [];
  for (const dir of activeDirs) {
    const full = resolve(ROOT, dir);
    let entries: string[] = [];
    try {
      entries = readdirSync(full, { recursive: true }) as string[];
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
      const filePath = resolve(full, entry);
      let content: string;
      try {
        content = readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      if (content.includes("public_property_index")) offenders.push(`${dir}/${entry}`);
    }
  }
  assert.deepEqual(offenders, [], `found unexpected active references to public_property_index: ${offenders.join(", ")}`);
});
