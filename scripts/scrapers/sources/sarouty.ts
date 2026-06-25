// Sarouty.ma — public real-estate listings (sale).
// React/Next-style site: JSON-LD ItemList + __NEXT_DATA__, DOM cards fallback.
// No login, no API, no phone/email.

import type { SourceResult } from "../types";
import { runHtmlSource } from "./_shared";

export const saroutyStatus = "public_html_test";

export function runSarouty(): Promise<SourceResult> {
  return runHtmlSource({
    name: "sarouty",
    sourceUrl: "https://www.sarouty.ma/fr/%C3%A0-vendre/immobilier/maroc/",
    host: "sarouty.ma",
    cardSelectors: [
      'article[class*="card"]',
      'li[class*="Listing"]',
      '[class*="card-list"] a[href]',
      'a[href*="/fr/property/"]',
    ],
    max: 30,
    defaultTransaction: "sale",
  });
}
