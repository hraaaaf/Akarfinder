import assert from "node:assert/strict";
import test from "node:test";

import { NeonMarketComparableCandidateRepository } from "../../../lib/property-detail/neon-market-comparables-repository.js";
import type { NeonQueryExecutor } from "../../../lib/db/neon-client.js";

test("Neon market comparables preserve verified-cluster and observation contract", async () => {
  const calls: Array<{ text: string; params: readonly unknown[] }> = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      calls.push({ text, params });
      if (text.includes("FROM public.property_listings")) {
        return [{
          id: 2,
          city: "Rabat",
          district: "Agdal",
          property_type: "apartment",
          transaction_type: "sale",
        }] as unknown as T[];
      }
      if (text.includes("FROM public.property_clusters")) {
        return [{
          id: "00000000-0000-4000-8000-000000000002",
          cluster_origin: "legacy_one_to_one_projection",
          legacy_property_listing_id: 2,
        }] as unknown as T[];
      }
      if (text.includes("FROM public.property_cluster_members")) {
        return [{
          property_cluster_id: "00000000-0000-4000-8000-000000000002",
          source_offer_id: 7,
        }] as unknown as T[];
      }
      if (text.includes("FROM public.listing_sources")) {
        return [{ id: 7, source_name: "Agenz" }] as unknown as T[];
      }
      if (text.includes("FROM public.source_offer_observations")) {
        return [{
          source_offer_id: 7,
          observed_at: "2026-09-20T00:00:00.000Z",
          displayed_price: 1_200_000,
          surface_m2: 90,
        }] as unknown as T[];
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };

  const repository = new NeonMarketComparableCandidateRepository(executor);
  const result = await repository.findCandidates({
    listingId: "1",
    city: "Rabat",
    neighborhood: "Agdal",
    propertyType: "Appartement",
    transactionType: "buy",
    priceMad: 1_250_000,
    surfaceM2: 92,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].listingId, "2");
  assert.equal(result[0].propertyClusterId, "00000000-0000-4000-8000-000000000002");
  assert.equal(result[0].clusterVerified, true);
  assert.deepEqual(result[0].sourceAttribution, ["Agenz"]);
  assert.equal(result[0].displayedPriceMad, 1_200_000);
  assert.equal(result[0].surfaceM2, 90);

  assert.match(calls[0].text, /property_type = \$2/);
  assert.match(calls[0].text, /transaction_type = \$3/);
  assert.match(calls[0].text, /id <> \$5/);
  assert.deepEqual(calls[0].params, ["Rabat", "apartment", "sale", 120, 1]);
  assert.ok(calls.some((call) => call.text.includes("cluster_origin = ANY($2::text[])")));
  assert.ok(calls.some((call) => call.text.includes("source_offer_observations")));
});

test("Neon market comparables fail closed for unsupported property types", async () => {
  let called = false;
  const executor: NeonQueryExecutor = {
    async query<T>(): Promise<T[]> {
      called = true;
      return [];
    },
  };

  const repository = new NeonMarketComparableCandidateRepository(executor);
  const result = await repository.findCandidates({
    listingId: "1",
    city: "Rabat",
    neighborhood: null,
    propertyType: "Château",
    transactionType: "buy",
    priceMad: null,
    surfaceM2: null,
  });

  assert.deepEqual(result, []);
  assert.equal(called, false);
});
