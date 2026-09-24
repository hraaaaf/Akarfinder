import assert from "node:assert/strict";
import test from "node:test";

import { NeonObservedPriceHistoryRepository } from "../../../lib/property-detail/neon-akar-estimate-history-repository.js";
import type { NeonQueryExecutor } from "../../../lib/db/neon-client.js";

test("Neon ANN-L9 history preserves verified clusters and chronological observations", async () => {
  const calls: string[] = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string): Promise<T[]> {
      calls.push(text);
      if (text.includes("FROM public.property_clusters")) {
        return [{ id: "00000000-0000-4000-8000-000000000001", cluster_origin: "legacy_one_to_one_projection" }] as unknown as T[];
      }
      if (text.includes("FROM public.property_cluster_members")) {
        return [{ property_cluster_id: "00000000-0000-4000-8000-000000000001", source_offer_id: 7 }] as unknown as T[];
      }
      if (text.includes("FROM public.listing_sources")) {
        return [{ id: 7, source_name: "Agenz" }] as unknown as T[];
      }
      if (text.includes("FROM public.source_offer_observations")) {
        return [
          { source_offer_id: 7, observed_at: "2026-09-01T00:00:00.000Z", displayed_price: 1300000 },
          { source_offer_id: 7, observed_at: "2026-09-20T00:00:00.000Z", displayed_price: 1200000 },
        ] as unknown as T[];
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };

  const repository = new NeonObservedPriceHistoryRepository(executor);
  const history = await repository.findForListingId("42");

  assert.equal(history.points.length, 2);
  assert.equal(history.points[0].displayedPriceMad, 1300000);
  assert.equal(history.points[1].displayedPriceMad, 1200000);
  assert.deepEqual(history.points.map((point) => point.sourceName), ["Agenz", "Agenz"]);
  assert.ok(calls.some((text) => text.includes("cluster_origin = ANY($2::text[])")));
  assert.ok(calls.some((text) => text.includes("ORDER BY observed_at ASC")));
});

test("Neon ANN-L9 history fails closed for non-numeric public IDs", async () => {
  let called = false;
  const executor: NeonQueryExecutor = {
    async query<T>(): Promise<T[]> { called = true; return [] as T[]; },
  };
  const repository = new NeonObservedPriceHistoryRepository(executor);
  const history = await repository.findForListingId("owner-abc");
  assert.equal(history.points.length, 0);
  assert.equal(called, false);
});