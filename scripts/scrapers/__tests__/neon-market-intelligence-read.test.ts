import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  readMarketRowsByIds,
  readResolvedNeighborhoodEvents,
  readValidatedCityRows,
  readValidatedNeighborhoodRows,
} from "../../../lib/map/market-intelligence-db-read.js";
import type { NeonQueryExecutor } from "../../../lib/db/neon-client.js";

const neonEnv = { ...process.env, DATABASE_PROVIDER: "neon" };

test("Neon market-intelligence low-level reads are parameterized", async () => {
  const calls: Array<{ text: string; params: readonly unknown[] }> = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      calls.push({ text, params });
      return [] as T[];
    },
  };

  await readValidatedCityRows("rabat", { env: neonEnv, executor });
  await readValidatedNeighborhoodRows(
    "00000000-0000-4000-8000-000000000001",
    ["agdal", "hassan"],
    { env: neonEnv, executor },
  );
  await readResolvedNeighborhoodEvents(
    ["00000000-0000-4000-8000-000000000002"],
    1000,
    { env: neonEnv, executor },
  );
  await readMarketRowsByIds(
    "thin_index_search_documents",
    "seed_id,canonical_url",
    "seed_id",
    ["00000000-0000-4000-8000-000000000003"],
    { env: neonEnv, executor },
  );

  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].params, ["rabat"]);
  assert.match(calls[1].text, /parent_id = \$1::uuid/);
  assert.deepEqual(calls[1].params[1], ["agdal", "hassan"]);
  assert.match(calls[2].text, /resolved_neighborhood_id = ANY\(\$1::uuid\[\]\)/);
  assert.deepEqual(calls[2].params[1], 1000);
  assert.match(calls[3].text, /seed_id::text = ANY\(\$1::text\[\]\)/);
});

test("market-intelligence read module rejects unsafe identifiers", async () => {
  const executor: NeonQueryExecutor = {
    async query<T>(): Promise<T[]> {
      return [] as T[];
    },
  };

  await assert.rejects(
    () => readMarketRowsByIds(
      "thin_index_search_documents",
      "seed_id,canonical_url;drop table x",
      "seed_id",
      ["x"],
      { env: neonEnv, executor },
    ),
    /unsafe SQL identifier/,
  );
});

test("City and Rabat live readers no longer import Supabase directly", () => {
  for (const path of [
    "lib/map/city-market-intelligence-live.ts",
    "lib/map/rabat-market-intelligence-live.ts",
  ]) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.ok(!source.includes("@/lib/db/supabase-client"), path);
    assert.ok(source.includes("@/lib/map/market-intelligence-db-read"), path);
  }
});
