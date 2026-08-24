// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — Migration safety tests (mission section 19.G).
// Static analysis of the actual SQL files -- no DB connection required/used.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MISSION_MIGRATIONS = [
  "20260716140000_create_discovery_candidates.sql",
  "20260716140100_create_property_clusters.sql",
  "20260716140200_create_property_cluster_members.sql",
  "20260716140300_create_source_offer_observations.sql",
  "20260716140400_add_source_offer_columns_to_listing_sources.sql",
];

const FORBIDDEN_PATTERNS = [
  /\bdrop\s+table\b(?!\s+if\s+not\s+exists)/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+\w+\s+set\b/i,
  /\balter\s+table\s+\w+\s+drop\s+column\b/i,
  /\balter\s+table\s+\w+\s+rename\b/i,
];

function loadMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
}

describe("Migration safety — additive only", () => {
  for (const filename of MISSION_MIGRATIONS) {
    it(`${filename} contains no destructive statement in its active (non-rollback-comment) SQL`, () => {
      const content = loadMigration(filename);
      // Strip the trailing "-- ROLLBACK (manual, not auto-applied):" comment
      // block, which intentionally documents DROP statements as a manual,
      // never-auto-executed rollback recipe.
      const activeSql = content.split(/--\s*ROLLBACK/i)[0];
      for (const pattern of FORBIDDEN_PATTERNS) {
        assert.doesNotMatch(activeSql, pattern, `${filename} matched forbidden pattern ${pattern}`);
      }
    });

    it(`${filename} documents objective/preconditions/impact/rollback in its header comment`, () => {
      const content = loadMigration(filename);
      const header = content.split("\n").slice(0, 20).join("\n").toLowerCase();
      assert.match(header, /objective/i);
      assert.match(header, /precondition/i);
      assert.match(header, /impact/i);
      assert.match(header, /rollback/i);
      assert.match(header, /re-run behavior|lock estimate/i);
    });

    it(`${filename} has a documented rollback SQL block`, () => {
      const content = loadMigration(filename);
      assert.match(content, /--\s*ROLLBACK/i);
    });

    it(`${filename} uses IF [NOT] EXISTS for re-run safety on every CREATE/ADD statement`, () => {
      const content = loadMigration(filename);
      const withoutRollback = content.split(/--\s*ROLLBACK/i)[0];
      // Strip full-line SQL comments so prose in header comments (e.g. "ADD
      // COLUMN ... is a metadata-only change") is never mistaken for a real
      // statement.
      const activeSql = withoutRollback
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n");
      const createTableStatements = activeSql.match(/create\s+table\s+(?!if\s+not\s+exists)\S+/gi) ?? [];
      assert.deepEqual(createTableStatements, [], "found a CREATE TABLE without IF NOT EXISTS");
      const addColumnBlocks = activeSql.match(/add\s+column\s+(?!if\s+not\s+exists)\S+/gi) ?? [];
      assert.deepEqual(addColumnBlocks, [], "found an ADD COLUMN without IF NOT EXISTS");
    });
  }

  it("all 5 mission migration files exist on disk", () => {
    const files = readdirSync(MIGRATIONS_DIR);
    for (const filename of MISSION_MIGRATIONS) {
      assert.ok(files.includes(filename), `${filename} missing from ${MIGRATIONS_DIR}`);
    }
  });
});

describe("Migration safety — RLS enabled on every new table", () => {
  const NEW_TABLE_MIGRATIONS = MISSION_MIGRATIONS.filter((f) => f.includes("create_"));
  for (const filename of NEW_TABLE_MIGRATIONS) {
    it(`${filename} enables row level security on its new table`, () => {
      const content = loadMigration(filename);
      assert.match(content, /enable row level security/i);
    });
  }
});

describe("Migration safety — property_listings itself is never touched", () => {
  it("no migration file contains ALTER TABLE property_listings", () => {
    for (const filename of MISSION_MIGRATIONS) {
      const content = loadMigration(filename);
      assert.doesNotMatch(content, /alter\s+table\s+property_listings/i, `${filename} touches property_listings`);
    }
  });
});

describe("Migration safety — no secrets in migration files", () => {
  it("no migration file contains a credential-shaped string", () => {
    for (const filename of MISSION_MIGRATIONS) {
      const content = loadMigration(filename);
      assert.doesNotMatch(content, /service_role_key|SUPABASE_SERVICE_ROLE_KEY\s*=|sk-[a-zA-Z0-9]{16,}/i);
    }
  });
});

describe("MASS-INDEX M7-B — external claim contract", () => {
  const filename = "20260824084500_external_source_claims_v1.sql";
  const content = loadMigration(filename);

  it("creates an additive server-only claim ledger", () => {
    assert.match(content, /create\s+table\s+if\s+not\s+exists\s+public\.external_source_claims/i);
    assert.match(content, /enable\s+row\s+level\s+security/i);
    assert.match(content, /revoke\s+all\s+privileges\s+on\s+table\s+public\.external_source_claims\s+from\s+PUBLIC\s*,\s*anon\s*,\s*authenticated/i);
    assert.match(content, /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+public\.external_source_claims\s+to\s+service_role/i);
    assert.doesNotMatch(content, /grant[^;]+to\s+(anon|authenticated)/i);
  });

  it("models the required claimant roles and claim states", () => {
    assert.match(content, /claimant_role\s+text[\s\S]+owner[\s\S]+agency[\s\S]+platform/i);
    assert.match(content, /status\s+text[\s\S]+pending[\s\S]+verified[\s\S]+rejected[\s\S]+revoked/i);
    assert.match(content, /verified_email\s+text/i);
    assert.match(content, /control_proof_kind\s+text/i);
    assert.match(content, /control_proof_ref\s+text/i);
  });

  it("hard-locks M7-B to external-index claims and forbids automatic enrichment", () => {
    assert.match(content, /claim_scope\s+text\s+not\s+null\s+default\s+'external_index_only'/i);
    assert.match(content, /check\s*\(claim_scope\s*=\s*'external_index_only'\)/i);
    assert.match(content, /content_enrichment_authorized\s+boolean\s+not\s+null\s+default\s+false/i);
    assert.match(content, /check\s*\(content_enrichment_authorized\s*=\s*false\)/i);
  });

  it("requires review + verified email evidence before verified status", () => {
    assert.match(content, /external_source_claims_verified_state_check/i);
    assert.match(content, /reviewed_by\s+is\s+not\s+null/i);
    assert.match(content, /reviewed_at\s+is\s+not\s+null/i);
    assert.match(content, /verified_at\s+is\s+not\s+null/i);
    assert.match(content, /verified_email\s+is\s+not\s+null/i);
    assert.match(content, /email_verified_at\s+is\s+not\s+null/i);
  });

  it("contains no active destructive write against existing index tables", () => {
    const activeSql = content.split(/--\s*ROLLBACK/i)[0];
    assert.doesNotMatch(activeSql, /\btruncate\b/i);
    assert.doesNotMatch(activeSql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(activeSql, /\bupdate\s+(source_offer_seeds|property_listings|discovery_candidates)\b/i);
    assert.doesNotMatch(activeSql, /\balter\s+table\s+(source_offer_seeds|property_listings|discovery_candidates)\b/i);
  });
});
