import assert from "node:assert/strict";
import test from "node:test";
import {
  getDbProvider,
  getDbBackupProvider,
  getDbProviderChain,
} from "../../../lib/db/provider";

const ORIGINAL = {
  DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
  DATABASE_BACKUP_PROVIDER: process.env.DATABASE_BACKUP_PROVIDER,
};

function restore() {
  if (ORIGINAL.DATABASE_PROVIDER === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = ORIGINAL.DATABASE_PROVIDER;
  if (ORIGINAL.DATABASE_BACKUP_PROVIDER === undefined) delete process.env.DATABASE_BACKUP_PROVIDER;
  else process.env.DATABASE_BACKUP_PROVIDER = ORIGINAL.DATABASE_BACKUP_PROVIDER;
}

test.afterEach(restore);

test("production chain can be Neon primary with Supabase backup", () => {
  process.env.DATABASE_PROVIDER = "neon";
  process.env.DATABASE_BACKUP_PROVIDER = "supabase";
  assert.equal(getDbProvider(), "neon");
  assert.equal(getDbBackupProvider(), "supabase");
  assert.deepEqual(getDbProviderChain(), ["neon", "supabase"]);
});

test("duplicate backup provider is ignored", () => {
  process.env.DATABASE_PROVIDER = "neon";
  process.env.DATABASE_BACKUP_PROVIDER = "neon";
  assert.equal(getDbBackupProvider(), null);
  assert.deepEqual(getDbProviderChain(), ["neon"]);
});

test("missing backup preserves single-provider behavior", () => {
  process.env.DATABASE_PROVIDER = "supabase";
  delete process.env.DATABASE_BACKUP_PROVIDER;
  assert.deepEqual(getDbProviderChain(), ["supabase"]);
});

test("invalid primary configuration fails closed", () => {
  process.env.DATABASE_PROVIDER = "unexpected";
  process.env.DATABASE_BACKUP_PROVIDER = "supabase";
  assert.throws(() => getDbProviderChain(), /unsupported DATABASE_PROVIDER/);
});
