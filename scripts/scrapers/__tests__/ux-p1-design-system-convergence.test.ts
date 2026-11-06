import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("shared semantic primitives exist", () => {
  const designSystem = source("components/ui/design-system.ts");
  for (const token of ["page", "pageLight", "surface", "surfaceMuted", "field", "primaryAction", "secondaryAction", "status"]) {
    assert.ok(designSystem.includes(token), `missing semantic primitive ${token}`);
  }
});

test("search filters and active announcement shell consume shared primitives", () => {
  const filters = source("components/search/QuickFilters.tsx");
  const shell = source("components/listings/AnnouncementPageShell.tsx");
  const decision = source("components/listings/PropertyDecisionHeader.tsx");
  const page = source("app/listings/[id]/page.tsx");

  assert.ok(filters.includes('from "@/components/ui/design-system"'));
  assert.ok(shell.includes('from "@/components/ui/design-system"'));
  assert.ok(decision.includes('from "@/components/ui/design-system"'));
  assert.ok(page.includes("AnnouncementPageShell"));
  assert.ok(filters.includes("ui.field"));
  assert.ok(decision.includes("ui.primaryAction"));
  assert.ok(shell.includes("ui.pageLight"));
});

test("non-frozen migrated announcement surfaces no longer carry local brand hex colors", () => {
  // QuickFilters remains an explicitly frozen premium Search surface whose exact
  // mockup palette is certified by dedicated Search controls / full-page gates.
  // PropertyDetailV2 is intentionally deferred to ANN-L3 and is not part of this gate.
  const migrated = [
    source("components/listings/AnnouncementPageShell.tsx"),
    source("app/listings/[id]/page.tsx"),
  ].join("\n");

  assert.ok(!/#[0-9a-fA-F]{6}/.test(migrated));
  assert.ok(!migrated.includes("text-gray-"));
  assert.ok(!migrated.includes("bg-white"));
});

test("Plus Jakarta Sans is vendored with OFL license and no build-time Google download", () => {
  const layout = source("app/layout.tsx");
  const license = source("app/fonts/OFL.txt");
  const font = readFileSync("app/fonts/PlusJakartaSans-Variable.ttf");
  assert.match(layout, /import localFont from "next\\/font\\/local"/);
  assert.doesNotMatch(layout, /next\\/font\\/google/);
  assert.match(layout, /src:\\s*"\\.\\/fonts\\/PlusJakartaSans-Variable\\.ttf"/);
  assert.match(layout, /weight:\\s*"200 800"/);
  assert.match(layout, /variable:\\s*"--font-jakarta"/);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\\.1/);
  assert.equal(font.subarray(0, 4).toString("hex"), "00010000");
  assert.ok(font.length > 100_000, "unexpected truncated font");
});
