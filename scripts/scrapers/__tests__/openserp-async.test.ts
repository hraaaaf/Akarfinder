import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { createOpenSerpClient } from "../../../lib/openserp-async/openserp-client.js";
import { mapOpenSerpRawResultToPublicPropertyIndexRecord, mapOpenSerpSearchResponseToPublicPropertyIndexRecords } from "../../../lib/openserp-async/openserp-mapper.js";
import { assertOpenSerpEngineAllowed, canCallOpenSerpAsync, normalizeAllowedOpenSerpEngines } from "../../../lib/openserp-async/openserp-policy.js";
import { assertOpenSerpRawResultSafety } from "../../../lib/openserp-async/openserp-public-safety.js";
import { assertPublicPropertyIndexRecordSafety } from "../../../lib/public-property-index/public-safety.js";

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

test("OpenSERP async is disabled by default and Google is rejected", () => {
  assert.equal(canCallOpenSerpAsync({}), false);
  assert.deepEqual(normalizeAllowedOpenSerpEngines("bing,ecosia,google"), ["bing", "ecosia"]);
  assert.throws(() => assertOpenSerpEngineAllowed("google", {}), /Google is disabled/i);
});

test("OpenSERP raw results and mapped records stay public-safe", () => {
  const mapped = mapOpenSerpRawResultToPublicPropertyIndexRecord(
    {
      title: "Appartement a vendre a Maarif, Casablanca",
      snippet: "Appartement 94 m2, 1 490 000 DH, contact hidden, whatsapp hidden.",
      url: "https://example-listings.ma/casablanca/maarif/appartement-1",
      displayUrl: "example-listings.ma/casablanca/maarif/appartement-1",
      price: "1490000",
      surface: "94",
    },
    {
      engine: "bing",
      query: "appartement casablanca maarif",
      result_source: "openserp_async_poc",
      provider_engine: "bing",
    },
  );

  assert.ok(mapped);
  assertPublicPropertyIndexRecordSafety(mapped);
  assert.equal(mapped?.inferred_city, "Casablanca");
  assert.equal(mapped?.inferred_neighborhood, "Maarif");
  assert.equal(mapped?.public_price, 1490000);
  assert.equal(mapped?.public_surface, 94);
  assert.equal(mapped?.short_snippet?.includes("whatsapp"), false);
  assert.equal(mapped?.short_snippet?.includes("@"), false);
});

test("OpenSERP response mapping preserves Bing and Ecosia results without raw_metadata", () => {
  const records = mapOpenSerpSearchResponseToPublicPropertyIndexRecords(
    {
      engine: "ecosia",
      query: "studio casablanca bourgogne",
      fetched_at: "2026-07-09T10:00:00.000Z",
      provider: "openserp_async_poc",
      results: [
        {
          title: "Studio a louer a Bourgogne, Casablanca",
          snippet: "Studio 38 m2, 5 400 DH, calme et lumineux.",
          link: "https://example-listings.ma/casablanca/bourgogne/studio-1",
          displayUrl: "example-listings.ma/casablanca/bourgogne/studio-1",
        },
        {
          title: "Appartement a vendre a Bourgogne, Casablanca",
          snippet: "Appartement 82 m2, 1 260 000 DH.",
          url: "https://example-listings.ma/casablanca/bourgogne/appartement-1",
        },
      ],
    },
    {
      query: "studio casablanca bourgogne",
      observed_at: "2026-07-09T10:00:00.000Z",
      result_source: "openserp_async_poc",
      provider_engine: "ecosia",
    },
  );

  assert.equal(records.length, 2);
  assertPublicPropertyIndexRecordSafety(records[0]);
  assert.equal(Object.keys(records[0]).includes("raw_metadata"), false);
  assert.equal(records[0].provider_engine, "ecosia");
});

test("OpenSERP client calls the local endpoint only when the feeder is enabled", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = await withEnv(
    {
      PUBLIC_INDEX_POC_ENABLED: "true",
      OPENSERP_ASYNC_FEEDER_ENABLED: "true",
      OPENSERP_LOCAL_URL: "http://localhost:4545",
      OPENSERP_ALLOWED_ENGINES: "bing,ecosia",
    },
    () =>
      createOpenSerpClient({
        env: { ...process.env } as NodeJS.ProcessEnv,
        fetchImpl: async (url, init) => {
          calls.push({ url: String(url), init });
          return new Response(
            JSON.stringify({
              engine: "bing",
              query: "appartement casablanca maarif",
              fetched_at: "2026-07-09T10:00:00.000Z",
              results: [
                {
                  title: "Appartement a vendre a Maarif, Casablanca",
                  snippet: "Appartement 91 m2, 1 410 000 DH.",
                  url: "https://example-listings.ma/casablanca/maarif/appartement-1",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        },
      }),
  );

  const response = await client.search({
    engine: "bing",
    query: "appartement casablanca maarif",
    limit: 5,
    locale: "fr-MA",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:4545/search");
  assert.equal(response.engine, "bing");
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].title, "Appartement a vendre a Maarif, Casablanca");
});

test("OpenSERP internal route does not reference OpenSERP or Google", () => {
  const routePath = resolve(
    process.cwd(),
    "app/api/internal/public-index/search/route.ts",
  );
  const routeSource = readFileSync(routePath, "utf8").toLowerCase();

  assert.equal(routeSource.includes("openserp"), false);
  assert.equal(routeSource.includes("google"), false);
  assert.equal(routeSource.includes("opensearch"), false);
});
