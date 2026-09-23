import assert from "node:assert/strict";
import test from "node:test";

import {
  getDbProvider,
  isNeonConfigured,
} from "../../../lib/db/provider.js";

test("Neon provider is explicit and requires its own server-side URL", () => {
  const env = {
    DATABASE_PROVIDER: "neon",
    NEON_DATABASE_URL: "postgresql://example.invalid/AkarFinder",
  } as NodeJS.ProcessEnv;

  assert.equal(getDbProvider(env), "neon");
  assert.equal(isNeonConfigured(env), true);
});

test("unknown providers still fail safely to the local sqlite default", () => {
  const env = { DATABASE_PROVIDER: "unexpected" } as NodeJS.ProcessEnv;
  assert.equal(getDbProvider(env), "sqlite");
  assert.equal(isNeonConfigured(env), false);
});
