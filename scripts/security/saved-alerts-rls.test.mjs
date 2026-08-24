import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const legacyTemplate = read("db/supabase-p18a-alerts-migration.sql");
const hardeningMigration = read(
  "supabase/migrations/20260824083500_harden_saved_alerts_access.sql"
);

const unsafePublicPolicy = /create\s+policy\s+"service_role_all"[\s\S]*?for\s+all\s+using\s*\(\s*true\s*\)/i;
const revokePublicClients = /revoke\s+all\s+privileges\s+on\s+table\s+(?:public\.)?saved_alerts\s+from\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;/i;
const grantServiceRole = /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+(?:public\.)?saved_alerts\s+to\s+service_role\s*;/i;

test("P18A template keeps saved_alerts server-only", () => {
  assert.doesNotMatch(legacyTemplate, unsafePublicPolicy);
  assert.match(legacyTemplate, /drop\s+policy\s+if\s+exists\s+"service_role_all"/i);
  assert.match(legacyTemplate, revokePublicClients);
  assert.match(legacyTemplate, grantServiceRole);
});

test("M7-A additive migration removes the legacy public access path", () => {
  assert.doesNotMatch(hardeningMigration, unsafePublicPolicy);
  assert.match(hardeningMigration, /alter\s+table\s+public\.saved_alerts\s+enable\s+row\s+level\s+security/i);
  assert.match(hardeningMigration, /drop\s+policy\s+if\s+exists\s+"service_role_all"\s+on\s+public\.saved_alerts/i);
  assert.match(hardeningMigration, revokePublicClients);
  assert.match(hardeningMigration, grantServiceRole);
});
