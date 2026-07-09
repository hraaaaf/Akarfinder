import { createPublicPropertyIndexStore, PUBLIC_PROPERTY_INDEX_FIXTURES } from "@/lib/public-property-index/index-store";
import type { PublicPropertyIndexSearchQuery } from "@/lib/public-property-index/types";
import { pathToFileURL } from "node:url";

function parseArgs(argv: string[]): PublicPropertyIndexSearchQuery {
  const query: PublicPropertyIndexSearchQuery = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const value = rest.join("=").trim();
    const key = rawKey.trim();
    if (key === "q") query.q = value;
    if (key === "city") query.city = value;
    if (key === "neighborhood") query.neighborhood = value;
    if (key === "property_type") query.property_type = value;
    if (key === "transaction_type") query.transaction_type = value;
    if (key === "limit") query.limit = Number(value);
  }

  return query;
}

async function main(): Promise<void> {
  const query = parseArgs(process.argv.slice(2));
  const store = createPublicPropertyIndexStore({
    env: process.env,
    seedRecords: PUBLIC_PROPERTY_INDEX_FIXTURES,
  });
  const results = await store.search(query);

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "public_property_index_poc",
        results_label: "Résultats publics observés",
        results,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}

export { main, parseArgs };
