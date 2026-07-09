import { PUBLIC_PROPERTY_INDEX_FIXTURES } from "@/lib/public-property-index/public-index-fixtures";
import { pathToFileURL } from "node:url";

function main(): void {
  const summary = {
    ok: true,
    count: PUBLIC_PROPERTY_INDEX_FIXTURES.length,
    results_label: "Résultats publics observés",
    results: PUBLIC_PROPERTY_INDEX_FIXTURES,
  };

  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main };
