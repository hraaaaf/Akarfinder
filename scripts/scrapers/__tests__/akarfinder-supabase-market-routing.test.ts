import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const routing = readFileSync("lib/map/neon-listing-market-observations.ts", "utf8");
const functionSql = readFileSync("db/baselines/akarfinder_supabase_market_authorized_observations_2026-11-08.sql", "utf8");
const api = readFileSync("app/api/geo/market-intelligence/route.ts", "utf8");

test("market source switches with provider; Supabase cannot silently query Neon", () => {
  assert.match(routing, /const provider = getDbProvider\(\)/);
  assert.match(routing, /if \(provider === "supabase"\)/);
  assert.match(routing, /getSupabaseServerClient\(\)\.rpc\(\s*"read_market_observations_v1"/);
  assert.match(routing, /else if \(provider === "neon"\)/);
  assert.match(routing, /market_observations_provider_unavailable/);
  assert.match(routing, /p_max_rows: MAX_MARKET_ROWS \+ 1/);
});

test("market observations only expose approved sources through server-side invoker RPC", () => {
  assert.match(functionSql, /JOIN LATERAL/);
  assert.match(functionSql, /s\.is_active IS TRUE/);
  assert.match(functionSql, /p_authorized_sources/);
  assert.match(functionSql, /LANGUAGE sql STABLE SECURITY INVOKER/);
  assert.doesNotMatch(functionSql, /SECURITY DEFINER/);
  assert.match(functionSql, /REVOKE ALL ON FUNCTION[^;]+FROM PUBLIC, anon, authenticated/);
  assert.match(functionSql, /GRANT EXECUTE ON FUNCTION[^;]+TO service_role/);
  assert.match(functionSql, /LIMIT LEAST\(GREATEST/);
  assert.match(api, /status: "unavailable", reason: "market_metrics_unavailable"/);
});

test("market observations are not declared fresh from an update timestamp", () => {
  assert.match(routing, /fresh: false/);
  assert.match(routing, /market intelligence safety bound reached/);
});
