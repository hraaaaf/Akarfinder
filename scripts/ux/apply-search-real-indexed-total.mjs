import fs from "node:fs";

const path = "components/search/LightZillowSearchShell.tsx";
let source = fs.readFileSync(path, "utf8");

function requireCount(needle, expected) {
  const actual = source.split(needle).length - 1;
  if (actual !== expected) throw new Error(`expected ${expected} occurrence(s) of ${needle}, got ${actual}`);
}

requireCount("  void indexedTotalCount;\n", 1);
requireCount("displayedCount", 5);
requireCount("  const displayedCount = filteredListings.length + gatewayResults.length;\n", 1);

source = source.replace("  void indexedTotalCount;\n", "");
source = source.replaceAll("displayedCount", "loadedResultCount");
source = source.replace(
  "  const loadedResultCount = filteredListings.length + gatewayResults.length;\n",
  "  const loadedResultCount = filteredListings.length + gatewayResults.length;\n" +
    "  const totalResultCount = indexedTotalCount == null\n" +
    "    ? loadedResultCount\n" +
    "    : Math.max(indexedTotalCount, loadedResultCount);\n",
);
source = source.replace(
  "isSearching && loadedResultCount === 0",
  "isSearching && totalResultCount === 0",
);
source = source.replace(
  '${loadedResultCount} résultat${loadedResultCount !== 1',
  '${totalResultCount.toLocaleString("fr-FR")} résultat${totalResultCount !== 1',
);

if (source.includes("displayedCount")) throw new Error("legacy displayedCount remains");
if (source.includes("void indexedTotalCount")) throw new Error("indexedTotalCount is still discarded");
requireCount("const totalResultCount = indexedTotalCount == null", 1);
requireCount('totalResultCount.toLocaleString("fr-FR")', 1);
requireCount("const hasAnyResults = loadedResultCount > 0", 1);

fs.writeFileSync(path, source);
