import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("UX-LISTING-NAV-FEEDBACK-1", () => {
  it("keeps primary Search listing navigation canonical and explicit", () => {
    const internalCard = source("components/search/SearchListingCardDark.tsx");
    const gatewayCard = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(internalCard.includes('const internalHref = `/bien/${listing.id}`'));
    assert.ok(internalCard.includes("const resultHref = observedExternal && listing.listing_url ? listing.listing_url : internalHref"));
    assert.ok(internalCard.includes("window.location.assign(href)"));
    assert.ok(internalCard.includes("router.push(href)"));
    assert.ok(internalCard.includes("router.prefetch(resultHref)"));
    assert.doesNotMatch(internalCard, /const resultTarget =/);
    assert.doesNotMatch(internalCard, /const resultRel =/);

    assert.ok(gatewayCard.includes("result.original_url"));
    assert.ok(gatewayCard.includes('target="_blank"'));
    assert.ok(gatewayCard.includes('rel="noopener noreferrer"'));
  });

  it("keeps explicit secondary provenance and credit links external", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const secondarySource = card.indexOf("data-secondary-source-link");
    const neighborhoodCredit = card.indexOf("data-neighborhood-photo-credit");

    assert.notEqual(secondarySource, -1);
    assert.notEqual(neighborhoodCredit, -1);
    assert.ok(card.slice(Math.max(0, secondarySource - 220), secondarySource + 120).includes('target="_blank"'));
    assert.ok(card.slice(Math.max(0, neighborhoodCredit - 220), neighborhoodCredit + 120).includes('target="_blank"'));
  });

  it("mounts delayed branded navigation feedback with browser-history resets", () => {
    const feedback = source("components/ui/NavigationFeedback.tsx");
    const layout = source("app/layout.tsx");

    assert.ok(feedback.includes("const SHOW_DELAY_MS = 280"));
    assert.ok(feedback.includes('window.addEventListener("pageshow", reset)'));
    assert.ok(feedback.includes('window.addEventListener("popstate", reset)'));
    assert.ok(feedback.includes('role="status"'));
    assert.ok(feedback.includes('aria-live="polite"'));
    assert.ok(feedback.includes("<MapPin"));
    assert.ok(layout.includes("<NavigationFeedback />"));
    assert.ok(layout.includes("<Suspense fallback={null}>") );
  });

  it("avoids false loading signals and respects reduced motion", () => {
    const feedback = source("components/ui/NavigationFeedback.tsx");
    const styles = source("components/ui/navigation-feedback.module.css");

    assert.ok(feedback.includes('element.target === "_blank"'));
    assert.ok(feedback.includes('href.startsWith("#")'));
    assert.ok(feedback.includes('href.startsWith("mailto:")'));
    assert.ok(feedback.includes('href.startsWith("tel:")'));
    assert.ok(feedback.includes("event.defaultPrevented"));
    assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
    assert.ok(styles.includes("pointer-events: none"));
  });
});
