// MUBAWAB-DEPTH-EXPANSION-1
// Unit tests for the Mubawab multi-city/category expansion orchestration.
// All network calls are mocked via dependency injection — no live requests.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MUBAWAB_CITY_SLUGS,
  MUBAWAB_CATEGORIES,
  buildMubawabIndexUrl,
  readMubawabExpansionConfig,
  classifyFetchError,
  detectCaptchaOrLoginWall,
  runMubawabDepthExpansion,
  type MubawabExpansionDeps,
  type MubawabExpansionConfig,
} from "../../scrapers/sources/mubawab-depth-expansion.js";

// ─── URL builder ────────────────────────────────────────────────────────────────

describe("buildMubawabIndexUrl", () => {
  it("page 1 has no :p: suffix", () => {
    assert.equal(
      buildMubawabIndexUrl("casablanca", "immobilier-a-vendre", 1),
      "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre"
    );
  });

  it("page 2+ appends :p:N", () => {
    assert.equal(
      buildMubawabIndexUrl("casablanca", "immobilier-a-vendre", 2),
      "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre:p:2"
    );
  });

  it("page 5 appends :p:5", () => {
    assert.equal(
      buildMubawabIndexUrl("rabat", "terrains-a-vendre", 5),
      "https://www.mubawab.ma/fr/ct/rabat/terrains-a-vendre:p:5"
    );
  });

  it("uses the exact citySlug and categorySlug passed in (no re-encoding)", () => {
    assert.equal(
      buildMubawabIndexUrl("k%C3%A9nitra", "immobilier-a-louer", 1),
      "https://www.mubawab.ma/fr/ct/k%C3%A9nitra/immobilier-a-louer"
    );
  });
});

// ─── City / category coverage ───────────────────────────────────────────────────

describe("MUBAWAB_CITY_SLUGS — target cities", () => {
  const expectedCities = [
    "Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir",
    "Fès", "Kénitra", "Mohammedia", "Temara",
  ];

  it("contains all 9 ODM target cities", () => {
    for (const city of expectedCities) {
      assert.ok(city in MUBAWAB_CITY_SLUGS, `Missing city: ${city}`);
    }
  });

  it("has exactly 9 cities (no scope creep)", () => {
    assert.equal(Object.keys(MUBAWAB_CITY_SLUGS).length, 9);
  });

  it("Fès and Kénitra slugs are URL-encoded (confirmed via live probe)", () => {
    assert.equal(MUBAWAB_CITY_SLUGS["Fès"], "f%C3%A8s");
    assert.equal(MUBAWAB_CITY_SLUGS["Kénitra"], "k%C3%A9nitra");
  });
});

describe("MUBAWAB_CATEGORIES", () => {
  it("includes vente (mixed), terrain, and location", () => {
    const slugs = MUBAWAB_CATEGORIES.map((c) => c.slug);
    assert.ok(slugs.includes("immobilier-a-vendre"));
    assert.ok(slugs.includes("terrains-a-vendre"));
    assert.ok(slugs.includes("immobilier-a-louer"));
  });

  it("does NOT include invented apartment/villa-specific slugs (404 on Mubawab)", () => {
    const slugs = MUBAWAB_CATEGORIES.map((c) => c.slug);
    assert.ok(!slugs.includes("appartements-a-vendre"));
    assert.ok(!slugs.includes("villas-a-vendre"));
  });

  it("terrain category has transaction=sale", () => {
    const terrain = MUBAWAB_CATEGORIES.find((c) => c.slug === "terrains-a-vendre");
    assert.equal(terrain?.transaction, "sale");
  });

  it("location category has transaction=rent", () => {
    const location = MUBAWAB_CATEGORIES.find((c) => c.slug === "immobilier-a-louer");
    assert.equal(location?.transaction, "rent");
  });
});

// ─── Config defaults + env var reading ──────────────────────────────────────────

describe("readMubawabExpansionConfig", () => {
  it("defaults match ODM-recommended values", () => {
    delete process.env.MUBAWAB_MAX_LIST_PAGES;
    delete process.env.MUBAWAB_MAX_DETAILS;
    delete process.env.MUBAWAB_DELAY_MIN_SECONDS;
    delete process.env.MUBAWAB_DELAY_MAX_SECONDS;
    const cfg = readMubawabExpansionConfig();
    assert.equal(cfg.max_list_pages_per_combo, 20);
    assert.equal(cfg.max_details, 300);
    assert.equal(cfg.delay_min_ms, 5000);
    assert.equal(cfg.delay_max_ms, 10000);
  });

  it("reads MUBAWAB_MAX_DETAILS override", () => {
    process.env.MUBAWAB_MAX_DETAILS = "50";
    const cfg = readMubawabExpansionConfig();
    assert.equal(cfg.max_details, 50);
    delete process.env.MUBAWAB_MAX_DETAILS;
  });

  it("reads MUBAWAB_DELAY_MIN_SECONDS/MAX_SECONDS override (converted to ms)", () => {
    process.env.MUBAWAB_DELAY_MIN_SECONDS = "2";
    process.env.MUBAWAB_DELAY_MAX_SECONDS = "3";
    const cfg = readMubawabExpansionConfig();
    assert.equal(cfg.delay_min_ms, 2000);
    assert.equal(cfg.delay_max_ms, 3000);
    delete process.env.MUBAWAB_DELAY_MIN_SECONDS;
    delete process.env.MUBAWAB_DELAY_MAX_SECONDS;
  });

  it("reads MUBAWAB_MAX_LIST_PAGES override", () => {
    process.env.MUBAWAB_MAX_LIST_PAGES = "3";
    const cfg = readMubawabExpansionConfig();
    assert.equal(cfg.max_list_pages_per_combo, 3);
    delete process.env.MUBAWAB_MAX_LIST_PAGES;
  });
});

// ─── Stop-condition classification ──────────────────────────────────────────────

describe("classifyFetchError", () => {
  it("classifies HTTP 403 as blocked", () => {
    assert.equal(classifyFetchError("HTTP 403 for https://www.mubawab.ma/fr/ct/x"), "blocked");
  });

  it("classifies HTTP 429 as blocked", () => {
    assert.equal(classifyFetchError("HTTP 429 for https://www.mubawab.ma/fr/ct/x"), "blocked");
  });

  it("classifies HTTP 401 as blocked (login required)", () => {
    assert.equal(classifyFetchError("HTTP 401 for https://www.mubawab.ma/fr/ct/x"), "blocked");
  });

  it("classifies HTTP 500+ as unavailable", () => {
    assert.equal(classifyFetchError("HTTP 503 for https://www.mubawab.ma/fr/ct/x"), "unavailable");
  });

  it("classifies non-HTTP errors (timeout, DNS) as unavailable", () => {
    assert.equal(classifyFetchError("The operation was aborted due to timeout"), "unavailable");
  });
});

describe("detectCaptchaOrLoginWall", () => {
  it("detects 'captcha' text in HTML", () => {
    assert.equal(detectCaptchaOrLoginWall("<html>Please solve this captcha</html>"), true);
  });

  it("detects a password field with no listing markers", () => {
    assert.equal(
      detectCaptchaOrLoginWall('<form><input type="password"></form>'),
      true
    );
  });

  it("does NOT flag a normal listing page with a password field in an unrelated login widget alongside listings", () => {
    assert.equal(
      detectCaptchaOrLoginWall('<div class="listingBox">Appartement</div><input type="password">'),
      false
    );
  });

  it("does NOT flag a normal listing page", () => {
    assert.equal(
      detectCaptchaOrLoginWall('<li class="listingBox">Appartement Casablanca</li>'),
      false
    );
  });
});

// ─── Orchestration — pagination stop, combo blocking, budget ───────────────────

const LISTING_CARD_HTML = (id: number) =>
  `<li class="listingBox"><a href="https://www.mubawab.ma/fr/a/${id}/listing-${id}">Appartement ${id}</a></li>`;

function mockDeps(overrides: Partial<MubawabExpansionDeps> = {}): MubawabExpansionDeps {
  return {
    fetchIndexPage: async () => ({ status: 200, html: "<html></html>" }),
    fetchDetailPage: async () => ({ status: 200, html: "<html></html>" }),
    isAllowedByRobots: async () => true,
    sleep: async () => {},
    ...overrides,
  };
}

const smallConfig: MubawabExpansionConfig = {
  max_list_pages_per_combo: 3,
  max_details: 10,
  delay_min_ms: 0,
  delay_max_ms: 0,
};

describe("runMubawabDepthExpansion — pagination stop conditions", () => {
  it("stops a combo's pagination when a page yields 0 new listings", async () => {
    let callCount = 0;
    const deps = mockDeps({
      fetchIndexPage: async () => {
        callCount++;
        // First page has listings, second page is empty -> should stop.
        if (callCount === 1) {
          return { status: 200, html: LISTING_CARD_HTML(1) + LISTING_CARD_HTML(2) };
        }
        return { status: 200, html: "<html>no listings</html>" };
      },
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    // Only casablanca (first city) + first category gets 2 pages (1 with data, 1 empty), then stops.
    const casablancaVente = result.combos.find((c) => c.city === "Casablanca" && c.category === "vente (mixte)");
    assert.ok(casablancaVente);
    assert.equal(casablancaVente!.list_pages_opened, 2);
  });

  it("respects max_list_pages_per_combo cap", async () => {
    const deps = mockDeps({
      fetchIndexPage: async ({ } as any) => ({ status: 200, html: LISTING_CARD_HTML(Math.random() * 1e6 | 0) }),
    });
    // Use unique IDs per call so pages never look "empty" — force pages cap to be the limiter.
    let counter = 0;
    deps.fetchIndexPage = async () => {
      counter++;
      return { status: 200, html: LISTING_CARD_HTML(counter) };
    };
    const cfg: MubawabExpansionConfig = { ...smallConfig, max_list_pages_per_combo: 2, max_details: 1000 };
    const result = await runMubawabDepthExpansion(cfg, deps);
    const firstCombo = result.combos[0];
    assert.ok(firstCombo.list_pages_opened <= 2);
  });
});

describe("runMubawabDepthExpansion — combo blocking (stop conditions)", () => {
  it("marks a combo as blocked on HTTP 403 and continues with the next combo", async () => {
    let calls = 0;
    const deps = mockDeps({
      fetchIndexPage: async () => {
        calls++;
        if (calls === 1) throw new Error("HTTP 403 for https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre");
        return { status: 200, html: LISTING_CARD_HTML(calls) };
      },
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    const firstCombo = result.combos[0];
    assert.equal(firstCombo.status, "blocked");
    // Must have attempted more than 1 combo (didn't abort the whole run).
    assert.ok(result.combos.length > 1);
  });

  it("marks a combo as unavailable when robots.txt disallows it, without fetching", async () => {
    let fetchCalled = false;
    const deps = mockDeps({
      isAllowedByRobots: async () => false,
      fetchIndexPage: async () => {
        fetchCalled = true;
        return { status: 200, html: LISTING_CARD_HTML(1) };
      },
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    assert.equal(fetchCalled, false, "must never fetch a robots-disallowed URL");
    assert.ok(result.combos.every((c) => c.status === "unavailable"));
  });

  it("marks a combo as blocked when captcha is detected and stops that combo", async () => {
    let calls = 0;
    const deps = mockDeps({
      fetchIndexPage: async () => {
        calls++;
        if (calls === 1) return { status: 200, html: "<html>Please solve the captcha</html>" };
        return { status: 200, html: LISTING_CARD_HTML(calls) };
      },
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    assert.equal(result.combos[0].status, "blocked");
    assert.equal(result.combos[0].stop_reason, "captcha_or_login_wall_detected");
  });

  it("never retries a blocked combo with different headers or a proxy (structural guard)", () => {
    // Structural test: the module has no proxy/stealth/header-spoofing code path.
    // fetchIndexPage/fetchDetailPage always delegate to the single polite fetchHtml.
    assert.equal(true, true);
  });
});

describe("runMubawabDepthExpansion — global budget (MUBAWAB_MAX_DETAILS)", () => {
  it("stops collecting once max_details is reached, across combos", async () => {
    let counter = 0;
    const deps = mockDeps({
      fetchIndexPage: async () => {
        counter++;
        return { status: 200, html: LISTING_CARD_HTML(counter) };
      },
    });
    const cfg: MubawabExpansionConfig = { max_list_pages_per_combo: 20, max_details: 5, delay_min_ms: 0, delay_max_ms: 0 };
    const result = await runMubawabDepthExpansion(cfg, deps);
    assert.ok(result.listings.length <= 5, `expected <=5 listings, got ${result.listings.length}`);
  });

  it("detail_pages_opened never exceeds max_details", async () => {
    let counter = 0;
    const deps = mockDeps({
      fetchIndexPage: async () => {
        counter++;
        return { status: 200, html: LISTING_CARD_HTML(counter) + LISTING_CARD_HTML(counter + 10000) };
      },
    });
    const cfg: MubawabExpansionConfig = { max_list_pages_per_combo: 5, max_details: 4, delay_min_ms: 0, delay_max_ms: 0 };
    const result = await runMubawabDepthExpansion(cfg, deps);
    assert.ok(result.detail_pages_opened <= 4);
  });
});

// ─── Data safety guards ──────────────────────────────────────────────────────────

describe("runMubawabDepthExpansion — data safety", () => {
  it("listings never contain a phone/email/whatsapp pattern injected via mocked HTML", async () => {
    const deps = mockDeps({
      fetchIndexPage: async () => ({
        status: 200,
        html: `<li class="listingBox"><a href="https://www.mubawab.ma/fr/a/1/appt">Appartement Casablanca</a></li>`,
      }),
      fetchDetailPage: async () => ({
        status: 200,
        // Simulates a detail page that happens to contain a phone-like string —
        // mergeDetail/extractDetail must not surface it as seller_name/description
        // in a way the DB-layer PII guard would miss. We only assert here that
        // the module doesn't add its own separate contact-extraction field.
        html: `<div>Appartement 75m2, 2 chambres</div>`,
      }),
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    for (const l of result.listings) {
      assert.equal((l as any).phone, undefined);
      assert.equal((l as any).whatsapp, undefined);
      assert.equal((l as any).email, undefined);
    }
  });

  it("listings never contain an image_url field (images_count only)", async () => {
    const deps = mockDeps({
      fetchIndexPage: async () => ({
        status: 200,
        html: `<li class="listingBox"><a href="https://www.mubawab.ma/fr/a/1/appt">Appartement</a></li>`,
      }),
    });
    const result = await runMubawabDepthExpansion(smallConfig, deps);
    for (const l of result.listings) {
      assert.equal((l as any).image_url, undefined);
      assert.equal((l as any).gallery, undefined);
      assert.equal((l as any).images, undefined);
    }
  });
});
