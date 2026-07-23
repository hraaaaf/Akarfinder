import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 1 final UI — structural accessibility contracts", () => {
  it("provides one global skip-to-content target", () => {
    const layout = source("app/layout.tsx");
    assert.ok(layout.includes('href="#main-content"'));
    assert.ok(layout.includes('id="main-content"'));
    assert.ok(layout.includes('import "./a11y.css"'));
  });

  it("exposes semantic selected states in Search and navigation", () => {
    const filters = source("components/search/QuickFilters.tsx");
    const header = source("components/layout/SiteHeader.tsx");
    const shell = source("components/search/LightZillowSearchShell.tsx");

    assert.ok(filters.includes('role="group"'));
    assert.ok(filters.includes('aria-label="Type de transaction"'));
    assert.ok(filters.includes("aria-pressed={filters.transactionType === tab.value}"));
    assert.ok(header.includes('aria-current={isActive ? "page" : undefined}'));
    assert.ok(header.includes('aria-label="Navigation mobile principale"'));
    assert.ok(shell.includes("aria-pressed={activeTab === tab}"));
  });

  it("reduces mobile header density while preserving the canonical product entries", () => {
    const header = source("components/layout/SiteHeader.tsx");
    for (const label of ["Recherche", "Acheter", "Louer", "Vendre", "Pro"]) {
      assert.ok(header.includes(`label: "${label}"`), `Missing mobile nav ${label}`);
    }
    assert.equal(header.includes('{ href: "/neuf", label: "Neuf"'), false);
    assert.ok(header.includes("min-h-10"));
  });

  it("enforces global reduced-motion behavior and raises legacy dark microcopy contrast", () => {
    const css = source("app/a11y.css");
    assert.ok(css.includes("prefers-reduced-motion: reduce"));
    assert.ok(css.includes("animation-duration: 0.01ms !important"));
    assert.ok(css.includes(".text-white\\/35"));
    assert.ok(css.includes("rgba(255, 255, 255, 0.72)"));
  });

  it("keeps Search placeholders readable without low-opacity dark overrides", () => {
    const filters = source("components/search/QuickFilters.tsx");
    assert.ok(filters.includes("placeholder:text-muted-foreground/80"));
    assert.equal(filters.includes("dark:placeholder:text-white/35"), false);
  });

  it("makes accent-blue canonical while keeping bronze as an explicit legacy compatibility namespace", () => {
    const tailwind = source("tailwind.config.ts");
    assert.ok(tailwind.includes('"accent-blue":'));
    assert.ok(tailwind.includes("Do not use `bronze-*` in new UI"));
    assert.ok(tailwind.includes('accent: "0 6px 18px rgba(11,99,206,0.24)"'));
  });

  it("ships a responsive Playwright smoke audit for 390, 768 and 1280 widths", () => {
    const audit = source("scripts/audits/final-ui-a11y-smoke.ts");
    for (const width of [390, 768, 1280]) {
      assert.ok(audit.includes(`width: ${width}`));
    }
    assert.ok(audit.includes("horizontal-overflow"));
    assert.ok(audit.includes("accessible-name"));
    assert.ok(audit.includes("keyboard-focus"));
    assert.ok(audit.includes("page.screenshot"));
  });
});
