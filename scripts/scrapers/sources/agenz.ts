// Agenz — intentionally NOT scraped automatically.
//
// Agenz is treated as a partnership / data-import source only. Per the P0
// mission, this file is a placeholder that documents the chosen status and
// returns no listings. Any future Agenz data must come from an authorized
// partnership feed or a CSV import, not from automated scraping.

import type { SourceResult } from "../types";

export const AGENZ_STATUS = "partnership_or_csv_import_only";

export function runAgenz(): Promise<SourceResult> {
  const at = new Date().toISOString();
  return Promise.resolve({
    source: "agenz",
    listings: [],
    errors: [
      {
        source: "agenz",
        stage: "policy",
        message:
          "Agenz is not scraped automatically. Status: partnership_or_csv_import_only.",
        at,
      },
    ],
    skipped: true,
    status: AGENZ_STATUS,
  });
}
