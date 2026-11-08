import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const router = readFileSync("lib/map/market-listing-observations.ts", "utf8");
const neon = readFileSync("lib/map/neon-listing-market-observations.ts", "utf8");
const supabase = readFileSync("lib/map/supabase-listing-market-observations.ts", "utf8");
const market = readFileSync("lib/map/city-market-intelligence-live.ts", "utf8");
const functionSql = readFileSync("db/baselines/akarfinder_supabase_market_authorized_observations_2026-11-08.sql", "utf8");
const api = readFileSync("app/api/geo/market-intelligence/route.ts", "utf8");

test("market provider router isolates Neon and Supabase and never cross-falls back", () => {
  assert.match(router, /const provider = getDbProvider\(\)/);
  assert.match(router, /provider === "supabase"/);
  assert.match(router, /provider === "neon"/);
  assert.match(router, /market_observations_provider_unavailable/);
  assert.match(market, /readListingMarketObservations/);
  assert.doesNotMatch(market, /supabase/i);
  assert.doesNotMatch(neon, /supabase/i);
  assert.doesNotMatch(supabase, /queryNeonRows/);
  assert.match(supabase, /getSupabaseServerClient\(\)\.rpc\(\s*"read_market_observations_v1"/);
  assert.match(supabase, /p_max_rows: MAX_MARKET_ROWS \+ 1/);
});

test("market RPC reads only active, authorized sources, using invoker privileges", () => {
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

test("neither provider infers a fresh offer from its update timestamp", () => {
  assert.match(supabase, /fresh: false/);
  assert.match(neon, /fresh: false/);
  assert.match(supabase, /market intelligence safety bound reached/);
  assert.match(neon, /market intelligence safety bound reached/);
});
