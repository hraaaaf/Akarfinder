import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("P1 LOT 3 mobile decision ergonomics", async (t) => {
  await t.test("ships a safe-area aware property decision dock", () => {
    const bar = read("components/listings/MobilePropertyDecisionBar.tsx");
    const page = read("app/listings/[id]/page.tsx");
    assert.ok(bar.includes('aria-label="Actions rapides pour ce bien"'));
    assert.ok(bar.includes("env(safe-area-inset-bottom)"));
    assert.ok(bar.includes("FavoriteToggleButton"));
    assert.ok(bar.includes("CompareToggleButton"));
    assert.ok(bar.includes("Continuer dans Mon Projet"));
    assert.ok(page.includes("pb-24 lg:pb-0"));
    assert.ok(page.includes("MobilePropertyDecisionBar"));
  });

  await t.test("uses a modal mobile filter bottom sheet without losing search context", () => {
    const filters = read("components/search/QuickFilters.tsx");
    assert.ok(filters.includes('role="dialog"'));
    assert.ok(filters.includes('aria-modal="true"'));
    assert.ok(filters.includes("document.body.style.overflow = \"hidden\""));
    assert.ok(filters.includes("max-h-[82dvh]"));
    assert.ok(filters.includes("env(safe-area-inset-bottom)"));
    assert.ok(filters.includes("Voir les résultats"));
    assert.ok(filters.includes("aria-controls=\"advanced-search-filters\""));
  });

  await t.test("keeps list and map modes thumb-reachable", () => {
    const switcher = read("components/search/SearchViewSwitcher.tsx");
    assert.ok(switcher.includes("sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))]"));
    assert.ok(switcher.includes("min-h-11"));
    assert.ok(switcher.includes("aria-pressed={active}"));
    assert.ok(switcher.includes("sm:static"));
  });
});
