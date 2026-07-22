import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createOpenSerpNativeClient, resolveNativeMaxPages } from "../../../lib/openserp-async/openserp-native-client.js";
import { resolveCampaignWaveCount } from "../../../lib/openserp-ingestion/github-campaign-policy.js";

const BASE_ENV: NodeJS.ProcessEnv = {
  PUBLIC_INDEX_POC_ENABLED: "true",
  OPENSERP_ASYNC_FEEDER_ENABLED: "true",
  OPENSERP_LOCAL_URL: "http://127.0.0.1:7070",
  OPENSERP_NATIVE_RESULT_LIMIT: "50",
};

test("native mass lane follows bounded upstream pagination and merges pages", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL | Request) => {
    const value = String(url);
    calls.push(value);
    const parsed = new URL(value);
    const start = Number(parsed.searchParams.get("start") ?? "0");
    const page = start === 0 ? 1 : start === 50 ? 2 : 3;
    return new Response(JSON.stringify({
      query: { text: "appartement casablanca" },
      meta: { requested_at: `2026-07-22T14:0${page}:00.000Z`, version: "test" },
      results: [{ id: `r${page}`, url: `https://example.ma/listing-${page}`, title: `Listing ${page}` }],
      pagination: page < 3
        ? { page, has_more: true, next_start: page * 50 }
        : { page, has_more: false },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const client = createOpenSerpNativeClient({
    env: { ...BASE_ENV, OPENSERP_NATIVE_MAX_PAGES: "3" },
    fetchImpl,
    timeoutMs: 5000,
  });
  const response = await client.search({ engine: "bing", query: "appartement casablanca", limit: 15, locale: "fr-MA" });

  assert.equal(calls.length, 3);
  assert.equal(new URL(calls[0]).searchParams.get("start"), null);
  assert.equal(new URL(calls[1]).searchParams.get("start"), "50");
  assert.equal(new URL(calls[2]).searchParams.get("start"), "100");
  assert.ok(calls.every((call) => new URL(call).searchParams.get("limit") === "50"));
  assert.deepEqual(response.results.map((row) => row.url), [
    "https://example.ma/listing-1",
    "https://example.ma/listing-2",
    "https://example.ma/listing-3",
  ]);
});

test("native pagination remains one page by default and max-pages is hard capped", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(JSON.stringify({
      query: { text: "villa rabat" },
      results: [{ id: "r1", url: "https://example.ma/1" }],
      pagination: { page: 1, has_more: true, next_start: 50 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const client = createOpenSerpNativeClient({ env: { ...BASE_ENV }, fetchImpl, timeoutMs: 5000 });
  await client.search({ engine: "bing", query: "villa rabat", limit: 15 });
  assert.equal(calls, 1);
  assert.equal(resolveNativeMaxPages({ OPENSERP_NATIVE_MAX_PAGES: "999" } as NodeJS.ProcessEnv), 4);
  assert.equal(resolveNativeMaxPages({} as NodeJS.ProcessEnv), 1);
});

test("catch-up policy stays cheap when healthy and scales only after real gaps", () => {
  const now = Date.parse("2026-07-22T15:00:00.000Z");
  assert.equal(resolveCampaignWaveCount("2026-07-22T14:50:00.000Z", now), 1);
  assert.equal(resolveCampaignWaveCount("2026-07-22T14:30:00.000Z", now), 2);
  assert.equal(resolveCampaignWaveCount("2026-07-22T14:00:00.000Z", now), 3);
  assert.equal(resolveCampaignWaveCount("2026-07-22T12:00:00.000Z", now), 4);
  assert.equal(resolveCampaignWaveCount(null, now), 4);
});

test("campaign workflow preserves canonical 10-minute trigger and resolves adaptive waves", () => {
  const workflow = readFileSync(".github/workflows/openserp-github-native-ingestion.yml", "utf8");
  assert.match(workflow, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(workflow, /resolve-campaign-wave-count\.ts/);
  assert.match(workflow, /timeout-minutes: 30/);
  assert.match(workflow, /group: openserp-native-ingestion-production/);
});

test("GitHub mass entrypoint enables 50-result pages and at most three pages", () => {
  const runner = readFileSync("scripts/openserp/run-ingestion-github-actions.ts", "utf8");
  assert.match(runner, /GITHUB_NATIVE_RESULT_LIMIT = "50"/);
  assert.match(runner, /GITHUB_NATIVE_MAX_PAGES = "3"/);
  assert.match(runner, /OPENSERP_NATIVE_MAX_PAGES: GITHUB_NATIVE_MAX_PAGES/);
});
