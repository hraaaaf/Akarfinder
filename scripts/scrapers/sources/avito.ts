// Avito.ma — public real-estate listings (sale).
// Avito is a Next.js app: the most robust signal is __NEXT_DATA__, with JSON-LD
// and DOM anchors as fallbacks. No login, no API, no phone/email.

import type { SourceResult } from "../types";
import { runHtmlSource } from "./_shared";

export const avitoStatus = "public_html_test";

export function runAvito(): Promise<SourceResult> {
  return runHtmlSource({
    name: "avito",
    // "immobilier à vendre" category (percent-encoded accent).
    sourceUrl: "https://www.avito.ma/fr/maroc/immobilier-%C3%A0_vendre",
    host: "avito.ma",
    cardSelectors: [
      'a[href*=".htm"]',
      'a[href*="/fr/"][href*="immobilier"]',
      '[class*="listing"] a[href]',
    ],
    max: 30,
    defaultTransaction: "sale",
  });
}
