// OPENSERP-GITHUB-NATIVE-TRANSPORT-1
// Proves createOpenSerpNativeClient speaks the real karust/openserp HTTP
// contract (GET /{engine}/search?text=...) correctly for all 3 allowed
// engines, maps its response envelope into the shape the orchestrator
// already expects, and stays gated by the same 3-flag policy as the
// existing adapter client.

import assert from "node:assert/strict";
import test from "node:test";

import { createOpenSerpNativeClient } from "../../../lib/openserp-async/openserp-native-client.js";
import { runOpenSerpLiveQuery } from "../../../lib/openserp-ingestion/openserp-live.js";

function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> | T {
  const snapshot = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    snapshot.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of snapshot.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

const NATIVE_RESPONSE_FIXTURE = {
  query: { text: "appartement casablanca maarif", engines_requested: ["bing"] },
  meta: { request_id: "r1", requested_at: "2026-07-19T20:00:00.000Z", took_ms: 500, engines_failed: [], version: "openserp-1.2.3" },
  results: [
    {
      id: "s_1",
      rank: 1,
      type: "organic",
      title: "Appartement a vendre a Maarif, Casablanca",
      url: "https://example-listings.ma/casablanca/maarif/appartement-1",
      display_url: "example-listings.ma/casablanca/maarif/appartement-1",
      snippet: "Appartement 91 m2, 1 410 000 DH.",
      domain: "example-listings.ma",
      favicon: "https://example-listings.ma/favicon.ico",
      engine: "bing",
      position: { absolute: 1 },
    },
  ],
};

function makeCallRecorder() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(NATIVE_RESPONSE_FIXTURE), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl };
}

const BASE_ENV = {
  PUBLIC_INDEX_POC_ENABLED: "true",
  OPENSERP_ASYNC_FEEDER_ENABLED: "true",
  OPENSERP_LOCAL_URL: "http://127.0.0.1:7070",
};

test("native transport -- Bing uses GET /bing/search with the native query params", async () => {
  const { calls, fetchImpl } = makeCallRecorder();
  const response = await withEnv(BASE_ENV, () => {
    const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
    return client.search({ engine: "bing", query: "appartement casablanca maarif", limit: 15, locale: "fr-MA" });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.method, "GET");
  const url = new URL(calls[0].url);
  assert.equal(`${url.origin}${url.pathname}`, "http://127.0.0.1:7070/bing/search");
  assert.equal(url.searchParams.get("text"), "appartement casablanca maarif");
  assert.equal(url.searchParams.get("limit"), "15");
  assert.equal(url.searchParams.get("lang"), "fr");
  assert.equal(url.searchParams.get("region"), "MA");
  assert.equal(response.engine, "bing");
});

test("native transport -- DuckDuckGo maps to the native /duck/search path segment", async () => {
  const { calls, fetchImpl } = makeCallRecorder();
  await withEnv(BASE_ENV, () => {
    const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
    return client.search({ engine: "duckduckgo", query: "studio casablanca bourgogne", limit: 10 });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.method, "GET");
  const url = new URL(calls[0].url);
  assert.equal(`${url.origin}${url.pathname}`, "http://127.0.0.1:7070/duck/search");
  assert.equal(url.searchParams.get("text"), "studio casablanca bourgogne");
});

test("native transport -- Ecosia uses GET /ecosia/search", async () => {
  const { calls, fetchImpl } = makeCallRecorder();
  await withEnv(BASE_ENV, () => {
    const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
    return client.search({ engine: "ecosia", query: "villa rabat agdal", limit: 10 });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].init?.method, "GET");
  const url = new URL(calls[0].url);
  assert.equal(`${url.origin}${url.pathname}`, "http://127.0.0.1:7070/ecosia/search");
});

test("native transport -- parses the real karust/openserp response envelope into the expected shape", async () => {
  const { fetchImpl } = makeCallRecorder();
  const response = await withEnv(BASE_ENV, () => {
    const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
    return client.search({ engine: "bing", query: "appartement casablanca maarif", limit: 15 });
  });

  assert.equal(response.engine, "bing");
  assert.equal(response.query, "appartement casablanca maarif");
  assert.equal(response.provider, "openserp_async_poc");
  assert.equal(response.version, "openserp-1.2.3");
  assert.equal(response.fetched_at, "2026-07-19T20:00:00.000Z");
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].title, "Appartement a vendre a Maarif, Casablanca");
  assert.equal(response.results[0].url, "https://example-listings.ma/casablanca/maarif/appartement-1");
  assert.equal(response.results[0].display_url, "example-listings.ma/casablanca/maarif/appartement-1");
  assert.equal(response.results[0].domain, "example-listings.ma");
  assert.equal(response.results[0].position?.absolute, 1);
  assert.equal(response.results[0].rank, 1);
});

test("native transport -- still gated by the async-feeder policy (google rejected, flags required)", async () => {
  const { fetchImpl } = makeCallRecorder();
  await assert.rejects(
    withEnv(BASE_ENV, () => {
      const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
      return client.search({ engine: "google", query: "x", limit: 5 });
    }),
    /Google is disabled/i,
  );

  await assert.rejects(
    withEnv({ OPENSERP_LOCAL_URL: "http://127.0.0.1:7070" }, () => {
      const client = createOpenSerpNativeClient({ env: { ...process.env } as NodeJS.ProcessEnv, fetchImpl });
      return client.search({ engine: "bing", query: "x", limit: 5 });
    }),
    /OpenSERP async is disabled for engine: bing/,
  );
});

test("runOpenSerpLiveQuery -- OPENSERP_TRANSPORT=native routes through the native GET contract", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(NATIVE_RESPONSE_FIXTURE), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const { response, provider } = await runOpenSerpLiveQuery({
      engine: "bing",
      query: "appartement casablanca maarif",
      limit: 15,
      env: { ...BASE_ENV, OPENSERP_TRANSPORT: "native" },
      timeoutMs: 5000,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.method, "GET");
    assert.ok(calls[0].url.includes("/bing/search?"));
    assert.equal(response.results[0].title, "Appartement a vendre a Maarif, Casablanca");
    assert.equal(provider.provider_mode, "local_http");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runOpenSerpLiveQuery -- default (no OPENSERP_TRANSPORT) keeps using the adapter POST /search contract", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        engine: "bing",
        query: "appartement casablanca maarif",
        fetched_at: "2026-07-19T20:00:00.000Z",
        results: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await runOpenSerpLiveQuery({
      engine: "bing",
      query: "appartement casablanca maarif",
      limit: 15,
      env: { ...BASE_ENV },
      timeoutMs: 5000,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].url, "http://127.0.0.1:7070/search");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
