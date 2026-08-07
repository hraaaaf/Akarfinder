import type { CommonCrawlUrlIndexReport } from "./commoncrawl-url-index";

export function renderCommonCrawlUrlIndexMarkdown(
  report: CommonCrawlUrlIndexReport,
  top = 100,
): string {
  if (!Number.isInteger(top) || top < 1 || top > 1000) {
    throw new Error("top must be an integer between 1 and 1000");
  }

  const shown = report.candidates.slice(0, top);
  const lines = [
    "# DATA-1.3 — Common Crawl URL Index Discovery",
    "",
    `Generated: ${report.generatedAt}`,
    `Crawl: ${report.crawl}`,
    "",
    "> Discovery-only report. A Common Crawl URL Index hit is not authorization, ingestion eligibility, freshness proof, or publication eligibility.",
    "",
    "## Summary",
    "",
    `- aggregate rows: **${report.rows.toLocaleString("en-US")}**`,
    `- distinct hosts: **${report.domains.toLocaleString("en-US")}**`,
    `- already known to Census: **${report.knownDomains.toLocaleString("en-US")}**`,
    `- new to Census: **${report.newDomains.toLocaleString("en-US")}**`,
    "",
    `## Top ${shown.length} candidates`,
    "",
    "| # | Host | Lane | Census | Signal pages | Indexed pages | Latest index fetch |",
    "|---:|---|---|---|---:|---:|---|",
    ...shown.map(
      (candidate, index) =>
        `| ${index + 1} | ${candidate.domain} | ${candidate.lane} | ${candidate.censusState} | ${candidate.realEstateSignalPages.toLocaleString("en-US")} | ${candidate.indexedPages.toLocaleString("en-US")} | ${candidate.latestFetchAt ?? "—"} |`,
    ),
    "",
    "## Gate",
    "",
    "Every `NEW_TO_CENSUS` host remains `UNREVIEWED` with `effectivePolicy = null`. DATA-1.5/1.6 must audit capability, robots/noindex, terms/licence and Source Registry policy before any acquisition decision.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}
