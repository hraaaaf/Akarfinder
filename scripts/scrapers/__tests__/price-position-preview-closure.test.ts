import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sitemap from "../../../app/sitemap.js";
import PricePositionPreviewPage from "../../../app/preview/price-position/page.js";
import {
  canAccessPricePositionPreviewDemo,
  ensurePricePositionPreviewDemoAccess,
} from "../../../lib/price-position/price-position-preview-access.js";
import { PRICE_POSITION_PREVIEW_FIXTURE } from "../../../lib/price-position/price-position-preview-fixture.js";

async function withEnv<T>(changes: Record<string, string | undefined>, fn: () => T | Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(changes)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
  return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const REACT_FRAGMENT = Symbol.for("react.fragment");

function collectTree(node: unknown, result: { text: string; testIds: string[] }): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    result.text += String(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectTree(child, result);
    return;
  }
  if (typeof node !== "object") return;

  const element = node as { type?: unknown; props?: { children?: unknown; [key: string]: unknown } };
  if (!element.props) return;

  if (typeof element.props["data-testid"] === "string") {
    result.testIds.push(element.props["data-testid"] as string);
  }

  if (typeof element.type === "function") {
    collectTree(element.type(element.props), result);
    return;
  }

  if (element.type === REACT_FRAGMENT) {
    collectTree(element.props.children, result);
    return;
  }

  collectTree(element.props.children, result);
}

async function renderPage(): Promise<{ text: string; testIds: string[] }> {
  const node = await PricePositionPreviewPage();
  const result = { text: "", testIds: [] as string[] };
  collectTree(node, result);
  return result;
}

describe("price-position preview closure", () => {
  it("guards the route in every non-preview combination", async () => {
    const cases: Array<[Record<string, string | undefined>, boolean]> = [
      [{ VERCEL_ENV: undefined, PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true" }, false],
      [{ VERCEL_ENV: "development", PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true" }, false],
      [{ VERCEL_ENV: "production", PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true" }, false],
      [{ VERCEL_ENV: "preview", PRICE_POSITION_PREVIEW_DEMO_ENABLED: undefined }, false],
      [{ VERCEL_ENV: "preview", PRICE_POSITION_PREVIEW_DEMO_ENABLED: "false" }, false],
      [{ VERCEL_ENV: "preview", PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true" }, true],
    ];

    for (const [env, expected] of cases) {
      await withEnv(env, () => {
        assert.equal(canAccessPricePositionPreviewDemo(), expected);
        if (expected) {
          assert.doesNotThrow(() => ensurePricePositionPreviewDemoAccess());
        } else {
          assert.throws(() => ensurePricePositionPreviewDemoAccess(), /PRICE_POSITION_PREVIEW_DEMO_NOT_FOUND/);
        }
      });
    }
  });

  it("renders the preview shell and the real price-position block when both flags are on", async () => {
    await withEnv(
      {
        VERCEL_ENV: "preview",
        PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true",
        PRICE_POSITION_REFERENCE_ENABLED: "true",
      },
      async () => {
        const rendered = await renderPage();
        assert.ok(rendered.testIds.includes("price-position-preview-page"));
        assert.ok(rendered.testIds.includes("price-position-fixture"));
        assert.ok(rendered.testIds.includes("price-position-public-block"));
        assert.ok(rendered.text.includes("Repère prix indicatif"));
        assert.ok(rendered.text.includes("Position relative"));
        assert.ok(rendered.text.includes("Données indicatives, non officielles"));
        assert.ok(rendered.text.includes("À confirmer avec la source originale"));
        assert.ok(!rendered.text.includes("benchmark_value"));
        assert.ok(!rendered.text.includes("value_low"));
        assert.ok(!rendered.text.includes("value_median"));
        assert.ok(!rendered.text.includes("value_high"));
        assert.ok(!rendered.text.includes("evidence_ref"));
        assert.ok(!rendered.text.includes("source_registry"));
        assert.ok(!rendered.text.includes("PricePositionDecisionInternal"));
        assert.ok(!rendered.text.includes("decision_reason"));
        assert.ok(!rendered.text.includes("benchmark_id"));
      },
    );
  });

  it("keeps the shell but removes the public block when the feature flag is off", async () => {
    await withEnv(
      {
        VERCEL_ENV: "preview",
        PRICE_POSITION_PREVIEW_DEMO_ENABLED: "true",
        PRICE_POSITION_REFERENCE_ENABLED: "false",
      },
      async () => {
        const rendered = await renderPage();
        assert.ok(rendered.testIds.includes("price-position-preview-page"));
        assert.ok(rendered.testIds.includes("price-position-fixture"));
        assert.ok(!rendered.testIds.includes("price-position-public-block"));
        assert.ok(!rendered.text.includes("Repère prix indicatif"));
        assert.ok(!rendered.text.includes("Position relative"));
        assert.ok(!rendered.text.includes("Données indicatives, non officielles"));
        assert.ok(!rendered.text.includes("À confirmer avec la source originale"));
        assert.ok(!rendered.text.includes("benchmark_value"));
        assert.ok(!rendered.text.includes("PricePositionDecisionInternal"));
      },
    );
  });

  it("does not add the preview route to the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    assert.equal(urls.some((url) => url.includes("/preview/price-position")), false);
  });

  it("uses a deterministic fixture with an eligible property", () => {
    const listing = PRICE_POSITION_PREVIEW_FIXTURE.listing;
    assert.equal(listing.city, "Casablanca");
    assert.equal(listing.neighborhood, "Maarif");
    assert.equal(listing.property_type, "Appartement");
    assert.equal(listing.price > 0, true);
    assert.equal(listing.surface_m2 > 0, true);
    assert.equal(PRICE_POSITION_PREVIEW_FIXTURE.expected_public_label, "Position relative proche");
  });
});
