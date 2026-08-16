import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("ANN-L8 public wiring", () => {
  it("builds Market Comparables server-side and passes the certified model through the premium shell", async () => {
    const page = await source("app/listings/[id]/page.tsx");
    const shell = await source("components/listings/AnnouncementPageShell.tsx");
    assert.match(page, /buildMarketComparablesRuntime/);
    assert.match(page, /marketComparables=\{marketComparables\}/);
    assert.match(shell, /marketComparables\?: MarketComparableSet \| null/);
    assert.match(shell, /marketComparables=\{marketComparables\}/);
  });

  it("renders Market Comparables after Street Reality in PropertyDetailV2", async () => {
    const detail = await source("components/listings/PropertyDetailV2.tsx");
    assert.match(detail, /StreetRealitySection model=\{streetReality\}[\s\S]*MarketComparablesSection model=\{marketComparables\}/);
  });

  it("keeps distribution math out of React and consumes only the certified model", async () => {
    const ui = await source("components/listings/MarketComparablesSection.tsx");
    assert.match(ui, /model\.status !== "certified"/);
    for (const forbidden of ["quantile(", "median(", "buildCertifiedComparableSet", "getMarketReference("]) {
      assert.equal(ui.includes(forbidden), false, `${forbidden} must stay outside React`);
    }
  });

  it("labels observed asking prices honestly and never presents them as transaction prices or AkarEstimate", async () => {
    const ui = await source("components/listings/MarketComparablesSection.tsx");
    assert.match(ui, /prix affichés observés/);
    assert.match(ui, /pas des prix de transaction/);
    assert.match(ui, /ni une estimation certifiée du bien/);
  });
});
