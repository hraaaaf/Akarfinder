import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("shared semantic primitives exist", () => {
  const designSystem = source("components/ui/design-system.ts");
  for (const token of ["page", "surface", "surfaceMuted", "field", "primaryAction", "secondaryAction", "status"]) {
    assert.ok(designSystem.includes(token), `missing semantic primitive ${token}`);
  }
});

test("search filters and decision header consume shared primitives", () => {
  const filters = source("components/search/QuickFilters.tsx");
  const decision = source("components/listings/PropertyDecisionHeader.tsx");
  const page = source("app/listings/[id]/page.tsx");

  assert.ok(filters.includes('from "@/components/ui/design-system"'));
  assert.ok(decision.includes('from "@/components/ui/design-system"'));
  assert.ok(page.includes('from "@/components/ui/design-system"'));
  assert.ok(filters.includes("ui.field"));
  assert.ok(decision.includes("ui.primaryAction"));
  assert.ok(page.includes("ui.page"));
});

test("migrated surfaces no longer carry local brand hex colors", () => {
  const migrated = [
    source("components/search/QuickFilters.tsx"),
    source("components/listings/PropertyDecisionHeader.tsx"),
    source("app/listings/[id]/page.tsx"),
  ].join("\n");

  assert.ok(!/#[0-9a-fA-F]{6}/.test(migrated));
  assert.ok(!migrated.includes("text-gray-"));
  assert.ok(!migrated.includes("bg-white"));
});
