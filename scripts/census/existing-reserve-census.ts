import { buildDomainCensus, type DomainCensusCandidate } from "./domain-census";
import {
  adaptB3UnregisteredReserveRows,
  classifyReserveDomainForReview,
  type B3UnregisteredReserveRow,
  type CensusReviewPriority,
  type ReserveDomainReviewSignal,
} from "./existing-reserve-adapter";

export type ExistingReserveCensusCandidate = DomainCensusCandidate & {
  reviewPriority: CensusReviewPriority;
  reviewReasons: string[];
};

export type ExistingReservePriorityStat = {
  priority: CensusReviewPriority;
  domains: number;
  observedUrls: number;
};

export type ExistingReserveCensusReport = {
  schemaVersion: "data-1-existing-reserve-census-v1";
  generatedAt: string;
  sourceDecision: "reserve_unregistered_source";
  rows: number;
  domains: number;
  priorityStats: ExistingReservePriorityStat[];
  candidates: ExistingReserveCensusCandidate[];
};

const PRIORITY_ORDER: Record<CensusReviewPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  NOISE: 3,
};

function enrichCandidate(
  candidate: DomainCensusCandidate,
  signal: ReserveDomainReviewSignal,
): ExistingReserveCensusCandidate {
  return {
    ...candidate,
    reviewPriority: signal.priority,
    reviewReasons: signal.reasons,
  };
}

export function buildExistingReserveCensusReport(
  rows: B3UnregisteredReserveRow[],
  generatedAt: string,
): ExistingReserveCensusReport {
  const observations = adaptB3UnregisteredReserveRows(rows);
  const domainCensus = buildDomainCensus(observations, generatedAt);

  const candidates = domainCensus.candidates
    .map((candidate) => enrichCandidate(candidate, classifyReserveDomainForReview(candidate.domain)))
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.reviewPriority] - PRIORITY_ORDER[b.reviewPriority] ||
        b.observedUrlCount - a.observedUrlCount ||
        a.domain.localeCompare(b.domain),
    );

  const priorities: CensusReviewPriority[] = ["HIGH", "MEDIUM", "LOW", "NOISE"];
  const priorityStats = priorities.map((priority) => {
    const matching = candidates.filter((candidate) => candidate.reviewPriority === priority);
    return {
      priority,
      domains: matching.length,
      observedUrls: matching.reduce((sum, candidate) => sum + candidate.observedUrlCount, 0),
    };
  });

  return {
    schemaVersion: "data-1-existing-reserve-census-v1",
    generatedAt: domainCensus.generatedAt,
    sourceDecision: "reserve_unregistered_source",
    rows: rows.length,
    domains: candidates.length,
    priorityStats,
    candidates,
  };
}

export function renderExistingReserveCensusMarkdown(
  report: ExistingReserveCensusReport,
  top = 100,
): string {
  if (!Number.isInteger(top) || top < 1) throw new Error("top must be a positive integer");

  const lines = [
    "# DATA-1.2 — Existing Reserve Census",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report is a **review queue**, not a source authorization list. Discovery priority never grants ingestion or publication rights.",
    "",
    "## Summary",
    "",
    `- reserve rows: **${report.rows.toLocaleString("en-US")}**`,
    `- distinct domains: **${report.domains.toLocaleString("en-US")}**`,
    "",
    "| Priority | Domains | Observed URLs |",
    "|---|---:|---:|",
    ...report.priorityStats.map(
      (stat) =>
        `| ${stat.priority} | ${stat.domains.toLocaleString("en-US")} | ${stat.observedUrls.toLocaleString("en-US")} |`,
    ),
    "",
    `## Top ${Math.min(top, report.candidates.length)} review candidates`,
    "",
    "| # | Domain | Priority | URLs | Providers | Evidence |",
    "|---:|---|---|---:|---|---|",
    ...report.candidates.slice(0, top).map((candidate, index) => {
      const providers = candidate.providers.map((provider) => provider.provider).join(", ");
      return `| ${index + 1} | ${candidate.domain} | ${candidate.reviewPriority} | ${candidate.observedUrlCount} | ${providers || "—"} | ${candidate.reviewReasons.join(", ")} |`;
    }),
    "",
    "## Gate",
    "",
    "Every non-noise candidate remains `UNREVIEWED` / `UNREGISTERED` until robots, noindex, terms/licence and Source Registry policy are explicitly audited.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}
