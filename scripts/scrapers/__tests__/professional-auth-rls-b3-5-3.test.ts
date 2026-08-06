import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Supabase clients separate privileged admin access from user-scoped RLS access", () => {
  const source = readFileSync(join(root, "lib/db/supabase-client.ts"), "utf8");

  assert.match(source, /getSupabaseAdminClient/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /getSupabaseUserClient\(accessToken/);
  assert.match(source, /SUPABASE_ANON_KEY/);
  assert.match(source, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(source, /getSupabaseServerClient[\s\S]*getSupabaseAdminClient\(\)/);
});

test("professional bearer validation never uses the service-role client", () => {
  const source = readFileSync(join(root, "lib/professional/auth.ts"), "utf8");

  assert.match(source, /getSupabaseAuthClient/);
  assert.doesNotMatch(source, /getSupabaseServerClient/);
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /appMetadata\?\.akarfinder_staff === true/);
});
