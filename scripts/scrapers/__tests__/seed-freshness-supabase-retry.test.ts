import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSupabaseError,
  isRetryableSupabaseError,
  withSupabaseRetry,
} from "../../../lib/seed-freshness/supabase-retry.js";

test("formats PostgREST objects instead of [object Object]", () => {
  const text = formatSupabaseError({
    message: "canceling statement due to statement timeout",
    code: "57014",
    details: null,
    hint: null,
  });
  assert.match(text, /statement timeout/);
  assert.match(text, /57014/);
  assert.notEqual(text, "[object Object]");
});

test("recognizes statement timeout and 5xx errors as retryable", () => {
  assert.equal(isRetryableSupabaseError({ message: "canceling statement due to statement timeout", code: "57014" }), true);
  assert.equal(isRetryableSupabaseError({ message: "upstream", status: 503 }), true);
  assert.equal(isRetryableSupabaseError({ message: "constraint violation", code: "23505" }), false);
});

test("bounded retry succeeds after a transient failure", async () => {
  let calls = 0;
  const value = await withSupabaseRetry(async () => {
    calls += 1;
    if (calls < 3) throw { message: "canceling statement due to statement timeout", code: "57014" };
    return "ok";
  }, "fixture", { attempts: 4, baseDelayMs: 0 });
  assert.equal(value, "ok");
  assert.equal(calls, 3);
});

test("non-retryable failures stop immediately with explicit context", async () => {
  let calls = 0;
  await assert.rejects(
    () => withSupabaseRetry(async () => {
      calls += 1;
      throw { message: "constraint violation", code: "23505", details: "fixture" };
    }, "fixture", { attempts: 4, baseDelayMs: 0 }),
    /fixture failed:.*constraint violation.*23505/,
  );
  assert.equal(calls, 1);
});
