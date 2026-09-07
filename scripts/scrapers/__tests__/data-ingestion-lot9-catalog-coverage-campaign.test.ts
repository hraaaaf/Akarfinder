import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createCatalogCoverageState,
  runCatalogCoverageWave,
} from "../../../data-ingestion/sources/mubawab/catalog-coverage-campaign.js";

function html(ids: string[]) {
  return ids.map((id) => `<a href="/fr/a/${id}/listing-${id}">x</a>`).join("\n");
}

describe("Lot 9 persistent catalog coverage campaign", () => {
  it("persists global and per-surface IDs and resumes from exact next pages", async () => {
    const surfaces = [
      { id: "sale", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre" },
      { id: "rent", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer" },
    ];
    let state = createCatalogCoverageState({ baselineSourceIds: ["1", "2"], surfaces });

    const pages = new Map<string, string>([
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre", html(["1", "3"])],
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer", html(["2", "4"])],
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre:p:2", html(["3", "5"])],
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer:p:2", html(["4", "6"])],
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre:p:3", html(["3", "5"])],
      ["https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer:p:3", ""],
    ]);

    state = await runCatalogCoverageWave({
      state,
      waveId: "wave-1",
      maxPages: 4,
      maxPagesPerSurface: 2,
      fetchPage: async (url) => pages.get(url) ?? "",
    });

    assert.deepEqual(state.seen_source_ids, ["1", "2", "3", "4", "5", "6"]);
    assert.equal(state.totals.pages_requested, 4);
    assert.equal(state.totals.global_unique_added, 4);
    assert.equal(state.surfaces[0].next_page, 3);
    assert.equal(state.surfaces[1].next_page, 3);
    assert.equal(state.surfaces[0].completed, false);
    assert.equal(state.surfaces[1].completed, false);

    state = await runCatalogCoverageWave({
      state,
      waveId: "wave-2",
      maxPages: 2,
      maxPagesPerSurface: 1,
      fetchPage: async (url) => pages.get(url) ?? "",
    });

    assert.equal(state.surfaces[0].completed, true);
    assert.equal(state.surfaces[0].stop_reason, "zero_new_surface_ids");
    assert.equal(state.surfaces[1].completed, true);
    assert.equal(state.surfaces[1].stop_reason, "zero_refs");
    assert.equal(state.seen_source_ids.length, 6);
    assert.equal(state.wave_history.length, 2);
  });

  it("rejects duplicate waves and unsafe budgets", async () => {
    const state = createCatalogCoverageState({
      baselineSourceIds: [],
      surfaces: [{ id: "sale", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre" }],
    });

    const once = await runCatalogCoverageWave({
      state,
      waveId: "same",
      maxPages: 1,
      maxPagesPerSurface: 1,
      fetchPage: async () => "",
    });

    await assert.rejects(
      runCatalogCoverageWave({
        state: once,
        waveId: "same",
        maxPages: 1,
        maxPagesPerSurface: 1,
        fetchPage: async () => "",
      }),
      /duplicate_wave/,
    );

    await assert.rejects(
      runCatalogCoverageWave({
        state,
        waveId: "unsafe",
        maxPages: 301,
        maxPagesPerSurface: 1,
        fetchPage: async () => "",
      }),
      /invalid_max_pages/,
    );
  });
});
