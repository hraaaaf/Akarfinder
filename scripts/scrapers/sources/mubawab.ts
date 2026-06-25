// Mubawab.ma — public real-estate listings (sale).
//
// Two phases, both in safe mode:
//   1. Index page -> up to 30 listings (title, url, type, images_count).
//   2. For each listing, open its PUBLIC detail page and enrich:
//      price, city, district (quartier), surface, rooms, bedrooms, bathrooms,
//      short description, seller/agency (only if public).
//
// Safe mode: max 30 listings, 5–10s delay before each detail request, robots.txt
// respected, no login, no captcha, no phone/email. Detail failures are logged
// per listing and never crash the run.

import type { ScrapeError, ScrapedListingP0, SourceResult } from "../types";
import { fetchHtml, isAllowedByRobots } from "../utils/fetch-html";
import { extractDetail } from "../utils/extract";
import { safeDelay } from "../utils/safe-delay";
import { logger } from "../utils/logger";
import { mergeDetail, runHtmlSource } from "./_shared";

export const mubawabStatus = "public_html_test";

const MAX_LISTINGS = 30;

export async function runMubawab(): Promise<SourceResult> {
  const base = await runHtmlSource({
    name: "mubawab",
    sourceUrl: "https://www.mubawab.ma/fr/cc/immobilier-a-vendre",
    host: "mubawab.ma",
    cardSelectors: [
      "li.listingBox",
      ".listingBox",
      "article.listingBox",
      ".adListing",
      'a[href*="/fr/a/"]',
    ],
    max: MAX_LISTINGS,
    defaultTransaction: "sale",
  });

  const errors: ScrapeError[] = [...base.errors];
  const listings: ScrapedListingP0[] = base.listings;

  // How many detail pages to open (default = all, capped at 30).
  const envLimit = Number(process.env.P0_DETAIL_LIMIT);
  const detailLimit = Math.min(
    MAX_LISTINGS,
    Number.isFinite(envLimit) && envLimit > 0 ? envLimit : MAX_LISTINGS,
    listings.length
  );

  logger.info(`mubawab: enriching ${detailLimit}/${listings.length} listing(s) from detail pages…`);

  for (let i = 0; i < detailLimit; i += 1) {
    const listing = listings[i];
    const url = listing.listing_url;

    // Polite, non-aggressive pacing before every detail request.
    await safeDelay(5000, 10000);

    try {
      const allowed = await isAllowedByRobots(url);
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

      const res = await fetchHtml(url);
      const detail = extractDetail(res.html);
      mergeDetail(listing, detail);
    } catch (e) {
      errors.push({
        source: "mubawab",
        stage: "detail",
        url,
        message: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
    }
  }

  return { source: "mubawab", listings, errors, status: "ok" };
}
