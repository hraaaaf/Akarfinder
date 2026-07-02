// MUBAWAB-DEPTH-EXPANSION-1
// Multi-city, multi-category, paginated Mubawab collection — additive to the
// existing single-page runMubawab() (which stays untouched for p0-run.ts /
// nightly ingestion backward compatibility).
//
// Confirmed URL patterns (probed politely with the project's own fetchHtml,
// same UA, robots-aware — see docs/MUBAWAB_DEPTH_EXPANSION.md):
//   https://www.mubawab.ma/fr/ct/{citySlug}/{categorySlug}         (page 1)
//   https://www.mubawab.ma/fr/ct/{citySlug}/{categorySlug}:p:{n}   (page n, n>=2)
// "?page=N" is silently ignored by the server (returns page 1 content) —
// NOT used. Apartment/villa-specific category slugs do not exist (404);
// type coverage comes from "immobilier-a-vendre" (mixed) classified by the
// existing normalizeType() in _shared.ts mapRaw().

import type { ScrapeError, ScrapedListingP0, RawListing, SourceResult } from "../types";
import { fetchHtml, isAllowedByRobots } from "../utils/fetch-html";
import { getJsonLd, getNextData, harvestFromDom, harvestFromJson, loadHtml, extractDetail } from "../utils/extract";
import { mapRaw, mergeDetail } from "./_shared";
import { logger } from "../utils/logger";

const HOST = "mubawab.ma";

// City display name -> URL slug (URL-encoded where the slug has accents).
export const MUBAWAB_CITY_SLUGS: Record<string, string> = {
  Casablanca: "casablanca",
  Rabat: "rabat",
  Marrakech: "marrakech",
  Tanger: "tanger",
  Agadir: "agadir",
  "Fès": "f%C3%A8s",
  "Kénitra": "k%C3%A9nitra",
  Mohammedia: "mohammedia",
  Temara: "temara",
};

export type MubawabCategory = {
  slug: string;
  transaction: "sale" | "rent";
  label: string;
};

// Ordered by priority: mixed sale listings first (best yield/type coverage),
// then terrain-specific (boosts an under-represented type), then rent.
export const MUBAWAB_CATEGORIES: MubawabCategory[] = [
  { slug: "immobilier-a-vendre", transaction: "sale", label: "vente (mixte)" },
  { slug: "terrains-a-vendre", transaction: "sale", label: "terrain (vente)" },
  { slug: "immobilier-a-louer", transaction: "rent", label: "location (mixte)" },
];

export function buildMubawabIndexUrl(citySlug: string, categorySlug: string, page: number): string {
  const base = `https://www.mubawab.ma/fr/ct/${citySlug}/${categorySlug}`;
  return page <= 1 ? base : `${base}:p:${page}`;
}

// ─── Config ────────────────────────────────────────────────────────────────────

export type MubawabExpansionConfig = {
  max_list_pages_per_combo: number;
  max_details: number;
  delay_min_ms: number;
  delay_max_ms: number;
};

export function readMubawabExpansionConfig(): MubawabExpansionConfig {
  const listPages = parseInt(process.env.MUBAWAB_MAX_LIST_PAGES ?? "20", 10);
  const maxDetails = parseInt(process.env.MUBAWAB_MAX_DETAILS ?? "300", 10);
  const delayMinS = parseFloat(process.env.MUBAWAB_DELAY_MIN_SECONDS ?? "5");
  const delayMaxS = parseFloat(process.env.MUBAWAB_DELAY_MAX_SECONDS ?? "10");
  return {
    max_list_pages_per_combo: Number.isFinite(listPages) && listPages > 0 ? listPages : 20,
    max_details: Number.isFinite(maxDetails) && maxDetails > 0 ? maxDetails : 300,
    delay_min_ms: Number.isFinite(delayMinS) && delayMinS > 0 ? delayMinS * 1000 : 5000,
    delay_max_ms: Number.isFinite(delayMaxS) && delayMaxS > 0 ? delayMaxS * 1000 : 10000,
  };
}

// ─── Stop-condition classification ─────────────────────────────────────────────

export type ComboStatus = "ok" | "blocked" | "suppressed" | "unavailable";

// Classifies a fetch failure into a stop-condition status. Never used to
// bypass — only to decide whether to stop hitting a given city/category combo
// and how to label it in the report.
export function classifyFetchError(message: string): ComboStatus {
  const httpMatch = message.match(/HTTP (\d+)/);
  if (httpMatch) {
    const status = parseInt(httpMatch[1], 10);
    if (status === 403 || status === 429) return "blocked";
    if (status === 401) return "blocked"; // login required
    if (status >= 500) return "unavailable";
  }
  return "unavailable";
}

export function detectCaptchaOrLoginWall(html: string): boolean {
  const lower = html.toLowerCase();
  if (lower.includes("captcha")) return true;
  // Heuristic login-wall detector: a page with a password field and no
  // listing markers is not a listing index page.
  if (lower.includes('type="password"') && !/listingbox|adlisting/.test(lower)) return true;
  return false;
}

// ─── Combo report ──────────────────────────────────────────────────────────────

export type ComboReport = {
  city: string;
  category: string;
  status: ComboStatus;
  list_pages_opened: number;
  listings_discovered: number;
  stop_reason?: string;
};

export type MubawabExpansionResult = {
  listings: ScrapedListingP0[];
  errors: ScrapeError[];
  combos: ComboReport[];
  list_pages_opened: number;
  detail_pages_opened: number;
};

function safeDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((r) => setTimeout(r, ms));
}

function extractRawFromHtml(html: string, sourceUrl: string, max: number): RawListing[] {
  const raws: RawListing[] = [];
  const seen = new Set<string>();
  const pushUnique = (arr: RawListing[]) => {
    for (const r of arr) {
      if (raws.length >= max) break;
      if (r.listing_url && !seen.has(r.listing_url)) {
        seen.add(r.listing_url);
        raws.push(r);
      }
    }
  };

  try {
    const $ = loadHtml(html);
    const ld = getJsonLd($);
    if (ld.length) pushUnique(harvestFromJson(ld, { host: HOST, max }));
  } catch {
    // best-effort
  }

  if (raws.length < max) {
    try {
      const nd = getNextData(html);
      if (nd) pushUnique(harvestFromJson(nd, { host: HOST, max }));
    } catch {
      // best-effort
    }
  }

  if (raws.length === 0) {
    try {
      const $ = loadHtml(html);
      pushUnique(
        harvestFromDom($, {
          base: sourceUrl,
          host: HOST,
          max,
          cardSelectors: ["li.listingBox", ".listingBox", "article.listingBox", ".adListing", 'a[href*="/fr/a/"]'],
        })
      );
    } catch {
      // best-effort
    }
  }

  return raws;
}

// Dependency-injectable fetch layer — lets tests exercise the orchestration
// logic (pagination stop, combo blocking, budget accounting) without network.
export type MubawabExpansionDeps = {
  fetchIndexPage: (url: string) => Promise<{ status: number; html: string }>;
  fetchDetailPage: (url: string) => Promise<{ status: number; html: string }>;
  isAllowedByRobots: (url: string) => Promise<boolean>;
  sleep: (minMs: number, maxMs: number) => Promise<void>;
};

function buildDefaultDeps(): MubawabExpansionDeps {
  return {
    fetchIndexPage: async (url) => {
      const res = await fetchHtml(url);
      return { status: res.status, html: res.html };
    },
    fetchDetailPage: async (url) => {
      const res = await fetchHtml(url);
      return { status: res.status, html: res.html };
    },
    isAllowedByRobots,
    sleep: safeDelay,
  };
}

export async function runMubawabDepthExpansion(
  config?: MubawabExpansionConfig,
  deps?: MubawabExpansionDeps
): Promise<MubawabExpansionResult> {
  const cfg = config ?? readMubawabExpansionConfig();
  const d = deps ?? buildDefaultDeps();

  const errors: ScrapeError[] = [];
  const combos: ComboReport[] = [];
  const rawByUrl = new Map<string, { raw: RawListing; category: MubawabCategory }>();

  let listPagesOpened = 0;

  outer: for (const category of MUBAWAB_CATEGORIES) {
    for (const [cityLabel, citySlug] of Object.entries(MUBAWAB_CITY_SLUGS)) {
      if (rawByUrl.size >= cfg.max_details) break outer;

      const combo: ComboReport = {
        city: cityLabel,
        category: category.label,
        status: "ok",
        list_pages_opened: 0,
        listings_discovered: 0,
      };
      combos.push(combo);

      // Robots check once per combo (same origin, but path differs per combo).
      const firstUrl = buildMubawabIndexUrl(citySlug, category.slug, 1);
      let allowed = true;
      try {
        allowed = await d.isAllowedByRobots(firstUrl);
      } catch {
        allowed = true;
      }
      if (!allowed) {
        combo.status = "unavailable";
        combo.stop_reason = "robots_disallowed";
        errors.push({
          source: "mubawab",
          stage: "robots",
          url: firstUrl,
          message: "Disallowed by robots.txt — combo skipped politely",
          at: new Date().toISOString(),
        });
        continue;
      }

      let consecutiveEmptyPages = 0;

      for (let page = 1; page <= cfg.max_list_pages_per_combo; page++) {
        if (rawByUrl.size >= cfg.max_details) break outer;

        const url = buildMubawabIndexUrl(citySlug, category.slug, page);
        await d.sleep(cfg.delay_min_ms, cfg.delay_max_ms);

        let html: string;
        try {
          const res = await d.fetchIndexPage(url);
          html = res.html;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const status = classifyFetchError(message);
          combo.status = status;
          combo.stop_reason = message;
          errors.push({ source: "mubawab", stage: "list", url, message, at: new Date().toISOString() });
          break; // stop this combo, move to next — never bypass
        }

        listPagesOpened++;
        combo.list_pages_opened++;

        if (detectCaptchaOrLoginWall(html)) {
          combo.status = "blocked";
          combo.stop_reason = "captcha_or_login_wall_detected";
          errors.push({
            source: "mubawab",
            stage: "list",
            url,
            message: "Captcha or login wall detected — combo stopped",
            at: new Date().toISOString(),
          });
          break;
        }

        const remaining = cfg.max_details - rawByUrl.size;
        const raws = extractRawFromHtml(html, url, remaining);

        let newCount = 0;
        for (const r of raws) {
          if (r.listing_url && !rawByUrl.has(r.listing_url)) {
            rawByUrl.set(r.listing_url, { raw: r, category });
            newCount++;
          }
        }
        combo.listings_discovered += newCount;

        if (newCount === 0) {
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= 1) break; // no more pages for this combo
        } else {
          consecutiveEmptyPages = 0;
        }
      }
    }
  }

  // Map raw -> ScrapedListingP0 (index-phase fields only).
  const listings: ScrapedListingP0[] = [];
  for (const { raw, category } of rawByUrl.values()) {
    const sourceUrl = `https://www.mubawab.ma/fr/ct/immobilier-a-vendre`; // generic source_url (not city-specific)
    listings.push(mapRaw(raw, "mubawab", sourceUrl, category.transaction));
  }

  // Detail enrichment — capped by the same global budget, polite delay before each.
  let detailPagesOpened = 0;
  for (const listing of listings) {
    if (detailPagesOpened >= cfg.max_details) break;
    const url = listing.listing_url;
    await d.sleep(cfg.delay_min_ms, cfg.delay_max_ms);

    try {
      const allowed = await d.isAllowedByRobots(url);
      if (!allowed) {
        errors.push({
          source: "mubawab",
          stage: "detail_robots",
          url,
          message: "Detail page disallowed by robots.txt — skipped",
          at: new Date().toISOString(),
        });
        continue;
      }
      const res = await d.fetchDetailPage(url);
      detailPagesOpened++;
      const detail = extractDetail(res.html);
      mergeDetail(listing, detail);
    } catch (e) {
      detailPagesOpened++;
      errors.push({
        source: "mubawab",
        stage: "detail",
        url,
        message: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
    }
  }

  logger.info(
    `mubawab-expansion: ${combos.filter((c) => c.status === "ok").length}/${combos.length} combo(s) ok, ` +
      `${listPagesOpened} list page(s), ${detailPagesOpened} detail page(s), ${listings.length} listing(s)`
  );

  return { listings, errors, combos, list_pages_opened: listPagesOpened, detail_pages_opened: detailPagesOpened };
}
